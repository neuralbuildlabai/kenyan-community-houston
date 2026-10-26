-- ============================================================
-- 089 — Email the admins about every public submission
-- ============================================================
-- Until now nothing told the admins that something had been submitted:
-- fundraisers, events, enquiries and sign-ups sat as "pending" until
-- someone happened to open the admin pages.
--
-- How it works, all inside the database (no Edge Function to deploy):
--   1. kigh_admin_alert_sources lists every table a visitor can write to,
--      the label and admin page for it, and which rows count as
--      "waiting". Covering a new form = one row + re-running the installer.
--   2. An AFTER INSERT trigger on each of those tables copies a short
--      summary into kigh_admin_alerts (the outbox). It never blocks the
--      visitor's submission: any error is swallowed with a warning.
--   3. pg_cron runs kigh_send_admin_alerts() every minute. It bundles the
--      unsent alerts into one email and posts it to Resend through pg_net.
--      An alert counts as sent only after Resend answers 2xx; otherwise it
--      is retried, backing off from 2 minutes to at most hourly. Alerts are
--      never dropped, so fixing a bad key later still delivers everything.
--   4. pg_cron runs kigh_send_admin_digest() hourly; at 8am Houston time
--      it emails a list of everything still waiting, so nothing is lost
--      if a single alert is missed, filtered or failed.
--
-- One-time setup after running this file (SQL editor):
--   select vault.create_secret('re_…your Resend API key…', 'resend_api_key');
--   select public.kigh_send_admin_digest(true);   -- test: sends the list now
-- Until the key exists, alerts queue up and go out once it is added.
--
-- The sender defaults to onboarding@resend.dev, which Resend only delivers
-- to the address that owns the Resend account, so create that account with
-- kenyansinhouston@gmail.com. After verifying kenyansingreaterhouston.org
-- in Resend, switch to the domain sender:
--   update public.kigh_admin_alert_settings
--     set from_address = 'KIGH Website <alerts@kenyansingreaterhouston.org>';
-- Idempotent.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ─── 1. Settings (single row) ──────────────────────────────
create table if not exists public.kigh_admin_alert_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  recipients text[] not null default array['kenyansinhouston@gmail.com'],
  from_address text not null default 'KIGH Website <onboarding@resend.dev>',
  site_url text not null default 'https://www.kenyansingreaterhouston.org',
  digest_hour_local int not null default 8 check (digest_hour_local between 0 and 23),
  updated_at timestamptz not null default now()
);

insert into public.kigh_admin_alert_settings (id) values (true)
on conflict (id) do nothing;

alter table public.kigh_admin_alert_settings enable row level security;
revoke all on public.kigh_admin_alert_settings from anon, authenticated;

-- ─── 2. Which tables alert, and what counts as "waiting" ───
-- alert_when:   trigger WHEN clause, written against NEW.
-- pending_when: digest filter, written against alias t (null = not in digest).
create table if not exists public.kigh_admin_alert_sources (
  table_name text primary key,
  label text not null,
  admin_path text not null,
  alert_when text not null default 'true',
  pending_when text,
  skip_admin_authors boolean not null default false,
  enabled boolean not null default true
);

alter table public.kigh_admin_alert_sources enable row level security;
revoke all on public.kigh_admin_alert_sources from anon, authenticated;

insert into public.kigh_admin_alert_sources
  (table_name, label, admin_path, alert_when, pending_when, skip_admin_authors)
