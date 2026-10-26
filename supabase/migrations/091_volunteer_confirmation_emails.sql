-- ============================================================
-- 091 — Volunteer confirmation and reminder emails
-- ============================================================
-- Confirming a volunteer used to change a status and nothing else: the
-- volunteer only heard if an admin messaged them by hand, and nobody was
-- pointed to the event's WhatsApp group.
--
--   1. Setting a signup to "confirmed" emails the volunteer straight away:
--      event, date, time, place, role, instructions, and a "Join the
--      volunteer WhatsApp group" button when the event has a link saved.
--   2. kigh_send_volunteer_emails() runs hourly. It retries a confirmation
--      Resend refused as busy, and at 9am Houston time it sends a reminder
--      to confirmed volunteers whose event is 1-3 days away.
--
-- Only volunteers confirmed from now on are emailed (confirmed_at is set
-- when the status changes to confirmed). Everyone confirmed before this
-- migration has confirmed_at null and is never emailed automatically.
--   3. kigh_admin_send_volunteer_email() lets an admin resend either one.
--
-- Emails go from the KIGH notice address (migration 090), replies to the
-- KIGH inbox. Sends are spaced so a batch stays under Resend's 2/second.
-- Idempotent.

-- ─── 1. Columns ────────────────────────────────────────────
alter table public.event_volunteer_signups
  add column if not exists confirmation_emailed_at timestamptz;
alter table public.event_volunteer_signups
  add column if not exists reminder_emailed_at timestamptz;
alter table public.event_volunteer_signups
  add column if not exists confirmed_at timestamptz;

comment on column public.event_volunteer_signups.confirmed_at is
  'When an admin set the status to confirmed (migration 091 onward). Null for volunteers confirmed earlier, who get no automatic emails.';

create or replace function public.kigh_volunteer_stamp_confirmed()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    new.confirmed_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.kigh_volunteer_stamp_confirmed() from public, anon, authenticated;

drop trigger if exists kigh_volunteer_stamp_confirmed on public.event_volunteer_signups;
create trigger kigh_volunteer_stamp_confirmed
  before insert or update of status on public.event_volunteer_signups
  for each row execute function public.kigh_volunteer_stamp_confirmed();

-- Lets the reconciler hand a failed send back to whoever queued it.
alter table public.kigh_admin_alert_emails add column if not exists related_table text;
alter table public.kigh_admin_alert_emails add column if not exists related_id uuid;
alter table public.kigh_admin_alert_emails add column if not exists related_kind text;

