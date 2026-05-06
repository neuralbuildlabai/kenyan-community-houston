-- ============================================================
-- 025 — Membership registration requires Supabase Auth
-- ============================================================
-- Goals
--   1. `submit_membership_registration` is no longer callable by anon:
--      only authenticated callers; rows are always tied to auth.uid().
--   2. Enforce email in the payload matches the signed-in auth user.
--   3. Harden FK + uniqueness on members.user_id for self-service rows.
--   4. Block new inserts with null user_id unless an elevated admin
--      inserts (offline / legacy onboarding); see trigger below.
--
-- Legacy data
--   Rows in public.members with user_id IS NULL may still exist from
--   the pre-025 anonymous RPC. Do NOT add NOT NULL on members.user_id
--   until those rows are backfilled or archived. After repair:
--     update members set user_id = '<auth uuid>' where id = '...';
--   or link via public.kigh_link_member_to_user(...) from an admin.
--
-- Manual Supabase steps (production)
--   - Apply this migration.
--   - Audit: select id, email, submitted_at from public.members where user_id is null;
--   - For each legacy applicant who should self-serve, create Auth user
--     (dashboard or invite) then kigh_link_member_to_user(member_id, uid).
-- ============================================================

-- ─── 1. members.user_id FK: cascade when auth user deleted ──
alter table public.members drop constraint if exists members_user_id_fkey;
alter table public.members
  add constraint members_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- ─── 2. At most one membership row per auth user (self-service) ─
drop index if exists public.members_user_id_unique_idx;
create unique index if not exists members_user_id_unique_idx
  on public.members (user_id)
  where user_id is not null;

-- ─── 3. Trigger: non-admins cannot insert members without user_id ─
create or replace function public.kigh_members_user_id_insert_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is null and not public.kigh_is_elevated_admin() then
    raise exception 'members_user_id_required'
      using hint = 'Membership applications must be submitted while signed in, or created by an elevated admin.';
  end if;
  return new;
end;
$$;

revoke all on function public.kigh_members_user_id_insert_guard() from public;

drop trigger if exists members_user_id_insert_guard on public.members;
create trigger members_user_id_insert_guard
  before insert on public.members
  for each row execute function public.kigh_members_user_id_insert_guard();

comment on function public.kigh_members_user_id_insert_guard() is
  'Requires user_id on new members rows unless kigh_is_elevated_admin() is true (offline admin onboarding).';

-- ─── 4. Replace membership RPC (authenticated only) ───────────
create or replace function public.submit_membership_registration(p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_first text;
  v_last text;
  v_email text;
  v_auth_email text;
  v_type text;
  v_agreed boolean;
  v_consent boolean;
  v_h record;
begin
  if v_uid is null then
    raise exception 'authentication_required'
      using hint = 'Create your account password on the membership form, then submit while signed in.';
  end if;

  v_first := trim(p_data->>'first_name');
  v_last := trim(p_data->>'last_name');
  v_email := lower(trim(p_data->>'email'));
  v_type := p_data->>'membership_type';
  v_agreed := coalesce((p_data->>'agreed_to_constitution')::boolean, false);
  v_consent := coalesce((p_data->>'consent_to_communications')::boolean, false);

  if v_first is null or v_first = '' or v_last is null or v_last = '' or v_email is null or v_email = '' then
    raise exception 'missing_required_fields';
  end if;

  if v_type is null or v_type not in ('individual', 'family_household', 'associate') then
    raise exception 'invalid_membership_type';
  end if;

  if not v_agreed or not v_consent then
    raise exception 'consent_required';
  end if;

  select lower(trim(u.email)) into v_auth_email from auth.users u where u.id = v_uid;
  if v_auth_email is null or v_auth_email <> v_email then
    raise exception 'email_mismatch_with_signed_in_user'
      using hint = 'Use the same email address as your account.';
  end if;

  if exists (select 1 from public.members m where m.user_id = v_uid) then
    raise exception 'membership_already_registered'
      using hint = 'You already have a membership record. Contact support if you need changes.';
  end if;

  insert into members (
    user_id,
    first_name, last_name, email, phone, address_line1, city, state, zip_code,
    kenyan_county_or_heritage, preferred_communication, membership_type, interests,
    agreed_to_constitution, consent_to_communications
  ) values (
    v_uid,
    v_first,
    v_last,
    v_email,
    nullif(trim(p_data->>'phone'), ''),
    nullif(trim(p_data->>'address_line1'), ''),
    nullif(trim(p_data->>'city'), ''),
    nullif(trim(p_data->>'state'), ''),
    nullif(trim(p_data->>'zip_code'), ''),
    nullif(trim(p_data->>'kenyan_county_or_heritage'), ''),
    nullif(trim(p_data->>'preferred_communication'), ''),
    v_type,
    coalesce(
      (
        select array_agg(trim(elem)) filter (where trim(elem) <> '')
        from jsonb_array_elements_text(coalesce(p_data->'interests', '[]'::jsonb)) as t(elem)
      ),
      '{}'::text[]
    ),
    v_agreed,
    v_consent
  )
  returning id into v_id;

  if v_type = 'family_household' and jsonb_typeof(p_data->'household') = 'array' then
    for v_h in
      select elem from lateral jsonb_array_elements(coalesce(p_data->'household', '[]'::jsonb)) as t(elem)
    loop
      if nullif(trim(v_h.elem->>'full_name'), '') is not null then
        insert into household_members (member_id, full_name, relationship, age_group, email, phone)
        values (
          v_id,
          trim(v_h.elem->>'full_name'),
          nullif(trim(v_h.elem->>'relationship'), ''),
          case when v_h.elem->>'age_group' in ('adult', 'youth', 'child') then v_h.elem->>'age_group' else null end,
          nullif(trim(v_h.elem->>'email'), ''),
          nullif(trim(v_h.elem->>'phone'), '')
        );
      end if;
    end loop;
  end if;

  return v_id;
end;
$$;

revoke all on function public.submit_membership_registration(jsonb) from public;
revoke all on function public.submit_membership_registration(jsonb) from anon;
grant execute on function public.submit_membership_registration(jsonb) to authenticated;

comment on function public.submit_membership_registration(jsonb) is
  'Authenticated-only membership intake; sets members.user_id = auth.uid() and verifies email matches auth.users.';
