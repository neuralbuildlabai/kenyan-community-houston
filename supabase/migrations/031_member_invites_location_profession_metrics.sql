-- ============================================================
-- 031 — WhatsApp invite tracking, Houston-area location,
--       professional field metrics, admin demographics RPC
-- ============================================================

-- ─── Validation helpers (single source of truth for allowed values) ───
create or replace function public.kigh_is_valid_general_location_area(p text)
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(trim(p), '') <> ''
    and trim(p) in (
      'houston', 'league_city', 'pasadena', 'pearland', 'sugar_land', 'conroe', 'greater_katy',
      'the_woodlands', 'cypress', 'baytown', 'deer_park', 'friendswood', 'galveston', 'lake_jackson',
      'la_porte', 'missouri_city', 'rosenberg', 'texas_city', 'atascocita', 'channelview', 'mission_bend',
      'spring', 'alvin', 'angleton', 'bellaire', 'clute', 'dickinson', 'fulshear', 'humble', 'katy',
      'la_marque', 'richmond', 'santa_fe', 'seabrook', 'south_houston', 'stafford', 'tomball', 'webster',
      'west_university_place', 'aldine', 'cinco_ranch', 'fresno', 'greatwood', 'new_territory',
      'pecan_grove', 'sienna', 'jersey_village', 'kemah', 'magnolia', 'manvel', 'mont_belvieu',
      'montgomery', 'prairie_view', 'sealy', 'shenandoah', 'waller', 'willis', 'other_houston_metro',
      'outside_houston_metro'
    );
$$;

revoke all on function public.kigh_is_valid_general_location_area(text) from public;

create or replace function public.kigh_is_valid_professional_field(p text)
returns boolean
language sql
immutable
parallel safe
as $$
  select p is null
     or coalesce(trim(p), '') = ''
     or trim(p) in (
       'healthcare', 'nursing', 'education', 'information_technology', 'engineering', 'finance_accounting',
       'legal', 'real_estate', 'construction_trades', 'transportation_logistics', 'beauty_wellness',
       'hospitality_food', 'business_owner', 'entrepreneurship', 'government_public_service',
       'nonprofit_community', 'student', 'retired', 'homemaker_caregiver', 'other'
     );
$$;

revoke all on function public.kigh_is_valid_professional_field(text) from public;

create or replace function public.kigh_professional_other_ok(pf text, pfo text)
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(trim(pf), '') is distinct from 'other'
     or (pfo is not null and char_length(trim(pfo)) between 1 and 80);
$$;

revoke all on function public.kigh_professional_other_ok(text, text) from public;

-- ─── profiles: planning / metrics columns (nullable for legacy UAT rows) ───
alter table public.profiles add column if not exists general_location_area text;
alter table public.profiles add column if not exists professional_field text;
alter table public.profiles add column if not exists professional_field_other text;

alter table public.profiles drop constraint if exists profiles_general_location_area_valid;
alter table public.profiles add constraint profiles_general_location_area_valid
  check (general_location_area is null or public.kigh_is_valid_general_location_area(general_location_area));

alter table public.profiles drop constraint if exists profiles_professional_field_valid;
alter table public.profiles add constraint profiles_professional_field_valid
  check (public.kigh_is_valid_professional_field(professional_field));

alter table public.profiles drop constraint if exists profiles_professional_other_ok;
alter table public.profiles add constraint profiles_professional_other_ok
  check (public.kigh_professional_other_ok(professional_field, professional_field_other));

alter table public.profiles drop constraint if exists profiles_professional_field_other_len;
alter table public.profiles add constraint profiles_professional_field_other_len
  check (professional_field_other is null or char_length(professional_field_other) <= 80);

-- ─── members: mirror columns for membership intake + reporting ───
alter table public.members add column if not exists general_location_area text;
alter table public.members add column if not exists professional_field text;
alter table public.members add column if not exists professional_field_other text;

alter table public.members drop constraint if exists members_general_location_area_valid;
alter table public.members add constraint members_general_location_area_valid
  check (general_location_area is null or public.kigh_is_valid_general_location_area(general_location_area));

alter table public.members drop constraint if exists members_professional_field_valid;
alter table public.members add constraint members_professional_field_valid
  check (public.kigh_is_valid_professional_field(professional_field));

alter table public.members drop constraint if exists members_professional_other_ok;
alter table public.members add constraint members_professional_other_ok
  check (public.kigh_professional_other_ok(professional_field, professional_field_other));