-- ─── 2. Compose and queue one volunteer email ──────────────
-- p_kind: 'confirmation' or 'reminder'. Returns the email log id, or null
-- when the volunteer has no usable email or sending is off.
create or replace function public.kigh_send_volunteer_email(p_signup_id uuid, p_kind text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  v_settings public.kigh_admin_alert_settings%rowtype;
  v_site text;
  v_whatsapp text;
  v_when text;
  v_where text;
  v_days int;
  v_text text;
  v_subject text;
  v_email_id bigint;
begin
  if p_kind not in ('confirmation', 'reminder') then
    raise exception 'unsupported_volunteer_email' using errcode = '22023';
  end if;

  select v.id, v.full_name, v.email, v.volunteer_role, v.status,
         e.id as event_id, e.title, e.slug, e.start_date, e.start_time, e.end_time,
         e.location, e.address, e.is_virtual, e.volunteer_signup_instructions
  into s
  from public.event_volunteer_signups v
  join public.events e on e.id = v.event_id
  where v.id = p_signup_id;
  if not found or not public.kigh_is_email(s.email) then
    return null;
  end if;

  select * into v_settings from public.kigh_admin_alert_settings where id;
  v_site := rtrim(coalesce(v_settings.site_url, 'https://www.kenyansingreaterhouston.org'), '/');
  select invite_url into v_whatsapp from public.event_whatsapp_groups where event_id = s.event_id;

  v_when := to_char(s.start_date, 'FMDay, FMMonth FMDD, YYYY')
    || case when s.start_time is not null then ', ' || to_char(s.start_time, 'FMHH12:MI AM') else '' end
    || case when s.end_time is not null then ' to ' || to_char(s.end_time, 'FMHH12:MI AM') else '' end;
  v_where := case when coalesce(s.is_virtual, false) then 'Online (link shared before the event)'
                  else concat_ws(', ', nullif(trim(s.location), ''), nullif(trim(s.address), '')) end;
  v_days := s.start_date - (now() at time zone 'America/Chicago')::date;

  v_text := 'Hello ' || coalesce(nullif(split_part(trim(s.full_name), ' ', 1), ''), 'there') || ','
    || E'\n\n'
    || case when p_kind = 'confirmation'
         then 'Thank you for volunteering with Kenyans in Greater Houston. You are confirmed for ' || s.title || '.'
         else 'A quick reminder that you are volunteering at ' || s.title
              || case when v_days = 1 then ' tomorrow.' when v_days > 1 then ' in ' || v_days || ' days.' else '.' end
       end
    || E'\n\n' || 'When: ' || v_when
    || case when coalesce(v_where, '') <> '' then E'\n' || 'Where: ' || v_where else '' end
    || case when nullif(trim(s.volunteer_role), '') is not null then E'\n' || 'Your role: ' || trim(s.volunteer_role) else '' end
    || case when nullif(trim(s.volunteer_signup_instructions), '') is not null
         then E'\n\n' || trim(s.volunteer_signup_instructions) else '' end
    || E'\n\n'
    || case when v_whatsapp is not null
         then case when p_kind = 'confirmation'
                then 'Please join the volunteer WhatsApp group. That is where we share shifts, updates and any last-minute changes.'
                else 'If you have not joined the volunteer WhatsApp group yet, please join now so you get the day-of updates.' end
         else 'We will share the volunteer WhatsApp group with you before the event.' end
    || E'\n\n' || 'Event details: ' || v_site || '/events/' || s.slug
    || E'\n\n' || 'If your plans change, just reply to this email and let us know.'
    || E'\n\n' || 'Asante sana,' || E'\n' || 'Kenyans in Greater Houston';

  v_subject := case when p_kind = 'confirmation'
    then 'You''re confirmed to volunteer: ' || s.title
    else 'Reminder: volunteering at ' || s.title || ' on ' || to_char(s.start_date, 'FMMonth FMDD') end;

  v_email_id := public.kigh_queue_email(
    'notice',
    array[lower(trim(s.email))],
    v_subject,
    public.kigh_notice_html(v_text,
      case when v_whatsapp is not null then 'Join the volunteer WhatsApp group' end,
      v_whatsapp),
    v_text || case when v_whatsapp is not null then E'\n\n' || 'Join the volunteer WhatsApp group: ' || v_whatsapp else '' end,
    1,
    v_settings.notice_reply_to,
    v_settings.notice_from_address,
    null);

  if v_email_id is not null then
    update public.kigh_admin_alert_emails
      set related_table = 'event_volunteer_signups', related_id = s.id, related_kind = p_kind
      where id = v_email_id;
    if p_kind = 'confirmation' then
      update public.event_volunteer_signups set confirmation_emailed_at = now() where id = s.id;
    else
      update public.event_volunteer_signups set reminder_emailed_at = now() where id = s.id;
    end if;
  end if;
  return v_email_id;
end;
$$;

revoke all on function public.kigh_send_volunteer_email(uuid, text) from public, anon, authenticated;

-- ─── 3. Confirming sends the email at once ─────────────────
create or replace function public.kigh_volunteer_confirmed_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed'
     and (tg_op = 'INSERT' or old.status is distinct from 'confirmed')
     and new.confirmation_emailed_at is null then
    perform public.kigh_send_volunteer_email(new.id, 'confirmation');
  end if;
  return null;
exception when others then
  -- Never block the admin's status change; the hourly job retries.
  raise warning 'kigh volunteer confirmation skipped for %: %', new.id, sqlerrm;
  return null;
end;
$$;

revoke all on function public.kigh_volunteer_confirmed_email() from public, anon, authenticated;

drop trigger if exists kigh_volunteer_confirmed_email on public.event_volunteer_signups;
create trigger kigh_volunteer_confirmed_email
  after insert or update of status on public.event_volunteer_signups
  for each row execute function public.kigh_volunteer_confirmed_email();

-- ─── 4. Hourly: catch-up confirmations and reminders ───────
create or replace function public.kigh_send_volunteer_emails(p_force_reminders boolean default false)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Chicago')::date;
  v_hour int := extract(hour from now() at time zone 'America/Chicago')::int;
  r record;
  v_sent int := 0;
begin
  -- Confirmed since migration 091 but not emailed yet (Resend was busy),
  -- for events that have not happened yet.
  for r in
    select v.id
    from public.event_volunteer_signups v
    join public.events e on e.id = v.event_id
    where v.status = 'confirmed'
      and v.confirmed_at is not null
      and v.confirmation_emailed_at is null
      and public.kigh_is_email(v.email)
      and e.start_date >= v_today
    order by v.submitted_at
    limit 40
  loop
    if public.kigh_send_volunteer_email(r.id, 'confirmation') is not null then
      v_sent := v_sent + 1;
      perform pg_sleep(0.6);
    end if;
  end loop;

  -- Reminders once a day at 9am, 1-3 days before the event. Skipped for
  -- anyone whose confirmation went out in the last 36 hours.
  if p_force_reminders or v_hour = 9 then
    for r in
      select v.id
      from public.event_volunteer_signups v
      join public.events e on e.id = v.event_id
      where v.status = 'confirmed'
        and v.confirmed_at is not null
        and v.reminder_emailed_at is null
        and public.kigh_is_email(v.email)
        and e.start_date between v_today + 1 and v_today + 3
        and (v.confirmation_emailed_at is null or v.confirmation_emailed_at < now() - interval '36 hours')
      order by e.start_date, v.submitted_at
      limit 100
    loop
      if public.kigh_send_volunteer_email(r.id, 'reminder') is not null then
        v_sent := v_sent + 1;
        perform pg_sleep(0.6);
      end if;
    end loop;
  end if;

  return v_sent;
end;
$$;

revoke all on function public.kigh_send_volunteer_emails(boolean) from public, anon, authenticated;

select cron.schedule('kigh-volunteer-emails', '20 * * * *', 'select public.kigh_send_volunteer_emails()');

-- ─── 5. Admin resend ───────────────────────────────────────
create or replace function public.kigh_admin_send_volunteer_email(p_signup_id uuid, p_kind text default 'confirmation')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_confirmed_at timestamptz;
  v_id bigint;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select email, confirmed_at into v_email, v_confirmed_at
  from public.event_volunteer_signups where id = p_signup_id;
  if not found then
    raise exception 'signup_not_found' using errcode = 'P0002';
  end if;
  -- Volunteers confirmed before these emails existed are left alone.
  if v_confirmed_at is null then
    return jsonb_build_object('emailed', false, 'email', v_email, 'reason', 'confirmed_before_emails');
  end if;
  v_id := public.kigh_send_volunteer_email(p_signup_id, p_kind);
  return jsonb_build_object('emailed', v_id is not null, 'email', v_email);
end;
$$;

revoke all on function public.kigh_admin_send_volunteer_email(uuid, text) from public, anon;
grant execute on function public.kigh_admin_send_volunteer_email(uuid, text) to authenticated;

-- ─── 6. Retry volunteer emails Resend refused as busy ──────
-- Same reconciler as 089, plus: a volunteer email that failed with a
-- rate limit, server error or no answer is handed back (its *_emailed_at
-- cleared) so the hourly job sends it again. Other failures (a bad
-- address) are left as sent so they are not retried forever.
create or replace function public.kigh_reconcile_admin_alert_emails()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e record;
  v_error text;
begin
  for e in
    select m.id, m.requested_at, m.related_table, m.related_id, m.related_kind,
           r.status_code, r.timed_out, r.error_msg, r.content
    from public.kigh_admin_alert_emails m
    left join net._http_response r on r.id = m.request_id
    where m.sent_at is null and m.failed_at is null
  loop
    if e.status_code between 200 and 299 then
      update public.kigh_admin_alert_emails
        set sent_at = now(), status_code = e.status_code where id = e.id;
      update public.kigh_admin_alerts
        set sent_at = now(), last_error = null where email_id = e.id;
    elsif e.status_code is not null or e.timed_out or e.error_msg is not null
          or e.requested_at < now() - interval '10 minutes' then
      v_error := left(coalesce(
        nullif(e.error_msg, ''),
        case when e.timed_out then 'timed out' end,
        case when e.status_code is not null then 'HTTP ' || e.status_code || ': ' || coalesce(e.content, '') end,
        'no response from Resend'), 500);
      update public.kigh_admin_alert_emails
        set failed_at = now(), status_code = e.status_code, error = v_error where id = e.id;
      update public.kigh_admin_alerts
        set email_id = null, last_error = v_error where email_id = e.id;
      if e.related_table = 'event_volunteer_signups'
         and (e.status_code is null or e.status_code = 429 or e.status_code >= 500) then
        if e.related_kind = 'confirmation' then
          update public.event_volunteer_signups set confirmation_emailed_at = null where id = e.related_id;
        elsif e.related_kind = 'reminder' then
          update public.event_volunteer_signups set reminder_emailed_at = null where id = e.related_id;
        end if;
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.kigh_reconcile_admin_alert_emails() from public, anon, authenticated;
