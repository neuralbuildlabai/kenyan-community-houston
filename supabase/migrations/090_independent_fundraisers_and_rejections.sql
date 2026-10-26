-- ============================================================
-- 090 — Independent fundraisers, organizer tallies, rejections
-- ============================================================
-- KIGH lists community members' fundraisers but does not run them or hold
-- their money. Until now the public form let anyone tick "Internal KIGH
-- fundraiser" and collect through KIGH's own payment handles, rejecting a
-- submission recorded no reason and told nobody, and only admins could
-- update a total that only the organizer actually knows.
--
--   1. Private contact details. Organizer email/phone (fundraisers) and the
--      new optional submitter email (announcements) are moved by a BEFORE
--      trigger into kigh_submission_private, readable only by admins, and
--      blanked on the public row. Existing fundraiser contacts move too.
--   2. Public fundraisers are external only: a https donation link and an
--      organizer email are required, KIGH handles are refused. Elevated
--      admins can still create or switch a fundraiser to internal.
--   3. Organizer manage link. Publishing an external fundraiser emails the
--      organizer a private link (only its sha256 is stored) where they
--      update the amount raised and close donations. Admins can re-issue it.
--   4. kigh_reject_submission() rejects a fundraiser, event, announcement or
--      business with a note, and emails the note to the submitter from the
--      KIGH domain (replies go to the KIGH inbox, which also gets a copy).
--
-- Emails reuse the Resend + pg_net outbox from migration 089.
-- Idempotent.

-- ─── 1. Columns ────────────────────────────────────────────
alter table public.fundraisers add column if not exists organizer_email text;
alter table public.announcements add column if not exists submitter_email text;

alter table public.fundraisers add column if not exists rejection_note text;
alter table public.fundraisers add column if not exists rejected_at timestamptz;
alter table public.fundraisers add column if not exists rejected_by uuid;
alter table public.events add column if not exists rejection_note text;
alter table public.events add column if not exists rejected_at timestamptz;
alter table public.events add column if not exists rejected_by uuid;
alter table public.announcements add column if not exists rejection_note text;
alter table public.announcements add column if not exists rejected_at timestamptz;
alter table public.announcements add column if not exists rejected_by uuid;
alter table public.businesses add column if not exists rejection_note text;
alter table public.businesses add column if not exists rejected_at timestamptz;
alter table public.businesses add column if not exists rejected_by uuid;

comment on column public.fundraisers.organizer_email is
  'Write-only: the submit form sends it, kigh_capture_submission_private() moves it to kigh_submission_private and blanks it here.';
comment on column public.announcements.submitter_email is
  'Write-only: moved to kigh_submission_private on insert, blanked here.';

-- ─── 2. Private contact store (admins only) ────────────────
create table if not exists public.kigh_submission_private (
  source_table text not null check (source_table in ('fundraisers', 'announcements')),
  record_id uuid not null,
  email text,
  contact text,
  manage_token_hash text unique,
  manage_token_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_table, record_id)
);

alter table public.kigh_submission_private enable row level security;
revoke all on public.kigh_submission_private from anon, authenticated;
grant select on public.kigh_submission_private to authenticated;

drop policy if exists "submission private elevated admin read" on public.kigh_submission_private;
create policy "submission private elevated admin read"
  on public.kigh_submission_private
  for select
  to authenticated
  using (public.kigh_is_elevated_admin());

comment on table public.kigh_submission_private is
  'Submitter contact details and fundraiser manage-link hashes, kept off the publicly readable rows. Admin read only; written by security definer functions.';