alter table public.members drop constraint if exists members_professional_field_other_len;
alter table public.members add constraint members_professional_field_other_len
  check (professional_field_other is null or char_length(professional_field_other) <= 80);

create index if not exists members_general_location_area_idx on public.members (general_location_area);
create index if not exists members_professional_field_idx on public.members (professional_field);

-- ─── member_invites (WhatsApp handoff — not SMS delivery) ───
create table if not exists public.member_invites (
  id uuid primary key default gen_random_uuid(),
  invited_by uuid not null references auth.users (id) on delete cascade,
  recipient_name text,
  recipient_phone text not null,
  normalized_phone text not null,
  personal_note text,
  invite_message text not null,
  channel text not null default 'whatsapp',
  status text not null default 'opened_whatsapp',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_invites_channel_check check (channel = 'whatsapp'),
  constraint member_invites_status_check check (status in ('opened_whatsapp', 'cancelled')),
  constraint member_invites_recipient_phone_len check (char_length(trim(recipient_phone)) between 7 and 30),
  constraint member_invites_normalized_phone_len check (char_length(trim(normalized_phone)) between 7 and 15),
  constraint member_invites_personal_note_len check (personal_note is null or char_length(personal_note) <= 300),
  constraint member_invites_message_nonempty check (char_length(trim(invite_message)) >= 1)
);

create index if not exists member_invites_invited_by_idx on public.member_invites (invited_by);
create index if not exists member_invites_created_at_idx on public.member_invites (created_at desc);
create index if not exists member_invites_normalized_phone_idx on public.member_invites (normalized_phone);

drop trigger if exists member_invites_updated_at on public.member_invites;
create trigger member_invites_updated_at
  before update on public.member_invites
  for each row execute function public.set_updated_at();

alter table public.member_invites enable row level security;

drop policy if exists "member_invites insert own" on public.member_invites;
create policy "member_invites insert own"
  on public.member_invites for insert
  to authenticated
  with check (invited_by = auth.uid());

drop policy if exists "member_invites select own" on public.member_invites;
create policy "member_invites select own"
  on public.member_invites for select
  to authenticated
  using (invited_by = auth.uid());

drop policy if exists "member_invites select admin" on public.member_invites;
create policy "member_invites select admin"
  on public.member_invites for select
  to authenticated
  using (public.is_admin());

drop policy if exists "member_invites update admin" on public.member_invites;
create policy "member_invites update admin"
  on public.member_invites for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "member_invites delete admin" on public.member_invites;
create policy "member_invites delete admin"
  on public.member_invites for delete
  to authenticated
  using (public.is_admin());

grant select, insert on public.member_invites to authenticated;
grant update, delete on public.member_invites to authenticated;