values
  ('fundraisers', 'Fundraiser awaiting approval', '/admin/fundraisers',
     $c$new.status = 'pending'$c$, $c$t.status = 'pending'$c$, false),
  ('events', 'Event awaiting approval', '/admin/submissions',
     $c$new.status = 'pending'$c$, $c$t.status = 'pending'$c$, false),
  ('announcements', 'Announcement awaiting approval', '/admin/announcements',
     $c$new.status = 'pending'$c$, $c$t.status = 'pending'$c$, false),
  ('businesses', 'Business listing awaiting approval', '/admin/businesses',
     $c$new.status = 'pending'$c$, $c$t.status = 'pending'$c$, false),
  ('community_groups', 'Community group awaiting approval', '/admin/community-groups',
     $c$new.status = 'pending'$c$, $c$t.status = 'pending'$c$, false),
  ('community_group_join_requests', 'Request to join a community group', '/admin/community-groups',
     $c$new.status = 'new'$c$, $c$t.status = 'new'$c$, false),
  ('members', 'Membership awaiting approval', '/admin/members',
     $c$new.membership_status = 'pending'$c$, $c$t.membership_status = 'pending'$c$, false),
  ('contact_submissions', 'New enquiry (contact form)', '/admin/contacts',
     $c$coalesce(new.honeypot, '') = ''$c$, $c$t.status = 'new' and coalesce(t.honeypot, '') = ''$c$, false),
  ('service_interests', 'Offer to serve', '/admin/service-interests',
     'true', $c$t.status = 'new'$c$, false),
  ('gallery_images', 'Photo awaiting approval', '/admin/gallery',
     $c$new.status = 'pending'$c$, $c$t.status = 'pending'$c$, false),
  ('event_comments', 'Event comment awaiting approval', '/admin/event-comments',
     $c$new.status = 'pending'$c$, $c$t.status = 'pending'$c$, true),
  ('event_volunteer_signups', 'Volunteer sign-up', '/admin/volunteers',
     'true', null, false),
  ('event_vendor_signups', 'Vendor sign-up', '/admin/vendors',
     'true', null, false),
  ('feed_posts', 'New community feed post', '/admin/feed',
     'true', null, true),
  ('feed_comments', 'New community feed comment', '/admin/feed',
     'true', null, true),
  ('chat_messages', 'New chat message from a member', '/admin/chat',
     $c$new.sender_role = 'member' and not coalesce(new.is_internal_note, false)$c$, null, false)
on conflict (table_name) do nothing;

-- ─── 3. Outbox and email log ───────────────────────────────
create table if not exists public.kigh_admin_alert_emails (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('alert', 'digest')),
  subject text not null,
  item_count int not null default 0,
  request_id bigint,
  requested_at timestamptz not null default now(),
  status_code int,
  sent_at timestamptz,
  failed_at timestamptz,
  error text
);

create index if not exists kigh_admin_alert_emails_open
  on public.kigh_admin_alert_emails (requested_at)
  where sent_at is null and failed_at is null;

create table if not exists public.kigh_admin_alerts (
  id bigint generated always as identity primary key,
  source_table text not null,
  record_id text,
  label text not null,
  admin_path text not null,
  title text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  attempts int not null default 0,
  last_attempt_at timestamptz,
  email_id bigint references public.kigh_admin_alert_emails (id) on delete set null,
  sent_at timestamptz,
  last_error text
);

create index if not exists kigh_admin_alerts_unsent
  on public.kigh_admin_alerts (id)
  where sent_at is null;

alter table public.kigh_admin_alert_emails enable row level security;
alter table public.kigh_admin_alerts enable row level security;
-- No policies: only the security definer functions below touch these.
revoke all on public.kigh_admin_alert_emails from anon, authenticated;
revoke all on public.kigh_admin_alerts from anon, authenticated;

