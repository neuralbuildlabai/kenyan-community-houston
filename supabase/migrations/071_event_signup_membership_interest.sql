-- ============================================================
-- 071 — Membership interest from event volunteer/presenter signup
-- ============================================================
-- Adds an explicit opt-in path: someone signing up to volunteer or
-- present at an event can also start a KIGH membership application
-- in the same submission — but only after they've actually accepted
-- the constitution/contact-consent copy shown on the public form
-- (p_membership_terms_accepted), never as a side effect of merely
-- checking an interest box.
--
-- Important: migration 025 added a hard guard
-- (kigh_members_user_id_insert_guard) that blocks ANY insert into
-- public.members with user_id IS NULL unless the caller is an
-- elevated admin — specifically to stop unlinked, unaccountable
-- member rows from being created. This migration adds ONE narrow,
-- explicit bypass for this one flow (a Postgres session-local
-- config flag set only inside create_event_volunteer_signup,
-- immediately before the guarded insert). No other code path gets
-- this bypass. The resulting row is still incomplete on purpose —
-- no mailing address, no dues payment — and is left in
-- membership_status = 'pending' / dues_status = 'pending' for an
-- admin (or the person's own future self-service signup, per
-- migration 027) to complete.
--
-- Dues ($20/year) are not collected in this flow. Point people at
-- /support (existing CashApp / Venmo / PayPal treasurer handles)
-- and have an admin mark dues_status = 'paid' once received —
-- exactly like the existing vendor-fee workflow.
-- ============================================================

-- ─── 1. Narrow bypass for the members.user_id insert guard ────
create or replace function public.kigh_members_user_id_insert_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is null
     and not public.kigh_is_elevated_admin()
     and coalesce(current_setting('kigh.allow_pending_member_lead', true), '') <> 'true'
  then
    raise exception 'members_user_id_required'
      using hint = 'Membership applications must be submitted while signed in, or created by an elevated admin.';
  end if;
  return new;
end;
$$;

comment on function public.kigh_members_user_id_insert_guard() is
  'Requires user_id on new members rows unless kigh_is_elevated_admin() is true, or the narrow kigh.allow_pending_member_lead session flag is set by create_event_volunteer_signup (migration 071) for an explicitly-accepted membership-interest lead.';

-- ─── 2. create_event_volunteer_signup: add membership opt-in ──
-- Drop the old 6-arg signature first so PostgREST/Supabase-js has
-- exactly one overload to resolve against (avoids the ambiguous-
-- overload class of bug already fixed once in migration 057).
drop function if exists public.create_event_volunteer_signup(uuid, text, text, text, text, text);

create or replace function public.create_event_volunteer_signup(
  p_event_id uuid,
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_volunteer_role text default null,
  p_availability_note text default null,
  p_wants_membership boolean default false,
  p_membership_terms_accepted boolean default false
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
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_uid uuid := auth.uid();
  v_first text;
  v_last text;
  v_space int;
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

  -- Membership interest requires an explicit, accepted opt-in and an
  -- email to follow up on. Checked before the event lookup so a bad
  -- membership request never silently drops without feedback.
  if p_wants_membership and coalesce(p_membership_terms_accepted, false) and v_email is null then
    raise exception 'membership_requires_email' using errcode = 'P0001';
  end if;

  select
    e.id,
    e.title,
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

  -- ─── Optional membership interest (only on explicit acceptance) ──
  if p_wants_membership and coalesce(p_membership_terms_accepted, false) then
    v_space := position(' ' in v_name);
    if v_space > 0 then
      v_first := left(v_name, v_space - 1);
      v_last := trim(substring(v_name from v_space + 1));
    else
      v_first := v_name;
      v_last := v_name;
    end if;
    if v_last is null or v_last = '' then
      v_last := v_first;
    end if;

    -- Narrow, single-purpose bypass for kigh_members_user_id_insert_guard
    -- (see comment on that function). Session-local — clears itself at
    -- the end of this transaction/request.
    perform set_config('kigh.allow_pending_member_lead', 'true', true);

    insert into public.members (
      first_name, last_name, email, phone, membership_type,
      agreed_to_constitution, consent_to_communications,
      dues_status, membership_status, review_notes
    )
    select
      v_first, v_last, v_email, v_phone, 'individual',
      true, true,
      'pending', 'pending',
      'Auto-created from event volunteer/presenter signup for "'
        || coalesce(v_event.title, 'an event')
        || '". Accepted the constitution + contact-consent copy at signup. '
        || 'Still needed: mailing address and $20/yr dues (see /support). '
        || 'Follow up to complete the application or invite them to self-serve.'
    on conflict ((lower(email))) do nothing;
  end if;

  return v_id;
exception
  when unique_violation then
    raise exception 'duplicate_signup' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_event_volunteer_signup(uuid, text, text, text, text, text, boolean, boolean) from public;
grant execute on function public.create_event_volunteer_signup(uuid, text, text, text, text, text, boolean, boolean) to anon, authenticated;

comment on function public.create_event_volunteer_signup is
  'Creates a volunteer/presenter signup for a published event with volunteer_signup_enabled. Optionally also creates a pending, unlinked public.members row when p_wants_membership and p_membership_terms_accepted are both true and an email is present (membership_status=pending, dues_status=pending, agreed_to_constitution=true) — dues and address are collected later. Friendly errors: name_required, invalid_phone, invalid_note, membership_requires_email, volunteer_signup_not_enabled, volunteer_signup_closed, duplicate_signup.';
