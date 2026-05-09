-- ============================================================
-- 028 — Bridge auth.users signups to public.members (trigger + RPC)
-- ============================================================
-- Problem: Email/password signups often have no session until the user
-- confirms email, so the membership form returned early and never called
-- submit_membership_registration. Auth users existed without members rows.
--
-- Fix
--   1. SECURITY DEFINER core: kigh_sync_member_record_for_auth_user(uuid)
--      - Match legacy row: lower(trim(email)), user_id IS NULL → claim
--      - Else insert minimal row (pending consent — admin-visible)
--      - Ignores user-supplied role in metadata (members table has no role)
--   2. AFTER INSERT (and UPDATE email confirmation) on auth.users triggers
--   3. RPC claim_or_create_member_for_auth_user() for post-login/callback sync
--   4. Idempotent backfill for existing auth users missing a linked member row
--
-- Tables touched: public.members; optional column auth_email_confirmed_at;
--                 auth trigger targets auth.users
-- ============================================================

alter table public.members
  add column if not exists auth_email_confirmed_at timestamptz;

comment on column public.members.auth_email_confirmed_at is
  'Mirrors auth.users.email_confirmed_at when available; for admin visibility of verification state.';

-- ─── Core sync (internal; not granted to API roles) ─────────
create or replace function public.kigh_sync_member_record_for_auth_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_meta jsonb;
  v_confirmed_at timestamptz;
  v_first text;
  v_last text;
  v_full text;
  v_phone text;
  v_type text;
  v_interests text[];
  v_legacy_id uuid;
  v_existing_id uuid;
  v_conflict boolean;
  v_id uuid;
  v_trimmed text;
  v_rest text;