create or replace function public.kigh_is_email(p text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(trim(p), '') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';
$$;

-- ─── 3. Capture trigger: move contacts off the public row ──
create or replace function public.kigh_capture_submission_private()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_contact text;
  v_is_admin boolean := coalesce(public.kigh_is_elevated_admin(), false);
begin
  if tg_table_name = 'fundraisers' then
    v_email := nullif(lower(trim(new.organizer_email)), '');
    v_contact := nullif(trim(new.organizer_contact), '');
    if v_email is null and public.kigh_is_email(v_contact) then
      v_email := lower(trim(v_contact));
    end if;

    if tg_op = 'INSERT' and not v_is_admin then
      if coalesce(new.funding_mode, 'external') <> 'external' then
        raise exception 'fundraiser_must_be_independent'
          using errcode = '23514',
                hint = 'Community fundraisers use the organizer''s own donation page. Only KIGH admins can run a fundraiser through KIGH.';
      end if;
      if coalesce(trim(new.donation_url), '') !~* '^https://[^\s/]+\.[^\s]+' then
        raise exception 'donation_link_required' using errcode = '23514';
      end if;
      if v_email is null or not public.kigh_is_email(v_email) then
        raise exception 'organizer_email_required' using errcode = '23514';
      end if;
    end if;

    new.organizer_email := null;
    new.organizer_contact := null;
  elsif tg_table_name = 'announcements' then
    v_email := nullif(lower(trim(new.submitter_email)), '');
    if v_email is not null and not public.kigh_is_email(v_email) then
      raise exception 'submitter_email_invalid' using errcode = '23514';
    end if;
    new.submitter_email := null;
  else
    return new;
  end if;

  if v_email is not null or v_contact is not null then
    insert into public.kigh_submission_private (source_table, record_id, email, contact)
    values (tg_table_name, new.id, v_email, v_contact)
    on conflict (source_table, record_id) do update
      set email = coalesce(excluded.email, kigh_submission_private.email),
          contact = coalesce(excluded.contact, kigh_submission_private.contact),
          updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function public.kigh_is_email(text) from public, anon, authenticated;
revoke all on function public.kigh_capture_submission_private() from public, anon, authenticated;

-- Existing fundraiser contacts move before the trigger exists, so this
-- update is the only place they are read from the public row.
insert into public.kigh_submission_private (source_table, record_id, email, contact)
select 'fundraisers', f.id,
       case when public.kigh_is_email(f.organizer_contact) then lower(trim(f.organizer_contact)) end,
       nullif(trim(f.organizer_contact), '')
from public.fundraisers f
where nullif(trim(f.organizer_contact), '') is not null
on conflict (source_table, record_id) do update
  set email = coalesce(kigh_submission_private.email, excluded.email),
      contact = coalesce(kigh_submission_private.contact, excluded.contact),
      updated_at = now();

update public.fundraisers set organizer_contact = null where organizer_contact is not null;

drop trigger if exists kigh_capture_submission_private on public.fundraisers;
create trigger kigh_capture_submission_private
  before insert or update of organizer_contact, organizer_email on public.fundraisers
  for each row execute function public.kigh_capture_submission_private();

drop trigger if exists kigh_capture_submission_private on public.announcements;
create trigger kigh_capture_submission_private
  before insert or update of submitter_email on public.announcements
  for each row execute function public.kigh_capture_submission_private();

-- Belt and braces: whatever path writes a row, contacts never stay public.
alter table public.fundraisers drop constraint if exists fundraisers_contact_kept_private_chk;
alter table public.fundraisers
  add constraint fundraisers_contact_kept_private_chk
  check (organizer_contact is null and organizer_email is null);
alter table public.announcements drop constraint if exists announcements_email_kept_private_chk;
alter table public.announcements
  add constraint announcements_email_kept_private_chk check (submitter_email is null);

create or replace function public.kigh_delete_submission_private()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.kigh_submission_private
  where source_table = tg_table_name and record_id = old.id;
  return old;
end;
$$;

revoke all on function public.kigh_delete_submission_private() from public, anon, authenticated;

drop trigger if exists kigh_delete_submission_private on public.fundraisers;
create trigger kigh_delete_submission_private
  after delete on public.fundraisers
  for each row execute function public.kigh_delete_submission_private();
drop trigger if exists kigh_delete_submission_private on public.announcements;
create trigger kigh_delete_submission_private
  after delete on public.announcements
  for each row execute function public.kigh_delete_submission_private();

-- ─── 4. Public fundraisers are independent ─────────────────
-- Replaces the 083 policy. The capture trigger gives the friendly errors;
-- this is the server-side rule if anything ever slips past it.
drop policy if exists "Anyone can submit fundraisers" on public.fundraisers;
create policy "Anyone can submit fundraisers"
  on public.fundraisers
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and verification_status = 'unverified'
    and published_at is null
    and funding_mode = 'external'
    and donation_url is not null
  );

