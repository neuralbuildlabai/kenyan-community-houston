-- ============================================================
-- 050 — Event vendor signups
-- ============================================================
-- Adds event-level vendor settings, a private vendor signups
-- table, RLS, a public SECURITY DEFINER RPC for signups, and a
-- safe public aggregate count for event pages.
--
-- Vendor fees are configured per-event (food vs. other) so each
-- event can run different pricing. Defaults match the current
-- community standard: $100 food / $50 other (stored in cents).
-- Payment is collected out-of-band; admin tooling (Phase 2)
-- toggles `payment_status` once funds arrive.
--
-- Mirrors the architecture of migration 034 (volunteer signups)
-- so admins reason about the two flows the same way.
-- Idempotent where practical.
-- ============================================================

-- ─── events: vendor signup settings ──────────────────────────
alter table public.events
  add column if not exists vendor_signup_enabled boolean not null default false;
alter table public.events
  add column if not exists vendor_signup_closes_at timestamptz;
alter table public.events
  add column if not exists vendor_signup_instructions text;
alter table public.events
  add column if not exists vendor_food_fee_cents integer not null default 10000;
alter table public.events
  add column if not exists vendor_other_fee_cents integer not null default 5000;
alter table public.events
  add column if not exists vendor_slots_total integer;

alter table public.events
  drop constraint if exists events_vendor_signup_instructions_len;
alter table public.events
  add constraint events_vendor_signup_instructions_len
  check (
    vendor_signup_instructions is null
    or char_length(vendor_signup_instructions) <= 1000
  );

alter table public.events
  drop constraint if exists events_vendor_food_fee_cents_nonneg;
alter table public.events
  add constraint events_vendor_food_fee_cents_nonneg
  check (vendor_food_fee_cents >= 0 and vendor_food_fee_cents <= 1000000);

alter table public.events
  drop constraint if exists events_vendor_other_fee_cents_nonneg;
alter table public.events
  add constraint events_vendor_other_fee_cents_nonneg
  check (vendor_other_fee_cents >= 0 and vendor_other_fee_cents <= 1000000);

alter table public.events
  drop constraint if exists events_vendor_slots_total_chk;
alter table public.events
  add constraint events_vendor_slots_total_chk
  check (vendor_slots_total is null or vendor_slots_total >= 1);

comment on column public.events.vendor_signup_enabled is
  'When true, public vendor signup is allowed for this event (subject to closes_at and publish status).';
comment on column public.events.vendor_food_fee_cents is
  'Per-event food vendor fee in cents. Default 10000 ($100).';
comment on column public.events.vendor_other_fee_cents is
  'Per-event non-food vendor fee in cents. Default 5000 ($50).';
comment on column public.events.vendor_slots_total is
  'Optional capacity cap. Phase 2 may enforce auto-close at signup time; currently informational.';

-- ─── event_vendor_signups ────────────────────────────────────
create table if not exists public.event_vendor_signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  vendor_category text not null,
  product_description text,
  fee_amount_cents integer not null,
  payment_status text not null default 'unpaid',
  status text not null default 'submitted',
  admin_notes text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_vendor_signups_business_name_len
    check (char_length(trim(business_name)) between 2 and 200),
  constraint event_vendor_signups_contact_name_len
    check (char_length(trim(contact_name)) between 2 and 120),
  constraint event_vendor_signups_email_fmt
    check (email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
  constraint event_vendor_signups_phone_intl
    check (phone ~ '^\+?[0-9]{7,15}$'),
  constraint event_vendor_signups_category_chk
    check (vendor_category in ('food', 'other')),
  constraint event_vendor_signups_product_len
    check (product_description is null or char_length(product_description) <= 500),
  constraint event_vendor_signups_fee_nonneg
    check (fee_amount_cents >= 0 and fee_amount_cents <= 1000000),
  constraint event_vendor_signups_payment_status_chk
    check (payment_status in ('unpaid', 'paid', 'waived', 'refunded')),
  constraint event_vendor_signups_status_chk
    check (status in ('submitted', 'confirmed', 'waitlisted', 'cancelled', 'declined')),
  constraint event_vendor_signups_admin_notes_len
    check (admin_notes is null or char_length(admin_notes) <= 1000)
);

-- Prevent the same business from signing up twice for the same
-- event. Phone is the primary anti-duplicate key (matches the
-- volunteer flow); email is also unique per event to catch the
-- common case where the same vendor uses a different phone.
create unique index if not exists event_vendor_signups_event_phone_unique
  on public.event_vendor_signups (event_id, phone);

create unique index if not exists event_vendor_signups_event_email_unique
  on public.event_vendor_signups (event_id, lower(email));

create index if not exists event_vendor_signups_event_id_idx
  on public.event_vendor_signups (event_id);
create index if not exists event_vendor_signups_user_id_idx
  on public.event_vendor_signups (user_id);
create index if not exists event_vendor_signups_status_idx
  on public.event_vendor_signups (status);
create index if not exists event_vendor_signups_payment_status_idx
  on public.event_vendor_signups (payment_status);
create index if not exists event_vendor_signups_submitted_at_idx
  on public.event_vendor_signups (submitted_at desc);

drop trigger if exists event_vendor_signups_updated_at on public.event_vendor_signups;
create trigger event_vendor_signups_updated_at
  before update on public.event_vendor_signups
  for each row execute function public.set_updated_at();