begin
  if p_user_id is null then
    return null;
  end if;

  select
    lower(trim(u.email)),
    coalesce(u.raw_user_meta_data, '{}'::jsonb),
    u.email_confirmed_at
  into v_email, v_meta, v_confirmed_at
  from auth.users u
  where u.id = p_user_id;

  if v_email is null or v_email = '' then
    return null;
  end if;

  v_first := nullif(trim(v_meta->>'first_name'), '');
  v_last := nullif(trim(v_meta->>'last_name'), '');
  v_full := coalesce(nullif(trim(v_meta->>'full_name'), ''), nullif(trim(v_meta->>'name'), ''));

  if v_first is null and v_last is null and v_full is not null and length(trim(v_full)) > 0 then
    v_trimmed := trim(v_full);
    v_first := split_part(v_trimmed, ' ', 1);
    v_rest := nullif(trim(substring(v_trimmed from length(v_first) + 2)), '');
    v_last := coalesce(v_rest, v_first);
  end if;

  if v_first is null or v_first = '' then
    v_first := 'Member';
  end if;
  if v_last is null or v_last = '' then
    v_last := 'Pending';
  end if;

  v_phone := nullif(trim(v_meta->>'phone'), '');

  v_type := lower(trim(coalesce(v_meta->>'membership_type', '')));
  if v_type not in ('individual', 'family_household', 'associate') then
    v_type := 'individual';
  end if;

  v_interests := '{}'::text[];
  if jsonb_typeof(v_meta->'interests') = 'array' then
    select coalesce(
      array_agg(trim(elem)) filter (where trim(elem) <> ''),
      '{}'::text[]
    )
    into v_interests
    from jsonb_array_elements_text(coalesce(v_meta->'interests', '[]'::jsonb)) as t(elem);
  elsif v_meta ? 'interests' and jsonb_typeof(v_meta->'interests') = 'string' then
    select coalesce(
      array_agg(trim(elem)) filter (where trim(elem) <> ''),
      '{}'::text[]
    )
    into v_interests
    from unnest(string_to_array(v_meta->>'interests', ',')) as u(elem);
  end if;

  -- Ignore escalation payloads in metadata (role / admin keywords).
  -- members row stores no auth role; profiles.role is guarded separately.

  select m.id into v_existing_id
  from public.members m
  where m.user_id = p_user_id
  limit 1;

  if v_existing_id is not null then
    update public.members m
       set auth_email_confirmed_at = coalesce(v_confirmed_at, m.auth_email_confirmed_at),
           updated_at = now()
     where m.id = v_existing_id;
    return v_existing_id;
  end if;

  select m.id into v_legacy_id
  from public.members m
   where lower(trim(m.email)) = v_email
     and m.user_id is null
   limit 1;

  if v_legacy_id is not null then
    update public.members
       set user_id = p_user_id,
           first_name = v_first,
           last_name = v_last,
           email = v_email,
           phone = coalesce(v_phone, phone),
           membership_type = v_type,
           interests = case when array_length(v_interests, 1) is null or array_length(v_interests, 1) = 0
                            then interests else v_interests end,
           auth_email_confirmed_at = v_confirmed_at,
           updated_at = now()
     where id = v_legacy_id;
    return v_legacy_id;
  end if;

  select true
    into v_conflict
   where exists (
     select 1
       from public.members m
      where lower(trim(m.email)) = v_email
        and m.user_id is not null
        and m.user_id <> p_user_id
   );

  if v_conflict then
    -- Rare: orphaned data; do not block auth signup.
    raise warning 'kigh_sync_member_record_for_auth_user: email % already linked to another user', v_email;
    return null;
  end if;

  insert into public.members (
    user_id,
    first_name,
    last_name,
    email,
    phone,
    membership_type,
    interests,
    agreed_to_constitution,
    consent_to_communications,
    dues_status,
    membership_status,
    auth_email_confirmed_at
  ) values (
    p_user_id,
    v_first,
    v_last,
    v_email,
    v_phone,
    v_type,
    coalesce(v_interests, '{}'::text[]),
    false,
    false,
    'pending',
    'pending',
    v_confirmed_at
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.kigh_sync_member_record_for_auth_user(uuid) from public;

-- ─── Auth hooks ─────────────────────────────────────────────
create or replace function public.kigh_on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.kigh_sync_member_record_for_auth_user(new.id);
  return new;
end;
$$;

revoke all on function public.kigh_on_auth_user_created() from public;

create or replace function public.kigh_on_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at
     or lower(trim(coalesce(new.email, ''))) is distinct from lower(trim(coalesce(old.email, '')))
     or new.raw_user_meta_data is distinct from old.raw_user_meta_data then
    perform public.kigh_sync_member_record_for_auth_user(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.kigh_on_auth_user_updated() from public;

drop trigger if exists kigh_on_auth_user_created on auth.users;
create trigger kigh_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.kigh_on_auth_user_created();

drop trigger if exists kigh_on_auth_user_updated on auth.users;
create trigger kigh_on_auth_user_updated
  after update on auth.users
  for each row
  execute function public.kigh_on_auth_user_updated();

-- ─── Callable RPC (post-login / callback / manual sync) ───────
create or replace function public.claim_or_create_member_for_auth_user()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;
  return public.kigh_sync_member_record_for_auth_user(v_uid);
end;
$$;

revoke all on function public.claim_or_create_member_for_auth_user() from public;
grant execute on function public.claim_or_create_member_for_auth_user() to authenticated;

comment on function public.claim_or_create_member_for_auth_user() is
  'Idempotent: ensures public.members has a row for the current auth user (claim legacy by email or insert minimal pending row).';

-- ─── Idempotent backfill (existing deployments) ─────────────
do $$
declare
  r record;
begin
  for r in
    select u.id
    from auth.users u
    where not exists (
      select 1 from public.members m where m.user_id = u.id
    )
    order by u.created_at asc nulls last
  loop
    perform public.kigh_sync_member_record_for_auth_user(r.id);
  end loop;
end $$;

-- Verification (run manually after deploy):
--   select u.id, u.email, u.email_confirmed_at, m.id as member_id, m.membership_status
--   from auth.users u
--   left join public.members m on m.user_id = u.id
--   where m.id is null;
