-- ============================================================
-- 034 — Event volunteer signups (replaces Google Forms workflow)
-- ============================================================
-- Adds event-level volunteer settings, private signups table, RLS,
-- public RPC for signup, and safe aggregate count for public pages.
-- Idempotent where practical.
-- ============================================================

-- ─── events: volunteer signup settings ───────────────────────
alter table public.events add column if not exists volunteer_signup_enabled boolean not null default false;
alter table public.events add column if not exists volunteer_signup_slug text;
alter table public.events add column if not exists volunteer_signup_instructions text;
alter table public.events add column if not exists volunteer_slots_needed integer;
alter table public.events add column if not exists volunteer_signup_closes_at timestamptz;

alter table public.events drop constraint if exists events_volunteer_slots_needed_chk;
alter table public.events add constraint events_volunteer_slots_needed_chk
  check (volunteer_slots_needed is null or volunteer_slots_needed >= 1);

alter table public.events drop constraint if exists events_volunteer_signup_instructions_len;
alter table public.events add constraint events_volunteer_signup_instructions_len
  check (volunteer_signup_instructions is null or char_length(volunteer_signup_instructions) <= 500);

alter table public.events drop constraint if exists events_volunteer_signup_slug_format;
alter table public.events add constraint events_volunteer_signup_slug_format
  check (
    volunteer_signup_slug is null
    or volunteer_signup_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  );

drop index if exists events_volunteer_signup_slug_unique;
create unique index events_volunteer_signup_slug_unique
  on public.events (volunteer_signup_slug)
  where volunteer_signup_slug is not null;

comment on column public.events.volunteer_signup_enabled is 'When true, public volunteer signup is allowed for this event (subject to closes_at and publish status).';
comment on column public.events.volunteer_signup_slug is 'Optional stable token for share links; may mirror event slug when generated in admin UI.';

-- ─── event_volunteer_signups ─────────────────────────────────
create table if not exists public.event_volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  phone text not null,
  email text,
  availability_note text,
  volunteer_role text,
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_volunteer_signups_full_name_len check (char_length(trim(full_name)) between 2 and 120),
  constraint event_volunteer_signups_phone_intl check (phone ~ '^\+?[0-9]{7,15}$'),
  constraint event_volunteer_signups_email_fmt check (
    email is null
    or email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
  ),
  constraint event_volunteer_signups_availability_len check (
    availability_note is null or char_length(availability_note) <= 500
  ),
  constraint event_volunteer_signups_role_len check (
    volunteer_role is null or char_length(volunteer_role) <= 120
  ),
  constraint event_volunteer_signups_status_chk check (
    status in ('submitted', 'confirmed', 'waitlisted', 'cancelled', 'declined')
  )
);

create unique index if not exists event_volunteer_signups_event_phone_unique
  on public.event_volunteer_signups (event_id, phone);

create index if not exists event_volunteer_signups_event_id_idx on public.event_volunteer_signups (event_id);
create index if not exists event_volunteer_signups_user_id_idx on public.event_volunteer_signups (user_id);
create index if not exists event_volunteer_signups_status_idx on public.event_volunteer_signups (status);
create index if not exists event_volunteer_signups_submitted_at_idx on public.event_volunteer_signups (submitted_at desc);
create index if not exists event_volunteer_signups_phone_idx on public.event_volunteer_signups (phone);

drop trigger if exists event_volunteer_signups_updated_at on public.event_volunteer_signups;
create trigger event_volunteer_signups_updated_at
  before update on public.event_volunteer_signups
  for each row execute function public.set_updated_at();

-- ─── RPC: normalize volunteer phone (internal) ───────────────
create or replace function public.kigh_normalize_volunteer_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  t text := trim(coalesce(p_phone, ''));
  stripped text;
  digits text;
begin
  if t = '' then
    return '';
  end if;
  stripped := regexp_replace(t, '[\s().-]', '', 'g');
  if stripped ~ '^\+' then
    digits := regexp_replace(substring(stripped from 2), '[^0-9]', '', 'g');
    return '+' || digits;
  end if;
  digits := regexp_replace(stripped, '[^0-9]', '', 'g');
  return digits;
end;
$$;

revoke all on function public.kigh_normalize_volunteer_phone(text) from public;