-- ─── RPC: public signup (SECURITY DEFINER) ───────────────────
create or replace function public.create_event_vendor_signup(
  p_event_id uuid,
  p_business_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_vendor_category text,
  p_product_description text default null
) returns table (
  signup_id uuid,
  fee_amount_cents integer,
  vendor_category text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_event record;
  v_business text := trim(coalesce(p_business_name, ''));
  v_contact text := trim(coalesce(p_contact_name, ''));
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := public.kigh_normalize_volunteer_phone(p_phone);
  v_category text := lower(trim(coalesce(p_vendor_category, '')));
  v_description text := nullif(trim(coalesce(p_product_description, '')), '');
  v_uid uuid := auth.uid();
  v_fee_cents integer;
begin
  if v_business is null or char_length(v_business) < 2 or char_length(v_business) > 200 then
    raise exception 'business_name_required' using errcode = 'P0001';
  end if;

  if v_contact is null or char_length(v_contact) < 2 or char_length(v_contact) > 120 then
    raise exception 'contact_name_required' using errcode = 'P0001';
  end if;

  if v_email is null or v_email !~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  if v_phone is null or v_phone = '' or v_phone !~ '^\+?[0-9]{7,15}$' then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;

  if v_category not in ('food', 'other') then
    raise exception 'invalid_category' using errcode = 'P0001';
  end if;

  if v_description is not null and char_length(v_description) > 500 then
    raise exception 'invalid_description' using errcode = 'P0001';
  end if;

  if v_description is not null and (
    public.kigh_contains_blocked_language(v_description)
    or public.kigh_contains_sensitive_public_sharing(v_description)
  ) then
    raise exception 'invalid_description' using errcode = 'P0001';
  end if;

  if v_business is not null and public.kigh_contains_blocked_language(v_business) then
    raise exception 'invalid_business_name' using errcode = 'P0001';
  end if;

  select
    e.id,
    e.status,
    e.vendor_signup_enabled,
    e.vendor_signup_closes_at,
    e.vendor_food_fee_cents,
    e.vendor_other_fee_cents
  into v_event
  from public.events e
  where e.id = p_event_id;

  if v_event.id is null then
    raise exception 'vendor_signup_not_enabled' using errcode = 'P0001';
  end if;

  if v_event.status is distinct from 'published' then
    raise exception 'vendor_signup_not_enabled' using errcode = 'P0001';
  end if;

  if not coalesce(v_event.vendor_signup_enabled, false) then
    raise exception 'vendor_signup_not_enabled' using errcode = 'P0001';
  end if;

  if v_event.vendor_signup_closes_at is not null
     and v_event.vendor_signup_closes_at <= now() then
    raise exception 'vendor_signup_closed' using errcode = 'P0001';
  end if;

  v_fee_cents := case
    when v_category = 'food' then coalesce(v_event.vendor_food_fee_cents, 10000)
    else coalesce(v_event.vendor_other_fee_cents, 5000)
  end;

  insert into public.event_vendor_signups (
    event_id,
    user_id,
    business_name,
    contact_name,
    email,
    phone,
    vendor_category,
    product_description,
    fee_amount_cents,
    payment_status,
    status
  ) values (
    p_event_id,
    v_uid,
    v_business,
    v_contact,
    v_email,
    v_phone,
    v_category,
    v_description,
    v_fee_cents,
    'unpaid',
    'submitted'
  )
  returning id into v_id;

  return query select v_id, v_fee_cents, v_category;
exception
  when unique_violation then
    raise exception 'duplicate_signup' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_event_vendor_signup(uuid, text, text, text, text, text, text) from public;
grant execute on function public.create_event_vendor_signup(uuid, text, text, text, text, text, text) to anon, authenticated;

comment on function public.create_event_vendor_signup is
  'Creates a vendor signup for a published event with vendor_signup_enabled. Returns the new signup id, computed fee_amount_cents (event-specific food/other), and category. Friendly errors: business_name_required, contact_name_required, invalid_email, invalid_phone, invalid_category, invalid_description, invalid_business_name, vendor_signup_not_enabled, vendor_signup_closed, duplicate_signup.';

-- ─── RPC: safe public aggregate count ────────────────────────
create or replace function public.public_event_vendor_signup_count(p_event_slug text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_n int;
begin
  select e.id into v_event_id
  from public.events e
  where e.slug = p_event_slug
    and e.status = 'published'
    and coalesce(e.vendor_signup_enabled, false)
  limit 1;

  if v_event_id is null then
    return 0;
  end if;

  select count(*)::int into v_n
  from public.event_vendor_signups s
  where s.event_id = v_event_id
    and s.status in ('submitted', 'confirmed', 'waitlisted');

  return coalesce(v_n, 0);
end;
$$;

revoke all on function public.public_event_vendor_signup_count(text) from public;
grant execute on function public.public_event_vendor_signup_count(text) to anon, authenticated;

-- ─── RLS: event_vendor_signups ───────────────────────────────
alter table public.event_vendor_signups enable row level security;

drop policy if exists "event_vendor_signups select own" on public.event_vendor_signups;
create policy "event_vendor_signups select own"
  on public.event_vendor_signups for select
  to authenticated
  using (
    user_id is not null
    and auth.uid() is not null
    and user_id = auth.uid()
  );

drop policy if exists "event_vendor_signups select admin" on public.event_vendor_signups;
create policy "event_vendor_signups select admin"
  on public.event_vendor_signups for select
  to authenticated
  using (public.kigh_is_elevated_admin());

-- No INSERT/UPDATE/DELETE policies for anon — signups go through
-- create_event_vendor_signup only.

drop policy if exists "event_vendor_signups update admin" on public.event_vendor_signups;
create policy "event_vendor_signups update admin"
  on public.event_vendor_signups for update
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

drop policy if exists "event_vendor_signups delete admin" on public.event_vendor_signups;
create policy "event_vendor_signups delete admin"
  on public.event_vendor_signups for delete
  to authenticated
  using (public.kigh_is_elevated_admin());

grant select, update, delete on public.event_vendor_signups to authenticated;
grant select, insert, update, delete on public.event_vendor_signups to service_role;
