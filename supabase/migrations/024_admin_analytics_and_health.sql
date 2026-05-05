-- ============================================================
-- 024 — Admin analytics events + secure admin RPCs + platform_admin
-- ============================================================
-- Adds `platform_admin` as an elevated role (platform operations).
-- Adds `public.analytics_events` for privacy-safe engagement telemetry.
-- Adds SECURITY DEFINER RPCs for admin dashboards; system health RPC
-- is restricted to super_admin + platform_admin only (server-side).

-- ─── 1. Elevated role: platform_admin ───────────────────────
create or replace function public.kigh_is_elevated_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(trim(p.role), '') in (
        'super_admin',
        'platform_admin',
        'community_admin',
        'admin',
        'content_manager',
        'membership_manager',
        'treasurer',
        'media_moderator',
        'ads_manager',
        'business_admin',
        'support_admin',
        'moderator'
      )
  );
$$;

revoke all on function public.kigh_is_elevated_admin() from public;
grant execute on function public.kigh_is_elevated_admin() to authenticated, anon;

-- ─── 2. System Health gate (super_admin OR platform_admin) ───
create or replace function public.kigh_is_system_health_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(trim(p.role), '') in ('super_admin', 'platform_admin')
  );
$$;

revoke all on function public.kigh_is_system_health_admin() from public;
grant execute on function public.kigh_is_system_health_admin() to authenticated, anon;

-- ─── 3. profiles.role guard: allow assigning platform_admin ───
create or replace function public.kigh_profiles_role_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_caller_is_admin boolean;
  v_old_role text;
  v_elevated text[] := array[
    'super_admin',
    'platform_admin',
    'community_admin',
    'admin',
    'content_manager',
    'membership_manager',
    'treasurer',
    'media_moderator',
    'ads_manager',
    'business_admin',
    'support_admin',
    'moderator'
  ];
begin
  if v_uid is null then
    return new;
  end if;

  v_caller_is_admin := public.kigh_is_elevated_admin();

  if tg_op = 'INSERT' then
    if not v_caller_is_admin and new.role = any(v_elevated) then
      new.role := 'member';
    end if;
  elsif tg_op = 'UPDATE' then
    v_old_role := coalesce(old.role, 'member');
    if new.role is distinct from v_old_role and not v_caller_is_admin then
      new.role := v_old_role;
    end if;
  end if;

  return new;
end;
$$;

-- ─── 4. analytics_events ────────────────────────────────────
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_type text not null,
  path text,
  entity_table text,
  entity_id uuid,
  label text,
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  session_id text,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_name_len check (char_length(event_name) between 1 and 120),
  constraint analytics_events_event_type_len check (char_length(event_type) between 1 and 64),
  constraint analytics_events_path_len check (path is null or char_length(path) <= 2048),
  constraint analytics_events_label_len check (label is null or char_length(label) <= 200),
  constraint analytics_events_session_len check (session_id is null or char_length(session_id) <= 80),
  constraint analytics_events_entity_table_len check (entity_table is null or char_length(entity_table) <= 64),
  constraint analytics_events_event_type_allowed check (
    event_type in (
      'page_view',
      'cta_click',
      'entity_view',
      'entity_click',
      'login',
      'submission_created',
      'map_open'
    )
  ),
  constraint analytics_events_metadata_size check (octet_length(metadata::text) <= 4096)
);

create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_type_created_idx on public.analytics_events (event_type, created_at desc);
create index if not exists analytics_events_entity_idx on public.analytics_events (entity_table, entity_id);

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events insert public" on public.analytics_events;
create policy "analytics_events insert public"
  on public.analytics_events for insert
  to anon, authenticated
  with check (
    (
      (auth.uid() is null and user_id is null)
      or (auth.uid() is not null and (user_id is null or user_id = auth.uid()))
    )
    and (
      entity_table is null
      or btrim(entity_table) = ''
      or entity_table ~ '^[a-z0-9_]{1,64}$'
    )
  );