-- ─── Admin-only aggregate demographics (linked members only) ───
create or replace function public.kigh_admin_member_demographics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tot bigint;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*)::bigint into v_tot from public.members m where m.user_id is not null;

  return jsonb_build_object(
    'total_linked_members', coalesce(v_tot, 0),
    'by_location',
    coalesce(
      (
        select jsonb_agg(to_jsonb(x) ORDER BY x.n DESC NULLS LAST)
        from (
          select coalesce(m.general_location_area, 'unspecified') as area,
                 count(*)::bigint as n,
                 case when v_tot > 0 then round(100.0 * count(*)::numeric / v_tot::numeric, 1) else 0 end as pct
          from public.members m
          where m.user_id is not null
          group by 1
        ) x
      ),
      '[]'::jsonb
    ),
    'by_profession',
    coalesce(
      (
        select jsonb_agg(to_jsonb(y) ORDER BY y.n DESC NULLS LAST)
        from (
          select coalesce(nullif(trim(m.professional_field), ''), 'not_specified') as field,
                 count(*)::bigint as n,
                 case when v_tot > 0 then round(100.0 * count(*)::numeric / v_tot::numeric, 1) else 0 end as pct
          from public.members m
          where m.user_id is not null
          group by 1
        ) y
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.kigh_admin_member_demographics() from public;
grant execute on function public.kigh_admin_member_demographics() to authenticated;

comment on table public.member_invites is
  'Member-initiated WhatsApp invite handoffs. Status opened_whatsapp means the site opened wa.me — not delivery confirmation.';

-- ─── Membership RPC: require general_location_area; optional profession ───
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
  v_interests text[];
  v_existing_own uuid;
  v_legacy_id uuid;
  v_conflict_id uuid;
  v_glca text;
  v_pf text;
  v_pfo text;
begin
  if v_uid is null then
    raise exception 'authentication_required'
      using hint = 'Create your account and sign in before submitting membership.';
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

  v_glca := trim(p_data->>'general_location_area');
  if v_glca is null or v_glca = '' or not public.kigh_is_valid_general_location_area(v_glca) then
    raise exception 'missing_or_invalid_general_location_area';
  end if;

  v_pf := nullif(trim(p_data->>'professional_field'), '');
  v_pfo := nullif(trim(p_data->>'professional_field_other'), '');
  if v_pf is not null and not public.kigh_is_valid_professional_field(v_pf) then
    raise exception 'invalid_professional_field';
  end if;
  if coalesce(v_pf, '') = 'other' and (v_pfo is null or char_length(trim(v_pfo)) < 1 or char_length(v_pfo) > 80) then
    raise exception 'professional_field_other_required';
  end if;

  v_interests := coalesce(
    (
      select array_agg(trim(elem)) filter (where trim(elem) <> '')
      from jsonb_array_elements_text(coalesce(p_data->'interests', '[]'::jsonb)) as t(elem)
    ),
    '{}'::text[]
  );

  -- (A) Already linked to this auth user: refresh submitted data.
  select m.id into v_existing_own from public.members m where m.user_id = v_uid limit 1;

  if v_existing_own is not null then
    v_id := v_existing_own;
    update public.members
       set first_name = v_first,
           last_name = v_last,
           email = v_email,
           phone = nullif(trim(p_data->>'phone'), ''),
           address_line1 = nullif(trim(p_data->>'address_line1'), ''),
           city = nullif(trim(p_data->>'city'), ''),
           state = nullif(trim(p_data->>'state'), ''),
           zip_code = nullif(trim(p_data->>'zip_code'), ''),
           kenyan_county_or_heritage = nullif(trim(p_data->>'kenyan_county_or_heritage'), ''),
           preferred_communication = nullif(trim(p_data->>'preferred_communication'), ''),
           membership_type = v_type,
           interests = v_interests,
           agreed_to_constitution = v_agreed,
           consent_to_communications = v_consent,
           general_location_area = v_glca,
           professional_field = v_pf,
           professional_field_other = case when v_pf = 'other' then v_pfo else null end,
           updated_at = now()
     where id = v_id;

    delete from public.household_members where member_id = v_id;

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
  end if;

  -- (B) Legacy row with same email and no auth link: claim it.
  select m.id into v_legacy_id
    from public.members m
   where lower(trim(m.email)) = v_email
     and m.user_id is null
   limit 1;

  if v_legacy_id is not null then
    v_id := v_legacy_id;
    update public.members
       set user_id = v_uid,
           first_name = v_first,
           last_name = v_last,
           email = v_email,
           phone = nullif(trim(p_data->>'phone'), ''),
           address_line1 = nullif(trim(p_data->>'address_line1'), ''),
           city = nullif(trim(p_data->>'city'), ''),
           state = nullif(trim(p_data->>'state'), ''),
           zip_code = nullif(trim(p_data->>'zip_code'), ''),
           kenyan_county_or_heritage = nullif(trim(p_data->>'kenyan_county_or_heritage'), ''),
           preferred_communication = nullif(trim(p_data->>'preferred_communication'), ''),
           membership_type = v_type,
           interests = v_interests,
           agreed_to_constitution = v_agreed,
           consent_to_communications = v_consent,
           general_location_area = v_glca,
           professional_field = v_pf,
           professional_field_other = case when v_pf = 'other' then v_pfo else null end,
           updated_at = now()
     where id = v_id;

    delete from public.household_members where member_id = v_id;

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
  end if;

  select m.id into v_conflict_id
    from public.members m
   where lower(trim(m.email)) = v_email
     and m.user_id is not null
     and m.user_id <> v_uid
   limit 1;

  if v_conflict_id is not null then
    raise exception 'member_email_registered_to_another_user'
      using hint = 'This email is already linked to another account. Contact support if this is a mistake.';
  end if;

  insert into members (
    user_id,
    first_name, last_name, email, phone, address_line1, city, state, zip_code,
    kenyan_county_or_heritage, preferred_communication, membership_type, interests,
    agreed_to_constitution, consent_to_communications,
    general_location_area, professional_field, professional_field_other
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
    v_interests,
    v_agreed,
    v_consent,
    v_glca,
    v_pf,
    case when v_pf = 'other' then v_pfo else null end
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
  'Authenticated membership intake (027+) with required general_location_area and optional professional_field.';

comment on function public.kigh_admin_member_demographics() is
  'Elevated-admin only: aggregate member counts by general_location_area and professional_field (linked members).';