-- ─── 4. Helpers ────────────────────────────────────────────
create or replace function public.kigh_html(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select replace(replace(replace(replace(replace(coalesce(p, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

-- Pulls a title / who / contact / excerpt out of any submission row, using
-- whichever of the usual column names the table has.
create or replace function public.kigh_admin_alert_summary(j jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'title', nullif(trim(coalesce(
      j ->> 'title', j ->> 'organization_name', j ->> 'business_name', j ->> 'subject',
      j ->> 'name', j ->> 'full_name', j ->> 'requester_name',
      nullif(trim(concat_ws(' ', j ->> 'first_name', j ->> 'last_name')), ''),
      j ->> 'caption')), ''),
    'who', nullif(trim(coalesce(
      j ->> 'organizer_name', j ->> 'owner_name', j ->> 'author_name', j ->> 'submitter_name',
      j ->> 'contact_name', j ->> 'contact_person', j ->> 'submitted_by_name',
      j ->> 'requester_name', j ->> 'full_name', j ->> 'name',
      nullif(trim(concat_ws(' ', j ->> 'first_name', j ->> 'last_name')), ''))), ''),
    'contact', nullif(concat_ws(' · ',
      nullif(trim(coalesce(j ->> 'email', j ->> 'submitted_by_email', j ->> 'requester_email',
        j ->> 'organizer_contact')), ''),
      nullif(trim(coalesce(j ->> 'phone', j ->> 'requester_phone')), '')), ''),
    'reply_to', (
      select e from unnest(array[
        j ->> 'email', j ->> 'submitted_by_email', j ->> 'requester_email', j ->> 'organizer_contact'
      ]) e
      where trim(e) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      limit 1),
    'excerpt', nullif(left(regexp_replace(trim(coalesce(
      j ->> 'message', j ->> 'body', j ->> 'description', j ->> 'note', j ->> 'notes')),
      '\s+', ' ', 'g'), 400), '')
  ));
$$;

revoke all on function public.kigh_html(text) from public, anon, authenticated;
revoke all on function public.kigh_admin_alert_summary(jsonb) from public, anon, authenticated;

-- ─── 5. Trigger: copy each new submission into the outbox ──
create or replace function public.kigh_enqueue_admin_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j jsonb := to_jsonb(new);
  s public.kigh_admin_alert_sources%rowtype;
  v_details jsonb;
  v_context text;
begin
  select * into s from public.kigh_admin_alert_sources where table_name = tg_table_name;
  if not found or not s.enabled then
    return null;
  end if;

  if s.skip_admin_authors then
    begin
      if public.is_admin() then
        return null;
      end if;
    exception when others then
      null;  -- can't tell: alert anyway
    end;
  end if;

  v_details := public.kigh_admin_alert_summary(j);

  -- Name the event or chat a row belongs to.
  if j ? 'event_id' then
    select e.title into v_context from public.events e where e.id = (j ->> 'event_id')::uuid;
  elsif j ? 'thread_id' then
    select ct.title into v_context from public.chat_threads ct where ct.id = (j ->> 'thread_id')::uuid;
  end if;
  if v_context is not null then
    v_details := v_details || jsonb_build_object('context', v_context);
  end if;

  insert into public.kigh_admin_alerts (source_table, record_id, label, admin_path, title, details)
  values (tg_table_name, j ->> 'id', s.label, s.admin_path,
          coalesce(v_details ->> 'title', left(v_details ->> 'excerpt', 80)), v_details);
  return null;
exception when others then
  -- Never fail the visitor's submission because of an alert.
  raise warning 'kigh admin alert skipped for %: %', tg_table_name, sqlerrm;
  return null;
end;
$$;

revoke all on function public.kigh_enqueue_admin_alert() from public, anon, authenticated;

-- Creates (or re-creates) the trigger on every source table that exists.
-- Returns one line per table so the SQL editor shows what happened.
create or replace function public.kigh_install_admin_alert_triggers()
returns table (table_name text, result text)
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
begin
  for s in select * from public.kigh_admin_alert_sources order by 1 loop
    table_name := s.table_name;
    if to_regclass('public.' || quote_ident(s.table_name)) is null then
      result := 'skipped: table not found';
    else
      begin
        execute format('drop trigger if exists kigh_admin_alert on public.%I', s.table_name);
        execute format(
          'create trigger kigh_admin_alert after insert on public.%I for each row when (%s) execute function public.kigh_enqueue_admin_alert()',
          s.table_name, s.alert_when);
        result := 'installed';
      exception when others then
        result := 'failed: ' || sqlerrm;
      end;
    end if;
    return next;
  end loop;
end;
$$;

revoke all on function public.kigh_install_admin_alert_triggers() from public, anon, authenticated;

-- ─── 6. Talking to Resend ──────────────────────────────────
create or replace function public.kigh_resend_api_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(decrypted_secret), '')
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  order by created_at desc
  limit 1;
$$;

revoke all on function public.kigh_resend_api_key() from public, anon, authenticated;

-- Queues one email with pg_net and logs it. Returns the log id, or null
-- when sending is off or the key is missing.
create or replace function public.kigh_queue_admin_email(
  p_kind text, p_subject text, p_html text, p_text text, p_item_count int, p_reply_to text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.kigh_admin_alert_settings%rowtype;
  v_key text := public.kigh_resend_api_key();
  v_body jsonb;
  v_email_id bigint;
  v_request_id bigint;
begin
  select * into v_settings from public.kigh_admin_alert_settings where id;
  if not found or not v_settings.enabled then
    return null;
  end if;
  if v_key is null then
    raise notice 'No Resend key: run select vault.create_secret(''re_…'', ''resend_api_key'');';
    return null;
  end if;

  v_body := jsonb_build_object(
    'from', v_settings.from_address,
    'to', to_jsonb(v_settings.recipients),
    'subject', left(p_subject, 180),
    'html', p_html,
    'text', p_text);
  if p_reply_to is not null then
    v_body := v_body || jsonb_build_object('reply_to', p_reply_to);
  end if;

  insert into public.kigh_admin_alert_emails (kind, subject, item_count)
  values (p_kind, left(p_subject, 180), p_item_count)
  returning id into v_email_id;

  v_request_id := net.http_post(
    url := 'https://api.resend.com/emails',
    body := v_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key),
    timeout_milliseconds := 15000);

  update public.kigh_admin_alert_emails set request_id = v_request_id where id = v_email_id;
  return v_email_id;
end;
$$;

revoke all on function public.kigh_queue_admin_email(text, text, text, text, int, text) from public, anon, authenticated;

-- Reads Resend's answers back from pg_net. Sent alerts are marked sent;
-- failed ones are released for the next run to retry.
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
    select m.id, m.requested_at, r.status_code, r.timed_out, r.error_msg, r.content
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
    end if;
  end loop;
end;
$$;

revoke all on function public.kigh_reconcile_admin_alert_emails() from public, anon, authenticated;

-- ─── 7. Every minute: send what is new ─────────────────────
create or replace function public.kigh_send_admin_alerts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site text;
  v_ids bigint[];
  v_count int;
  a record;
  v_items_html text := '';
  v_items_text text := '';
  v_subject text;
  v_reply_to text;
  v_url text;
  v_email_id bigint;
begin
  perform public.kigh_reconcile_admin_alert_emails();

  if public.kigh_resend_api_key() is null then
    return 0;  -- alerts stay queued until the key is added
  end if;

  select site_url into v_site from public.kigh_admin_alert_settings where id;

  select array_agg(id order by id) into v_ids
  from (
    select id from public.kigh_admin_alerts
    where sent_at is null and email_id is null
      and (last_attempt_at is null
           or last_attempt_at < now() - least(interval '1 minute' * power(2, least(attempts, 6)), interval '1 hour'))
    order by id
    limit 25
    for update skip locked
  ) q;

  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count = 0 then
    return 0;
  end if;

  for a in select * from public.kigh_admin_alerts where id = any (v_ids) order by id loop
    v_url := rtrim(v_site, '/') || a.admin_path;
    v_items_html := v_items_html
      || '<tr><td style="padding:16px 0;border-bottom:1px solid #e5e7eb">'
      || '<div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#6b7280">' || kigh_html(a.label) || '</div>'
      || '<div style="font-size:17px;font-weight:600;color:#111827;margin:4px 0">' || kigh_html(coalesce(a.title, '(untitled)')) || '</div>'
      || case when a.details ? 'context' then '<div style="font-size:14px;color:#374151">For: ' || kigh_html(a.details ->> 'context') || '</div>' else '' end
      || case when a.details ? 'who' or a.details ? 'contact' then
           '<div style="font-size:14px;color:#374151">From: ' || kigh_html(concat_ws(' · ', a.details ->> 'who', a.details ->> 'contact')) || '</div>' else '' end
      || case when a.details ? 'excerpt' then
           '<div style="font-size:14px;color:#4b5563;margin-top:6px;white-space:pre-wrap">' || kigh_html(a.details ->> 'excerpt') || '</div>' else '' end
      || '<div style="margin-top:10px"><a href="' || kigh_html(v_url) || '" style="display:inline-block;background:#166534;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:14px">Review in admin</a></div>'
      || '</td></tr>';
    v_items_text := v_items_text
      || a.label || E'\n' || coalesce(a.title, '(untitled)') || E'\n'
      || case when a.details ? 'context' then 'For: ' || (a.details ->> 'context') || E'\n' else '' end
      || case when a.details ? 'who' or a.details ? 'contact' then 'From: ' || concat_ws(' · ', a.details ->> 'who', a.details ->> 'contact') || E'\n' else '' end
      || case when a.details ? 'excerpt' then (a.details ->> 'excerpt') || E'\n' else '' end
      || 'Review: ' || v_url || E'\n\n';
    if v_count = 1 then
      v_subject := '[KIGH] ' || a.label || coalesce(': ' || a.title, '');
      v_reply_to := a.details ->> 'reply_to';
    end if;
  end loop;

  if v_count > 1 then
    v_subject := '[KIGH] ' || v_count || ' new submissions on the website';
  end if;

  v_email_id := public.kigh_queue_admin_email(
    'alert',
    v_subject,
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px">'
      || '<p style="font-size:15px;color:#111827">' || case when v_count = 1 then 'Something new was submitted on the KIGH website:' else v_count || ' new things were submitted on the KIGH website:' end || '</p>'
      || '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' || v_items_html || '</table>'
      || '<p style="font-size:12px;color:#6b7280;margin-top:20px">Sent automatically to the KIGH admins. You will need to be signed in to the admin site to open the links.</p></div>',
    case when v_count = 1 then 'Something new was submitted on the KIGH website:' else v_count || ' new things were submitted on the KIGH website:' end
      || E'\n\n' || v_items_text,
    v_count,
    v_reply_to);

  if v_email_id is null then
    return 0;
  end if;

  update public.kigh_admin_alerts
    set email_id = v_email_id, attempts = attempts + 1, last_attempt_at = now()
    where id = any (v_ids);
  return v_count;
end;
$$;

revoke all on function public.kigh_send_admin_alerts() from public, anon, authenticated;

-- ─── 8. Daily: everything still waiting ────────────────────
-- Runs hourly; sends at digest_hour_local Houston time, once a day, and
-- only when something is waiting. p_force sends right now regardless.
create or replace function public.kigh_send_admin_digest(p_force boolean default false)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.kigh_admin_alert_settings%rowtype;
  v_local timestamp := now() at time zone 'America/Chicago';
  s record;
  v_count int;
  v_rows jsonb;
  r jsonb;
  v_sum jsonb;
  v_total int := 0;
  v_sections int := 0;
  v_html text := '';
  v_text text := '';
  v_url text;
  v_days int;
  v_email_id bigint;
begin
  select * into v_settings from public.kigh_admin_alert_settings where id;
  if not found or not v_settings.enabled then
    return 0;
  end if;

  if not p_force then
    if extract(hour from v_local) <> v_settings.digest_hour_local then
      return 0;
    end if;
    if exists (
      select 1 from public.kigh_admin_alert_emails
      where kind = 'digest' and failed_at is null
        and (requested_at at time zone 'America/Chicago')::date = v_local::date
    ) then
      return 0;
    end if;
  end if;

  -- Housekeeping: keep six months of history.
  delete from public.kigh_admin_alerts where created_at < now() - interval '180 days';
  delete from public.kigh_admin_alert_emails where requested_at < now() - interval '180 days';

  for s in
    select * from public.kigh_admin_alert_sources
    where enabled and pending_when is not null
    order by label
  loop
    if to_regclass('public.' || quote_ident(s.table_name)) is null then
      continue;
    end if;
    begin
      execute format(
        'select count(*)::int, coalesce((select jsonb_agg(x.j order by x.j ->> ''created_at'') from (select to_jsonb(t) j from public.%I t where %s order by t.created_at limit 10) x), ''[]''::jsonb) from public.%I t where %s',
        s.table_name, s.pending_when, s.table_name, s.pending_when)
      into v_count, v_rows;
    exception when others then
      raise warning 'kigh digest skipped %: %', s.table_name, sqlerrm;
      continue;
    end;

    if v_count = 0 then
      continue;
    end if;

    v_total := v_total + v_count;
    v_sections := v_sections + 1;
    v_url := rtrim(v_settings.site_url, '/') || s.admin_path;
    v_html := v_html
      || '<h3 style="font-size:16px;color:#111827;margin:24px 0 6px">' || kigh_html(s.label) || ' (' || v_count || ')</h3><ul style="margin:0;padding-left:20px;color:#374151;font-size:14px">';
    v_text := v_text || s.label || ' (' || v_count || ')' || E'\n';

    for r in select * from jsonb_array_elements(v_rows) loop
      v_sum := public.kigh_admin_alert_summary(r);
      v_days := greatest(0, extract(day from now() - (r ->> 'created_at')::timestamptz)::int);
      v_html := v_html || '<li style="margin:4px 0">'
        || kigh_html(coalesce(v_sum ->> 'title', left(v_sum ->> 'excerpt', 80), '(untitled)'))
        || case when v_sum ? 'who' and v_sum ->> 'who' is distinct from v_sum ->> 'title' then ' — ' || kigh_html(v_sum ->> 'who') else '' end
        || ' <span style="color:#6b7280">(waiting ' || case when v_days = 0 then 'since today' when v_days = 1 then '1 day' else v_days || ' days' end || ')</span></li>';
      v_text := v_text || '  - ' || coalesce(v_sum ->> 'title', left(v_sum ->> 'excerpt', 80), '(untitled)')
        || case when v_sum ? 'who' and v_sum ->> 'who' is distinct from v_sum ->> 'title' then ' — ' || (v_sum ->> 'who') else '' end
        || ' (waiting ' || case when v_days = 0 then 'since today' when v_days = 1 then '1 day' else v_days || ' days' end || ')' || E'\n';
    end loop;

    if v_count > 10 then
      v_html := v_html || '<li style="margin:4px 0;color:#6b7280">…and ' || (v_count - 10) || ' more</li>';
      v_text := v_text || '  …and ' || (v_count - 10) || ' more' || E'\n';
    end if;
    v_html := v_html || '</ul><p style="margin:8px 0 0"><a href="' || kigh_html(v_url) || '" style="color:#166534;font-size:14px">Open ' || kigh_html(s.admin_path) || '</a></p>';
    v_text := v_text || '  Review: ' || v_url || E'\n\n';
  end loop;

  if v_total = 0 and not p_force then
    return 0;
  end if;

  v_email_id := public.kigh_queue_admin_email(
    'digest',
    case when v_total = 0 then '[KIGH] Daily summary: nothing waiting for review'
         else '[KIGH] Daily summary: ' || v_total || ' item' || case when v_total = 1 then '' else 's' end || ' waiting for review' end,
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px">'
      || '<p style="font-size:15px;color:#111827">'
      || case when v_total = 0 then 'Nothing on the KIGH website is waiting for an admin right now.'
              else 'These items on the KIGH website are still waiting for an admin:' end
      || '</p>' || v_html
      || '<p style="font-size:12px;color:#6b7280;margin-top:24px">Sent automatically every morning while anything is waiting. You will need to be signed in to the admin site to open the links.</p></div>',
    case when v_total = 0 then 'Nothing on the KIGH website is waiting for an admin right now.'
         else 'These items on the KIGH website are still waiting for an admin:' end
      || E'\n\n' || v_text,
    v_total);

  return case when v_email_id is null then 0 else v_total end;
end;
$$;

revoke all on function public.kigh_send_admin_digest(boolean) from public, anon, authenticated;

-- ─── 9. Status for the System Health page ──────────────────
create or replace function public.kigh_admin_email_alert_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.kigh_is_system_health_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'enabled', (select enabled from public.kigh_admin_alert_settings where id),
    'recipients', (select to_jsonb(recipients) from public.kigh_admin_alert_settings where id),
    'from_address', (select from_address from public.kigh_admin_alert_settings where id),
    'api_key_configured', public.kigh_resend_api_key() is not null,
    'scheduled_jobs', (
      select coalesce(jsonb_agg(jobname order by jobname), '[]'::jsonb)
      from cron.job where jobname in ('kigh-admin-alerts', 'kigh-admin-digest') and active),
    'triggers_installed', (
      select count(*)::int from pg_trigger where tgname = 'kigh_admin_alert' and not tgisinternal),
    'sources', (select count(*)::int from public.kigh_admin_alert_sources where enabled),
    'last_sent_at', (select max(sent_at) from public.kigh_admin_alert_emails),
    'last_digest_at', (select max(sent_at) from public.kigh_admin_alert_emails where kind = 'digest'),
    'last_failure_at', (select max(failed_at) from public.kigh_admin_alert_emails),
    'last_error', (
      select error from public.kigh_admin_alert_emails
      where failed_at is not null order by failed_at desc limit 1),
    'unsent_alerts', (select count(*)::int from public.kigh_admin_alerts where sent_at is null),
    'retrying_alerts', (select count(*)::int from public.kigh_admin_alerts where sent_at is null and attempts >= 3),
    'sent_last_7_days', (
      select count(*)::int from public.kigh_admin_alerts where sent_at > now() - interval '7 days')
  );
end;
$$;

revoke all on function public.kigh_admin_email_alert_status() from public, anon;
grant execute on function public.kigh_admin_email_alert_status() to authenticated;

-- ─── 10. Schedules ─────────────────────────────────────────
select cron.schedule('kigh-admin-alerts', '* * * * *', 'select public.kigh_send_admin_alerts()');
select cron.schedule('kigh-admin-digest', '0 * * * *', 'select public.kigh_send_admin_digest()');

-- ─── 11. Install the triggers (shows one line per table) ───
select * from public.kigh_install_admin_alert_triggers();
