-- ============================================================
-- 088 — Throttle public submissions
-- ============================================================
-- The public forms write straight to Supabase with the anon key, so a bot
-- can skip the website (and its edge filter and honeypots) and post to the
-- REST API in a loop. Row checks stop malformed rows, not floods.
--
-- This adds a BEFORE INSERT trigger on every table a visitor can write
-- to. Each insert is counted per table, per client IP (hashed), over a
-- rolling hour, plus a whole-table ceiling as a backstop against bots that
-- rotate IPs. Over the limit, the insert fails with `rate_limited`, which
-- the forms turn into a "wait an hour" message (src/lib/formBotGuard.ts).
--
-- Fails open where it can't judge: no client IP in the request (database
-- jobs, auth hooks, the SQL editor) means no throttle. Elevated admins and
-- the service role are never throttled.
--
-- community_group_join_requests already has its own daily limit (079) and
-- membership / chat require a signed-in account, so they are not covered.
-- Idempotent.

-- ─── 1. Log of recent submissions ──────────────────────────
create table if not exists public.kigh_submission_throttle (
  id bigint generated always as identity primary key,
  bucket text not null,
  client_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists kigh_submission_throttle_lookup
  on public.kigh_submission_throttle (bucket, client_hash, created_at);
create index if not exists kigh_submission_throttle_bucket_time
  on public.kigh_submission_throttle (bucket, created_at);

alter table public.kigh_submission_throttle enable row level security;
-- No policies: only the trigger function below (security definer) touches it.
revoke all on public.kigh_submission_throttle from anon, authenticated;

comment on table public.kigh_submission_throttle is
  'Rolling one-hour log of public inserts used by kigh_throttle_public_insert(). IPs are stored as md5 hashes; rows older than a day are pruned.';

-- ─── 2. Client IP from the PostgREST request ───────────────
create or replace function public.kigh_request_client_ip()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_headers json;
begin
  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then
    return null;
  end;
  if v_headers is null then
    return null;
  end if;
  -- Supabase sits behind Cloudflare, which overwrites cf-connecting-ip, so
  -- a client cannot forge it. x-forwarded-for is the fallback.
  return nullif(trim(coalesce(
    v_headers ->> 'cf-connecting-ip',
    v_headers ->> 'x-real-ip',
    split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)
  )), '');
end;
$$;

revoke all on function public.kigh_request_client_ip() from public;

-- ─── 3. Trigger: count, then allow or refuse ───────────────
-- TG_ARGV[0] = per-IP inserts allowed per hour
-- TG_ARGV[1] = inserts allowed per hour across all IPs (0 = no ceiling)
create or replace function public.kigh_throttle_public_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text;
  v_hash text;
  v_per_ip int := TG_ARGV[0]::int;
  v_ceiling int := coalesce(TG_ARGV[1], '0')::int;
  v_since timestamptz := now() - interval '1 hour';
  v_count int;
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
    return new;
  end if;

  v_ip := public.kigh_request_client_ip();
  if v_ip is null then
    return new;
  end if;
  v_hash := md5(TG_TABLE_NAME || ':' || v_ip);

  select count(*) into v_count
  from public.kigh_submission_throttle
  where bucket = TG_TABLE_NAME and client_hash = v_hash and created_at > v_since;
  if v_count >= v_per_ip then
    raise exception 'rate_limited' using errcode = 'P0001',
      hint = 'Too many submissions from this connection. Try again in an hour.';
  end if;

  if v_ceiling > 0 then
    select count(*) into v_count
    from public.kigh_submission_throttle
    where bucket = TG_TABLE_NAME and created_at > v_since;
    if v_count >= v_ceiling then
      raise exception 'rate_limited' using errcode = 'P0001',
        hint = 'This form is receiving unusual traffic. Try again in an hour.';
    end if;
  end if;

  insert into public.kigh_submission_throttle (bucket, client_hash)
  values (TG_TABLE_NAME, v_hash);

  -- Prune now and then rather than on a schedule.
  if random() < 0.02 then
    delete from public.kigh_submission_throttle
    where created_at < now() - interval '1 day';
  end if;

  return new;
end;
$$;

revoke all on function public.kigh_throttle_public_insert() from public;

-- ─── 4. Attach to every visitor-writable table ─────────────
-- Listings and messages: rare, reviewed by admins before publishing.
drop trigger if exists kigh_throttle_public_insert on public.events;
create trigger kigh_throttle_public_insert before insert on public.events
  for each row execute function public.kigh_throttle_public_insert('10', '200');

drop trigger if exists kigh_throttle_public_insert on public.announcements;
create trigger kigh_throttle_public_insert before insert on public.announcements
  for each row execute function public.kigh_throttle_public_insert('10', '200');

drop trigger if exists kigh_throttle_public_insert on public.businesses;
create trigger kigh_throttle_public_insert before insert on public.businesses
  for each row execute function public.kigh_throttle_public_insert('10', '200');

drop trigger if exists kigh_throttle_public_insert on public.fundraisers;
create trigger kigh_throttle_public_insert before insert on public.fundraisers
  for each row execute function public.kigh_throttle_public_insert('10', '200');

drop trigger if exists kigh_throttle_public_insert on public.community_groups;
create trigger kigh_throttle_public_insert before insert on public.community_groups
  for each row execute function public.kigh_throttle_public_insert('10', '200');

drop trigger if exists kigh_throttle_public_insert on public.contact_submissions;
create trigger kigh_throttle_public_insert before insert on public.contact_submissions
  for each row execute function public.kigh_throttle_public_insert('10', '200');

drop trigger if exists kigh_throttle_public_insert on public.service_interests;
create trigger kigh_throttle_public_insert before insert on public.service_interests
  for each row execute function public.kigh_throttle_public_insert('10', '200');

-- Event sign-ups: bursts after a WhatsApp share, often from one venue's wifi.
drop trigger if exists kigh_throttle_public_insert on public.event_volunteer_signups;
create trigger kigh_throttle_public_insert before insert on public.event_volunteer_signups
  for each row execute function public.kigh_throttle_public_insert('30', '600');

drop trigger if exists kigh_throttle_public_insert on public.event_vendor_signups;
create trigger kigh_throttle_public_insert before insert on public.event_vendor_signups
  for each row execute function public.kigh_throttle_public_insert('30', '600');

-- Page-view analytics: high volume by design; only stop a single source
-- from flooding the table.
drop trigger if exists kigh_throttle_public_insert on public.analytics_events;
create trigger kigh_throttle_public_insert before insert on public.analytics_events
  for each row execute function public.kigh_throttle_public_insert('1500', '0');
