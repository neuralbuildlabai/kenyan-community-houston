-- ============================================================
-- 074 — 2026 dues waiver: automatic sunset on Dec 1, 2026
-- ============================================================
-- Community decision: $20 annual dues are waived for 2026, with
-- dues resuming after the November by-elections — 2027 dues are in
-- play beginning Dec 1, 2026.
--
-- Migration 073 hard-coded dues_status = 'waived' for membership
-- leads created via the event signup flow, which would silently
-- keep waiving dues forever unless someone remembered to change
-- it. This migration replaces the hard-coding with a DATE-BASED
-- rule so nothing needs to be remembered or deployed on the day:
--
--   before 2026-12-01 00:00 America/Chicago (CST, UTC-6):
--     dues_status = 'waived'  (2026 waiver)
--   on/after that moment:
--     dues_status = 'pending' (2027 dues owed)
--
-- The public form (src/lib/eventVolunteerSignup.ts,
-- DUES_WAIVER_ENDS_AT) flips its messaging at the same instant.
-- Keep the two boundaries in sync if the date ever changes.
-- ============================================================

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
  -- 2026 dues waiver sunset: Dec 1, 2026 00:00 America/Chicago (CST = UTC-6).
  v_waiver_active boolean := now() < timestamptz '2026-12-01 00:00:00-06';
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

    perform set_config('kigh.allow_pending_member_lead', 'true', true);

    insert into public.members (
      first_name, last_name, email, phone, membership_type,
      agreed_to_constitution, consent_to_communications,
      dues_status, membership_status, review_notes
    )
    select
      v_first, v_last, v_email, v_phone, 'individual',
      true, true,
      case when v_waiver_active then 'waived' else 'pending' end,
      'pending',
      'Auto-created from event volunteer/presenter signup for "'
        || coalesce(v_event.title, 'an event')
        || '". Accepted the constitution + contact-consent copy at signup. '
        || case
             when v_waiver_active
               then '2026 dues waived per community decision (waiver ends Dec 1, 2026); voluntary support via /support encouraged. '
             else 'Annual dues ($20) owed — direct them to /support. '
           end
        || 'Still needed: mailing address. Follow up to welcome them and complete the application.'
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
  'Creates a volunteer/presenter signup for a published event. Optional membership lead (explicit accept + email required) creates a pending public.members row; dues_status is waived before 2026-12-01 00:00 America/Chicago (2026 waiver) and pending from then on (2027 dues). Friendly errors: name_required, invalid_phone, invalid_note, membership_requires_email, volunteer_signup_not_enabled, volunteer_signup_closed, duplicate_signup.';