drop policy if exists "analytics_events select elevated" on public.analytics_events;
create policy "analytics_events select elevated"
  on public.analytics_events for select
  to authenticated
  using (public.kigh_is_elevated_admin());

drop policy if exists "analytics_events no update" on public.analytics_events;
create policy "analytics_events no update"
  on public.analytics_events for update
  using (false)
  with check (false);

drop policy if exists "analytics_events no delete" on public.analytics_events;
create policy "analytics_events no delete"
  on public.analytics_events for delete
  using (false);

grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;

-- ─── 5. Admin analytics RPCs (elevated admins) ──────────────
create or replace function public.kigh_admin_analytics_summary(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 366));
  v_from timestamptz := now() - (v_days || ' days')::interval;
  v jsonb;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'period_days', v_days,
    'period_from', v_from,
    'checked_at', now(),
    'page_views', count(*) filter (where event_type = 'page_view'),
    'cta_clicks', count(*) filter (where event_type = 'cta_click'),
    'entity_views', count(*) filter (where event_type = 'entity_view'),
    'entity_clicks', count(*) filter (where event_type = 'entity_click'),
    'logins', count(*) filter (where event_type = 'login'),
    'map_opens', count(*) filter (where event_type = 'map_open'),
    'submissions_logged', count(*) filter (where event_type = 'submission_created')
  ) into v
  from public.analytics_events
  where created_at >= v_from;

  return v;
end;
$$;

revoke all on function public.kigh_admin_analytics_summary(integer) from public;
grant execute on function public.kigh_admin_analytics_summary(integer) to authenticated;