-- ─── RPC: public signup (SECURITY DEFINER) ───────────────────
create or replace function public.create_event_volunteer_signup(
  p_event_id uuid,
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_volunteer_role text default null,
  p_availability_note text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_event record;
  v_name text := trim(coalesce(p_full_name, ''));
  v_phone text := public.kigh_normalize_volunteer_phone(p_phone);
  v_role text := nullif(trim(coalesce(p_volunteer_role, '')), '');
  v_note text := nullif(trim(coalesce(p_availability_note, '')), '');
  v_email text := nullif(trim(coalesce(p_email, '')), '');
  v_uid uuid := auth.uid();
begin
  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if v_phone is null or v_phone = '' or v_phone !~ '^\+?[0-9]{7,15}$' then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;

  if v_email is not null and v_email !~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;

  if v_role is not null and char_length(v_role) > 120 then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;

  if v_role is not null and public.kigh_contains_blocked_language(v_role) then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;

  if v_note is not null and (
    public.kigh_contains_blocked_language(v_note)
    or public.kigh_contains_sensitive_public_sharing(v_note)
  ) then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;

  select
    e.id,
    e.status,
    e.volunteer_signup_enabled,
    e.volunteer_signup_closes_at
  into v_event
  from public.events e
  where e.id = p_event_id;

  if v_event.id is null then
    raise exception 'volunteer_signup_not_enabled' using errcode = 'P0001';
  end if;

  if v_event.status is distinct from 'published' then
    raise exception 'volunteer_signup_not_enabled' using errcode = 'P0001';
  end if;

  if not coalesce(v_event.volunteer_signup_enabled, false) then
    raise exception 'volunteer_signup_not_enabled' using errcode = 'P0001';
  end if;

  if v_event.volunteer_signup_closes_at is not null
     and v_event.volunteer_signup_closes_at <= now() then
    raise exception 'volunteer_signup_closed' using errcode = 'P0001';
  end if;

  insert into public.event_volunteer_signups (
    event_id,
    user_id,
    full_name,
    phone,
    email,
    availability_note,
    volunteer_role,
    status
  ) values (
    p_event_id,
    v_uid,
    v_name,
    v_phone,
    v_email,
    v_note,
    v_role,
    'submitted'
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'duplicate_signup' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_event_volunteer_signup(uuid, text, text, text, text, text) from public;
grant execute on function public.create_event_volunteer_signup(uuid, text, text, text, text, text) to anon, authenticated;

comment on function public.create_event_volunteer_signup is
  'Creates a volunteer signup for a published event with volunteer_signup_enabled. Friendly errors: name_required, invalid_phone, invalid_note, volunteer_signup_not_enabled, volunteer_signup_closed, duplicate_signup.';

-- ─── RPC: safe public aggregate count ────────────────────────
create or replace function public.public_event_volunteer_signup_count(p_event_slug text)
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
    and coalesce(e.volunteer_signup_enabled, false)
  limit 1;

  if v_event_id is null then
    return 0;
  end if;

  select count(*)::int into v_n
  from public.event_volunteer_signups s
  where s.event_id = v_event_id
    and s.status in ('submitted', 'confirmed', 'waitlisted');

  return coalesce(v_n, 0);
end;
$$;

revoke all on function public.public_event_volunteer_signup_count(text) from public;
grant execute on function public.public_event_volunteer_signup_count(text) to anon, authenticated;

-- ─── RLS: event_volunteer_signups ────────────────────────────
alter table public.event_volunteer_signups enable row level security;

drop policy if exists "event_volunteer_signups select own" on public.event_volunteer_signups;
create policy "event_volunteer_signups select own"
  on public.event_volunteer_signups for select
  to authenticated
  using (
    user_id is not null
    and auth.uid() is not null
    and user_id = auth.uid()
  );

drop policy if exists "event_volunteer_signups select admin" on public.event_volunteer_signups;
create policy "event_volunteer_signups select admin"
  on public.event_volunteer_signups for select
  to authenticated
  using (public.kigh_is_elevated_admin());

-- No INSERT/UPDATE/DELETE policies for anon — signups go through create_event_volunteer_signup only.

drop policy if exists "event_volunteer_signups update admin" on public.event_volunteer_signups;
create policy "event_volunteer_signups update admin"
  on public.event_volunteer_signups for update
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

drop policy if exists "event_volunteer_signups delete admin" on public.event_volunteer_signups;
create policy "event_volunteer_signups delete admin"
  on public.event_volunteer_signups for delete
  to authenticated
  using (public.kigh_is_elevated_admin());

grant select, update, delete on public.event_volunteer_signups to authenticated;
grant select, insert, update, delete on public.event_volunteer_signups to service_role;