-- ─── 5. Email: generic sender + notice settings ────────────
alter table public.kigh_admin_alert_settings
  add column if not exists notice_from_address text not null
    default 'Kenyans in Greater Houston <info@kenyansingreaterhouston.org>';
alter table public.kigh_admin_alert_settings
  add column if not exists notice_reply_to text not null default 'kenyansinhouston@gmail.com';

alter table public.kigh_admin_alert_emails add column if not exists recipient text;
alter table public.kigh_admin_alert_emails drop constraint if exists kigh_admin_alert_emails_kind_check;
alter table public.kigh_admin_alert_emails
  add constraint kigh_admin_alert_emails_kind_check check (kind in ('alert', 'digest', 'notice'));

create or replace function public.kigh_queue_email(
  p_kind text,
  p_to text[],
  p_subject text,
  p_html text,
  p_text text,
  p_item_count int default 0,
  p_reply_to text default null,
  p_from text default null,
  p_bcc text[] default null
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
  if coalesce(array_length(p_to, 1), 0) = 0 then
    return null;
  end if;

  v_body := jsonb_build_object(
    'from', coalesce(p_from, v_settings.from_address),
    'to', to_jsonb(p_to),
    'subject', left(p_subject, 180),
    'html', p_html,
    'text', p_text);
  if p_reply_to is not null then
    v_body := v_body || jsonb_build_object('reply_to', p_reply_to);
  end if;
  if coalesce(array_length(p_bcc, 1), 0) > 0 then
    v_body := v_body || jsonb_build_object('bcc', to_jsonb(p_bcc));
  end if;

  insert into public.kigh_admin_alert_emails (kind, subject, item_count, recipient)
  values (p_kind, left(p_subject, 180), p_item_count, array_to_string(p_to, ', '))
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

revoke all on function public.kigh_queue_email(text, text[], text, text, text, int, text, text, text[]) from public, anon, authenticated;

-- Admin alerts and digests now go through the generic sender.
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
begin
  select * into v_settings from public.kigh_admin_alert_settings where id;
  if not found then
    return null;
  end if;
  return public.kigh_queue_email(
    p_kind, v_settings.recipients, p_subject, p_html, p_text, p_item_count,
    p_reply_to, v_settings.from_address, null);
end;
$$;

revoke all on function public.kigh_queue_admin_email(text, text, text, text, int, text) from public, anon, authenticated;

-- Plain text -> escaped HTML paragraphs (blank line = new paragraph).
create or replace function public.kigh_text_to_html(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select string_agg(
    '<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1f2937">'
      || replace(public.kigh_html(para), E'\n', '<br>') || '</p>', '')
  from unnest(regexp_split_to_array(trim(coalesce(p, '')), E'\\n\\s*\\n')) para
  where trim(para) <> '';
$$;

-- Wraps a message to a member of the public in the KIGH letterhead.
create or replace function public.kigh_notice_html(p_text text, p_button_label text default null, p_button_url text default null)
returns text
language sql
immutable
set search_path = public
as $$
  select '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto">'
    || '<div style="font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#166534;margin-bottom:18px">Kenyans in Greater Houston</div>'
    || public.kigh_text_to_html(p_text)
    || case when p_button_url is not null then
         '<p style="margin:20px 0"><a href="' || public.kigh_html(p_button_url) || '" style="display:inline-block;background:#166534;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:15px">'
         || public.kigh_html(coalesce(p_button_label, 'Open')) || '</a></p>'
       else '' end
    || '<p style="margin:24px 0 0;font-size:12px;color:#6b7280">Kenyans in Greater Houston · kenyansingreaterhouston.org</p></div>';
$$;

revoke all on function public.kigh_text_to_html(text) from public, anon, authenticated;
revoke all on function public.kigh_notice_html(text, text, text) from public, anon, authenticated;

-- ─── 6. Organizer manage link ──────────────────────────────
create or replace function public.kigh_token_hash(p_token text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

revoke all on function public.kigh_token_hash(text) from public, anon, authenticated;

-- Issues a fresh link (any older link stops working) and, when asked and an
-- email is on file, emails it. Returns {url, emailed, email}.
create or replace function public.kigh_issue_fundraiser_manage_link(p_id uuid, p_send boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f record;
  v_site text;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_url text;
  v_email text;
  v_settings public.kigh_admin_alert_settings%rowtype;
  v_email_id bigint;
  v_text text;
begin
  select id, title, slug, organizer_name, funding_mode, status into f
  from public.fundraisers where id = p_id;
  if not found then
    raise exception 'fundraiser_not_found' using errcode = 'P0002';
  end if;
  if f.funding_mode = 'internal' then
    raise exception 'internal_fundraisers_are_tallied_by_kigh' using errcode = '22023';
  end if;

  select * into v_settings from public.kigh_admin_alert_settings where id;
  v_site := rtrim(coalesce(v_settings.site_url, 'https://www.kenyansingreaterhouston.org'), '/');
  v_url := v_site || '/community-support/manage#' || v_token;

  insert into public.kigh_submission_private (source_table, record_id, manage_token_hash, manage_token_created_at)
  values ('fundraisers', f.id, public.kigh_token_hash(v_token), now())
  on conflict (source_table, record_id) do update
    set manage_token_hash = excluded.manage_token_hash,
        manage_token_created_at = excluded.manage_token_created_at,
        updated_at = now();

  select email into v_email from public.kigh_submission_private
  where source_table = 'fundraisers' and record_id = f.id;

  if p_send and public.kigh_is_email(v_email) then
    v_text := 'Hello ' || coalesce(nullif(split_part(trim(f.organizer_name), ' ', 1), ''), 'there') || ','
      || E'\n\n' || 'Your fundraiser "' || f.title || '" is listed on the Kenyans in Greater Houston website'
      || case when f.status = 'published' then ': ' || v_site || '/community-support/' || f.slug else '.' end
      || E'\n\n' || 'This is an independent fundraiser. KIGH lists it for the community but does not collect or hold the money, so you keep the total up to date. Use your private link below to update the amount raised so far, or to close donations when you are done.'
      || E'\n\n' || 'Keep this link to yourself: anyone who has it can update your fundraiser. If it ever leaks, reply to this email and we will send you a new one.'
      || E'\n\n' || 'Thank you for supporting our community.';
    v_email_id := public.kigh_queue_email(
      'notice',
      array[v_email],
      'Your fundraiser on KIGH: ' || f.title,
      public.kigh_notice_html(v_text, 'Update my fundraiser', v_url),
      v_text || E'\n\n' || 'Update my fundraiser: ' || v_url,
      1,
      v_settings.notice_reply_to,
      v_settings.notice_from_address,
      null);
  end if;

  return jsonb_build_object('url', v_url, 'emailed', v_email_id is not null, 'email', v_email);
end;
$$;

revoke all on function public.kigh_issue_fundraiser_manage_link(uuid, boolean) from public, anon, authenticated;

-- Admin button: re-issue (and optionally email) the organizer's link.
create or replace function public.kigh_admin_fundraiser_manage_link(p_id uuid, p_send boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.kigh_issue_fundraiser_manage_link(p_id, p_send);
end;
$$;

revoke all on function public.kigh_admin_fundraiser_manage_link(uuid, boolean) from public, anon;
grant execute on function public.kigh_admin_fundraiser_manage_link(uuid, boolean) to authenticated;

-- Publishing an independent fundraiser sends the organizer their link once;
-- switching a fundraiser to KIGH-run revokes it. Never blocks the update.
create or replace function public.kigh_fundraiser_manage_link_on_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.funding_mode = 'internal' then
    update public.kigh_submission_private
      set manage_token_hash = null, manage_token_created_at = null, updated_at = now()
      where source_table = 'fundraisers' and record_id = new.id and manage_token_hash is not null;
  elsif new.status = 'published' and old.status is distinct from 'published'
        and not exists (
          select 1 from public.kigh_submission_private
          where source_table = 'fundraisers' and record_id = new.id and manage_token_hash is not null) then
    perform public.kigh_issue_fundraiser_manage_link(new.id, true);
  end if;
  return null;
exception when others then
  raise warning 'kigh manage link skipped for fundraiser %: %', new.id, sqlerrm;
  return null;
end;
$$;

revoke all on function public.kigh_fundraiser_manage_link_on_change() from public, anon, authenticated;

drop trigger if exists kigh_fundraiser_manage_link on public.fundraisers;
create trigger kigh_fundraiser_manage_link
  after update of status, funding_mode on public.fundraisers
  for each row execute function public.kigh_fundraiser_manage_link_on_change();

-- What the organizer sees on the manage page. Null for an unknown token.
create or replace function public.fundraiser_manage_get(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select jsonb_build_object(
    'title', f.title,
    'slug', f.slug,
    'status', f.status,
    'goal_amount', f.goal_amount,
    'raised_amount', f.raised_amount,
    'collections_updated_at', f.collections_updated_at,
    'donations_closed', f.donations_closed,
    'donation_url', f.donation_url,
    'can_update', f.funding_mode = 'external' and f.status::text in ('pending', 'published'))
  into v
  from public.kigh_submission_private p
  join public.fundraisers f on f.id = p.record_id
  where p.source_table = 'fundraisers'
    and p.manage_token_hash = public.kigh_token_hash(p_token);
  return v;
end;
$$;

revoke all on function public.fundraiser_manage_get(text) from public;
grant execute on function public.fundraiser_manage_get(text) to anon, authenticated;

create or replace function public.fundraiser_manage_update(
  p_token text, p_raised_amount numeric, p_donations_closed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_mode text;
  v_status text;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_manage_link' using errcode = '28000';
  end if;
  select f.id, f.funding_mode, f.status::text into v_id, v_mode, v_status
  from public.kigh_submission_private p
  join public.fundraisers f on f.id = p.record_id
  where p.source_table = 'fundraisers'
    and p.manage_token_hash = public.kigh_token_hash(p_token)
  for update of f;
  if v_id is null then
    raise exception 'invalid_manage_link' using errcode = '28000';
  end if;
  if v_mode <> 'external' or v_status not in ('pending', 'published') then
    raise exception 'fundraiser_not_editable' using errcode = '22023';
  end if;
  if p_raised_amount is null or p_raised_amount < 0 or p_raised_amount > 10000000 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  update public.fundraisers
    set raised_amount = round(p_raised_amount, 2),
        collections_updated_at = now(),
        donations_closed = coalesce(p_donations_closed, donations_closed),
        updated_at = now()
    where id = v_id;

  return public.fundraiser_manage_get(p_token);
end;
$$;

revoke all on function public.fundraiser_manage_update(text, numeric, boolean) from public;
grant execute on function public.fundraiser_manage_update(text, numeric, boolean) to anon, authenticated;

-- ─── 7. Reject with a note, emailed to the submitter ───────
-- Returns {title, email, phone, emailed, message} so the admin page can fall
-- back to WhatsApp / text when there is no email on file. p_email lets the
-- admin send to an address they found elsewhere; for fundraisers and
-- announcements it is also saved as the submitter's email.
create or replace function public.kigh_reject_submission(
  p_table text, p_id uuid, p_note text, p_notify boolean default true, p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note text := nullif(trim(p_note), '');
  v_row jsonb;
  v_title text;
  v_name text;
  v_email text;
  v_phone text;
  v_kind text;
  v_resubmit text;
  v_settings public.kigh_admin_alert_settings%rowtype;
  v_site text;
  v_text text;
  v_email_id bigint;
  v_private record;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_table not in ('fundraisers', 'events', 'announcements', 'businesses') then
    raise exception 'unsupported_submission_type' using errcode = '22023';
  end if;
  if v_note is null or char_length(v_note) < 3 then
    raise exception 'rejection_note_required' using errcode = '22023';
  end if;
  if char_length(v_note) > 2000 then
    raise exception 'rejection_note_too_long' using errcode = '22023';
  end if;
  if nullif(trim(p_email), '') is not null and not public.kigh_is_email(p_email) then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  execute format(
    'update public.%I set status = ''rejected'', published_at = null, updated_at = now(),
       rejection_note = $1, rejected_at = now(), rejected_by = auth.uid()
     where id = $2 returning to_jsonb(%I.*)', p_table, p_table)
    using v_note, p_id
    into v_row;
  if v_row is null then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;

  if p_table = 'fundraisers' then
    update public.fundraisers set is_homepage_featured = false where id = p_id and is_homepage_featured;
  end if;

  select * into v_settings from public.kigh_admin_alert_settings where id;
  v_site := rtrim(coalesce(v_settings.site_url, 'https://www.kenyansingreaterhouston.org'), '/');

  v_title := coalesce(v_row ->> 'title', v_row ->> 'name', 'your submission');
  case p_table
    when 'fundraisers' then
      v_kind := 'fundraiser'; v_resubmit := '/community-support/submit';
      v_name := v_row ->> 'organizer_name';
    when 'events' then
      v_kind := 'event'; v_resubmit := '/events/submit';
      v_name := v_row ->> 'organizer_name';
      v_email := coalesce(
        case when public.kigh_is_email(v_row ->> 'organizer_email') then v_row ->> 'organizer_email' end,
        case when public.kigh_is_email(v_row ->> 'organizer_contact') then v_row ->> 'organizer_contact' end);
      if not public.kigh_is_email(v_row ->> 'organizer_contact') then
        v_phone := v_row ->> 'organizer_contact';
      end if;
    when 'announcements' then
      v_kind := 'announcement'; v_resubmit := '/announcements/submit';
      v_name := v_row ->> 'author_name';
    when 'businesses' then
      v_kind := 'business listing'; v_resubmit := '/businesses/submit';
      v_name := v_row ->> 'owner_name';
      v_email := case when public.kigh_is_email(v_row ->> 'email') then v_row ->> 'email' end;
      v_phone := v_row ->> 'phone';
  end case;

  if p_table in ('fundraisers', 'announcements') then
    select email, contact into v_private from public.kigh_submission_private
    where source_table = p_table and record_id = p_id;
    if found then
      v_email := case when public.kigh_is_email(v_private.email) then v_private.email end;
      if not public.kigh_is_email(v_private.contact) then
        v_phone := v_private.contact;
      end if;
    end if;
  end if;

  if nullif(trim(p_email), '') is not null then
    v_email := lower(trim(p_email));
    if p_table in ('fundraisers', 'announcements') then
      insert into public.kigh_submission_private (source_table, record_id, email)
      values (p_table, p_id, v_email)
      on conflict (source_table, record_id) do update
        set email = excluded.email, updated_at = now();
    end if;
  end if;

  v_text := 'Hello ' || coalesce(nullif(split_part(trim(coalesce(v_name, '')), ' ', 1), ''), 'there') || ','
    || E'\n\n' || 'Thank you for submitting your ' || v_kind || ' "' || v_title || '" to Kenyans in Greater Houston. After review, we are not able to publish it as submitted.'
    || E'\n\n' || 'Note from the KIGH team:' || E'\n' || v_note
    || E'\n\n' || 'You are welcome to make changes and submit again at ' || v_site || v_resubmit || '. If you have questions, just reply to this email.'
    || E'\n\n' || 'Kenyans in Greater Houston';

  if p_notify and v_email is not null then
    v_email_id := public.kigh_queue_email(
      'notice',
      array[v_email],
      'About your ' || v_kind || ' submission: ' || v_title,
      public.kigh_notice_html(v_text),
      v_text,
      1,
      v_settings.notice_reply_to,
      v_settings.notice_from_address,
      v_settings.recipients);
  end if;

  return jsonb_build_object(
    'title', v_title,
    'name', v_name,
    'email', v_email,
    'phone', nullif(trim(coalesce(v_phone, '')), ''),
    'emailed', v_email_id is not null,
    'message', v_text);
end;
$$;

revoke all on function public.kigh_reject_submission(text, uuid, text, boolean, text) from public, anon;
grant execute on function public.kigh_reject_submission(text, uuid, text, boolean, text) to authenticated;

-- ─── 8. Admin alerts keep the contact details ──────────────
-- The capture trigger blanks contacts before the alert trigger sees the row,
-- so the alert reads them back from the private store.
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
  v_private record;
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

  if tg_table_name in ('fundraisers', 'announcements') then
    select email, contact into v_private from public.kigh_submission_private
    where source_table = tg_table_name and record_id = new.id;
    if found then
      j := j || jsonb_strip_nulls(jsonb_build_object(
        'email', v_private.email,
        'phone', case when not public.kigh_is_email(v_private.contact) then v_private.contact end));
    end if;
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