create or replace function public.kigh_admin_login_counts(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 366));
  v_from timestamptz := now() - (v_days || ' days')::interval;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(x) order by x.day)
      from (
        select (created_at at time zone 'utc')::date as day,
          count(*)::bigint as logins
        from public.analytics_events
        where created_at >= v_from
          and event_type = 'login'
        group by 1
        order by 1
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.kigh_admin_login_counts(integer) from public;
grant execute on function public.kigh_admin_login_counts(integer) to authenticated;

create or replace function public.kigh_admin_top_clicks(p_days integer default 30, p_limit integer default 25)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 366));
  v_lim integer := greatest(1, least(coalesce(p_limit, 25), 100));
  v_from timestamptz := now() - (v_days || ' days')::interval;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(x) order by x.c desc)
      from (
        select coalesce(nullif(trim(event_name), ''), '(unnamed)') as event_name,
          coalesce(path, '') as path,
          count(*)::bigint as c
        from public.analytics_events
        where created_at >= v_from
          and event_type in ('cta_click', 'entity_click')
        group by 1, 2
        order by c desc
        limit v_lim
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.kigh_admin_top_clicks(integer, integer) from public;
grant execute on function public.kigh_admin_top_clicks(integer, integer) to authenticated;

create or replace function public.kigh_admin_engagement_by_week(p_weeks integer default 8)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_weeks integer := greatest(1, least(coalesce(p_weeks, 8), 52));
  v_from timestamptz := date_trunc('week', now()) - ((v_weeks - 1) || ' weeks')::interval;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(x) order by x.week_start)
      from (
        select date_trunc('week', ae.created_at)::date as week_start,
          count(*) filter (where ae.event_type = 'page_view')::bigint as page_views,
          count(*) filter (where ae.event_type in ('cta_click', 'entity_click'))::bigint as clicks,
          count(*) filter (where ae.event_type = 'entity_view')::bigint as entity_views,
          count(*) filter (where ae.event_type = 'login')::bigint as logins,
          count(*) filter (where ae.event_type = 'submission_created')::bigint as submissions
        from public.analytics_events ae
        where ae.created_at >= v_from
        group by 1
        order by 1
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.kigh_admin_engagement_by_week(integer) from public;
grant execute on function public.kigh_admin_engagement_by_week(integer) to authenticated;

create or replace function public.kigh_admin_member_growth_by_week(p_weeks integer default 8)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_weeks integer := greatest(1, least(coalesce(p_weeks, 8), 52));
  v_from timestamptz := date_trunc('week', now()) - ((v_weeks - 1) || ' weeks')::interval;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(x) order by x.week_start)
      from (
        select date_trunc('week', p.created_at)::date as week_start,
          count(*)::bigint as new_profiles
        from public.profiles p
        where p.created_at >= v_from
        group by 1
        order by 1
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.kigh_admin_member_growth_by_week(integer) from public;
grant execute on function public.kigh_admin_member_growth_by_week(integer) to authenticated;

-- ─── 6. System health RPC (top-level platform admins only) ────
create or replace function public.kigh_admin_system_health()
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v jsonb;
  v_db_bytes bigint;
  v_audit_7d bigint;
  v_pending jsonb;
  v_storage jsonb;
  v_table_sizes jsonb;
begin
  if auth.uid() is null or not public.kigh_is_system_health_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select pg_database_size(current_database()) into v_db_bytes;

  select count(*) into v_audit_7d
  from public.audit_logs
  where created_at >= now() - interval '7 days';

  select jsonb_build_object(
    'events_pending', (select count(*)::bigint from public.events where status = 'pending'),
    'announcements_pending', (select count(*)::bigint from public.announcements where status = 'pending'),
    'businesses_pending', (select count(*)::bigint from public.businesses where status = 'pending'),
    'fundraisers_pending', (select count(*)::bigint from public.fundraisers where status = 'pending'),
    'gallery_images_pending', (select count(*)::bigint from public.gallery_images where status = 'pending'),
    'member_media_pending', (select count(*)::bigint from public.member_media_submissions where status = 'pending'),
    'members_pending', (select count(*)::bigint from public.members where membership_status = 'pending'),
    'contact_new', (select count(*)::bigint from public.contact_submissions where status = 'new')
  ) into v_pending;

  select coalesce(
    jsonb_agg(jsonb_build_object('bucket_id', b.bucket_id, 'object_count', b.c)),
    '[]'::jsonb
  )
  into v_storage
  from (
    select bucket_id, count(*)::bigint as c
    from storage.objects
    group by bucket_id
  ) b;

  select coalesce(
    jsonb_object_agg(relname, sz),
    '{}'::jsonb
  )
  into v_table_sizes
  from (
    select c.relname,
      pg_total_relation_size(c.oid)::bigint as sz
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'members', 'events', 'announcements', 'businesses', 'fundraisers',
        'gallery_images', 'contact_submissions', 'community_groups', 'resources',
        'profiles', 'analytics_events', 'audit_logs'
      )
  ) s;

  select jsonb_build_object(
    'checked_at', now(),
    'database_size_bytes', v_db_bytes,
    'table_row_counts', jsonb_build_object(
      'members', (select count(*)::bigint from public.members),
      'events', (select count(*)::bigint from public.events),
      'announcements', (select count(*)::bigint from public.announcements),
      'businesses', (select count(*)::bigint from public.businesses),
      'fundraisers', (select count(*)::bigint from public.fundraisers),
      'gallery_images', (select count(*)::bigint from public.gallery_images),
      'contact_submissions', (select count(*)::bigint from public.contact_submissions),
      'community_groups', (select count(*)::bigint from public.community_groups),
      'resources', (select count(*)::bigint from public.resources),
      'profiles', (select count(*)::bigint from public.profiles),
      'analytics_events', (select count(*)::bigint from public.analytics_events),
      'audit_logs', (select count(*)::bigint from public.audit_logs)
    ),
    'table_total_bytes', v_table_sizes,
    'storage_objects_by_bucket', v_storage,
    'pending_and_inbox_counts', v_pending,
    'audit_events_last_7_days', v_audit_7d
  ) into v;

  return v;
end;
$$;

revoke all on function public.kigh_admin_system_health() from public;
grant execute on function public.kigh_admin_system_health() to authenticated;
