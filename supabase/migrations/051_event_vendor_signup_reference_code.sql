-- ============================================================
-- 051 — Vendor signup reference code
-- ============================================================
-- Adds a short, human-readable reference code (e.g. VND-A1B2C3)
-- to every vendor signup so the KIGH treasurer can match
-- inbound CashApp / Venmo / PayPal payments to the originating
-- signup with zero ambiguity.
--
-- Vendors see the code on the post-signup success screen and
-- are instructed to put it (plus the business name) in the
-- payment note. The admin Vendors page filters by code so a
-- search across hundreds of signups becomes a single keystroke.
--
-- Idempotent: ALTER ... IF NOT EXISTS, DROP/CREATE function and
-- trigger.
-- ============================================================

-- ─── helper: generate VND-<6 base32 chars> ────────────────────
-- Base32-like alphabet excludes look-alike characters (0/O, 1/I)
-- so codes pasted by hand remain unambiguous on receipts.
create or replace function public.kigh_generate_vendor_reference_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  code := '';
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'VND-' || code;
end;
$$;

revoke all on function public.kigh_generate_vendor_reference_code() from public;

-- ─── column + uniqueness + backfill ──────────────────────────
alter table public.event_vendor_signups
  add column if not exists reference_code text;

-- Backfill any pre-existing rows so the uniqueness check below
-- doesn't trip. Each row gets its own code; tight loop is fine
-- because Phase 1 has zero rows on most environments.
do $$
declare
  r record;
  new_code text;
begin
  for r in
    select id from public.event_vendor_signups where reference_code is null
  loop
    -- Retry up to 5 times on the astronomically unlikely
    -- collision; the 32^6 = ~1B namespace makes one collision
    -- across hundreds of signups extremely improbable.
    for i in 1..5 loop
      new_code := public.kigh_generate_vendor_reference_code();
      begin
        update public.event_vendor_signups
        set reference_code = new_code
        where id = r.id;
        exit;
      exception when unique_violation then
        -- try again
      end;
    end loop;
  end loop;
end;
$$;

alter table public.event_vendor_signups
  alter column reference_code set not null;

create unique index if not exists event_vendor_signups_reference_code_unique
  on public.event_vendor_signups (reference_code);

comment on column public.event_vendor_signups.reference_code is
  'Human-readable code (e.g. VND-A1B2C3) shown to the vendor and used by the treasurer to match payments to signups.';

-- ─── BEFORE INSERT trigger: auto-populate when missing ───────
create or replace function public.kigh_set_vendor_reference_code()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  attempt int := 0;
  candidate text;
begin
  if new.reference_code is not null and new.reference_code <> '' then
    return new;
  end if;
  -- Loop a few times to absorb the rare collision; on persistent
  -- failure we let unique_violation propagate so the RPC's
  -- transaction rolls back cleanly.
  while attempt < 8 loop
    candidate := public.kigh_generate_vendor_reference_code();
    if not exists (
      select 1 from public.event_vendor_signups where reference_code = candidate
    ) then
      new.reference_code := candidate;
      return new;
    end if;
    attempt := attempt + 1;
  end loop;
  -- Final attempt; if this collides the insert errors out and the
  -- vendor sees a friendly "please retry" via the RPC wrapper.
  new.reference_code := public.kigh_generate_vendor_reference_code();
  return new;
end;
$$;

drop trigger if exists event_vendor_signups_reference_code on public.event_vendor_signups;
create trigger event_vendor_signups_reference_code
  before insert on public.event_vendor_signups
  for each row execute function public.kigh_set_vendor_reference_code();

-- ─── RPC: include reference_code in the returned row ─────────
-- Drop the prior definition before changing the return shape;
-- Postgres requires this when the OUT columns change.
drop function if exists public.create_event_vendor_signup(uuid, text, text, text, text, text, text);

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
  vendor_category text,
  reference_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
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
  returning id, reference_code into v_id, v_code;

  return query select v_id, v_fee_cents, v_category, v_code;
exception
  when unique_violation then
    raise exception 'duplicate_signup' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_event_vendor_signup(uuid, text, text, text, text, text, text) from public;
grant execute on function public.create_event_vendor_signup(uuid, text, text, text, text, text, text) to anon, authenticated;

comment on function public.create_event_vendor_signup is
  'Creates a vendor signup for a published event with vendor_signup_enabled. Returns signup id, computed fee_amount_cents (event-specific food/other), category, and the human-readable reference_code the vendor includes in their payment note. Friendly errors: business_name_required, contact_name_required, invalid_email, invalid_phone, invalid_category, invalid_description, invalid_business_name, vendor_signup_not_enabled, vendor_signup_closed, duplicate_signup.';
