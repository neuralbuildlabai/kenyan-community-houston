-- ============================================================
-- 027 — Claim legacy passwordless members on authenticated signup
-- ============================================================
-- Problem: Legacy rows have user_id IS NULL but unique lower(email).
-- A new Auth user signing up with the same email would hit a duplicate
-- key on insert into public.members.
--
-- Fix: submit_membership_registration now:
--   (A) Updates the row already linked to auth.uid().
--   (B) Claims a legacy row (same email, user_id IS NULL) by setting user_id.
--   (C) Inserts only when no matching row exists.
--
-- Manual admin linking via public.kigh_link_member_to_user(uuid, uuid)
-- (migration 016) is unchanged and remains elevated-admin only.
-- ============================================================

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

  -- Same email already linked to a different auth user (data integrity guard).
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

  -- (C) New self-service registration.
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
    v_interests,
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
  'Authenticated membership intake: updates existing row for auth.uid(), claims legacy same-email null user_id row, or inserts. Enforces email match with auth.users.';

-- Re-run legacy audit after deploy / user self-serve:
--   select id, email, first_name, last_name, user_id, submitted_at
--   from public.members
--   where user_id is null
--   order by submitted_at desc nulls last;
