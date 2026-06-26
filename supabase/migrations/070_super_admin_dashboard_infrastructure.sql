-- ============================================================
-- 070 — Super-admin dashboard infrastructure metrics RPC
-- ============================================================
-- Platform Operations section on /admin/dashboard (super_admin only).
-- Reuses public.kigh_is_platform_super_admin() from migration 013 as the
-- server-side super_admin gate (profiles.role = 'super_admin'; system-health
-- admins who are not super_admin are explicitly excluded).

-- ─── Infrastructure RPC (super_admin only) ───────────────────
create or replace function public.kigh_admin_dashboard_infrastructure()
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_checked_at timestamptz := now();
  v_db_bytes bigint;
  v_table_count bigint;
  v_analytics_bytes bigint;
  v_largest_tables jsonb;
  v_storage_buckets jsonb;
  v_storage_total_objects bigint := 0;
  v_storage_total_bytes bigint;
  v_storage_unavailable text := null;
  v_warnings jsonb := '[]'::jsonb;
  v_count bigint;
  v_page_views_24h bigint;
  v_analytics_threshold_warning bigint := 524288000;  -- 500 MB
  v_analytics_threshold_critical bigint := 1073741824; -- 1 GB
  v_storage_threshold_warning bigint := 5368709120; -- 5 GB
begin
  if auth.uid() is null or not public.kigh_is_platform_super_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select pg_database_size(current_database()) into v_db_bytes;

  select count(*)::bigint into v_table_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r';

  select coalesce(pg_total_relation_size(c.oid), 0)::bigint into v_analytics_bytes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'analytics_events'
    and c.relkind = 'r';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'schema_name', s.schema_name,
        'table_name', s.table_name,
        'row_estimate', s.row_estimate,
        'table_size_bytes', s.table_size_bytes,
        'index_size_bytes', s.index_size_bytes,
        'total_size_bytes', s.total_size_bytes,
        'total_size_pretty', pg_size_pretty(s.total_size_bytes)
      )
      order by s.total_size_bytes desc
    ),
    '[]'::jsonb
  )
  into v_largest_tables
  from (
    select
      n.nspname as schema_name,
      c.relname as table_name,
      greatest(coalesce(c.reltuples, 0)::bigint, 0) as row_estimate,
      pg_relation_size(c.oid)::bigint as table_size_bytes,
      pg_indexes_size(c.oid)::bigint as index_size_bytes,
      pg_total_relation_size(c.oid)::bigint as total_size_bytes
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
    order by pg_total_relation_size(c.oid) desc
    limit 10
  ) s;

  -- Storage: object counts always; byte totals only when metadata size is present.
  begin
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'bucket_id', b.bucket_id,
          'object_count', b.object_count,
          'total_size_bytes', b.total_size_bytes,
          'total_size_pretty', case
            when b.total_size_bytes is not null then pg_size_pretty(b.total_size_bytes)
            else null
          end,
          'unavailable_reason', case
            when b.total_size_bytes is null then 'Storage object byte size is not available from the current schema.'
            else null
          end
        )
        order by b.object_count desc, b.bucket_id
      ),
      '[]'::jsonb
    ),
    coalesce(sum(b.object_count), 0)::bigint,
    sum(b.total_size_bytes)
    into v_storage_buckets, v_storage_total_objects, v_storage_total_bytes
    from (
      select
        o.bucket_id,
        count(*)::bigint as object_count,
        sum(
          case
            when o.metadata ? 'size'
              and btrim(coalesce(o.metadata->>'size', '')) ~ '^[0-9]+$'
            then (o.metadata->>'size')::bigint
            else null
          end
        ) as total_size_bytes
      from storage.objects o
      group by o.bucket_id
    ) b;

    if v_storage_total_bytes is null then
      v_storage_unavailable := 'Storage object byte size is not available from the current schema.';
    end if;
  exception
    when insufficient_privilege then
      v_storage_buckets := '[]'::jsonb;
      v_storage_total_objects := 0;
      v_storage_total_bytes := null;
      v_storage_unavailable := 'Storage metadata is not accessible from the current database role.';
    when undefined_table then
      v_storage_buckets := '[]'::jsonb;
      v_storage_total_objects := 0;
      v_storage_total_bytes := null;
      v_storage_unavailable := 'Storage schema is not available in this environment.';
  end;

  -- ─── Warnings (real counts only) ───────────────────────────
  select count(*)::bigint into v_page_views_24h
  from public.analytics_events
  where event_type = 'page_view'
    and created_at >= v_checked_at - interval '24 hours';

  if v_page_views_24h = 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'warning',
      'title', 'No page views in the last 24 hours',
      'description', 'No page_view analytics events were recorded in the past 24 hours. Verify tracking or site traffic.',
      'count', 0,
      'route', '/admin/analytics',
      'checked_at', v_checked_at
    ));
  end if;

  select count(*)::bigint into v_count
  from public.events
  where status = 'pending'
    and created_at < v_checked_at - interval '7 days';
  if v_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'warning',
      'title', 'Stale pending events',
      'description', 'Events pending review for more than 7 days.',
      'count', v_count,
      'route', '/admin/submissions?status=pending',
      'checked_at', v_checked_at
    ));
  end if;

  select count(*)::bigint into v_count
  from public.announcements
  where status = 'pending'
    and created_at < v_checked_at - interval '7 days';
  if v_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'warning',
      'title', 'Stale pending announcements',
      'description', 'Announcements pending review for more than 7 days.',
      'count', v_count,
      'route', '/admin/submissions?status=pending',
      'checked_at', v_checked_at
    ));
  end if;

  select count(*)::bigint into v_count
  from public.businesses
  where status = 'pending'
    and created_at < v_checked_at - interval '7 days';
  if v_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'warning',
      'title', 'Stale pending businesses',
      'description', 'Business listings pending review for more than 7 days.',
      'count', v_count,
      'route', '/admin/submissions?status=pending',
      'checked_at', v_checked_at
    ));
  end if;

  select count(*)::bigint into v_count
  from public.fundraisers
  where status = 'pending'
    and created_at < v_checked_at - interval '7 days';
  if v_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'warning',
      'title', 'Stale pending fundraisers',
      'description', 'Fundraisers pending review for more than 7 days.',
      'count', v_count,
      'route', '/admin/submissions?status=pending',
      'checked_at', v_checked_at
    ));
  end if;

  select count(*)::bigint into v_count
  from public.contact_submissions
  where status = 'new'
    and created_at < v_checked_at - interval '3 days';
  if v_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'warning',
      'title', 'Unread contact messages aging',
      'description', 'New contact messages older than 3 days without a response.',
      'count', v_count,
      'route', '/admin/contacts?status=new',
      'checked_at', v_checked_at
    ));
  end if;

  select count(*)::bigint into v_count
  from public.gallery_images
  where status = 'pending'
    and created_at < v_checked_at - interval '7 days';
  if v_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'warning',
      'title', 'Stale pending gallery images',
      'description', 'Gallery images pending review for more than 7 days.',
      'count', v_count,
      'route', '/admin/gallery?tab=review',
      'checked_at', v_checked_at
    ));
  end if;

  select count(*)::bigint into v_count
  from public.member_media_submissions
  where status = 'pending'
    and created_at < v_checked_at - interval '7 days';
  if v_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'warning',
      'title', 'Stale pending media submissions',
      'description', 'Member media submissions pending review for more than 7 days.',
      'count', v_count,
      'route', '/admin/media-submissions?status=pending',
      'checked_at', v_checked_at
    ));
  end if;

  select count(*)::bigint into v_count
  from public.announcements
  where status = 'published'
    and expires_at is not null
    and expires_at < v_checked_at;
  if v_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'critical',
      'title', 'Expired published announcements',
      'description', 'Published announcements with an expires_at date in the past should be archived or updated.',
      'count', v_count,
      'route', '/admin/announcements',
      'checked_at', v_checked_at
    ));
  end if;

  if coalesce(v_analytics_bytes, 0) >= v_analytics_threshold_critical then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'critical',
      'title', 'Analytics events table is very large',
      'description', 'The analytics_events table exceeds 1 GB. Consider retention or archival.',
      'count', 1,
      'route', '/admin/analytics',
      'checked_at', v_checked_at
    ));
  elsif coalesce(v_analytics_bytes, 0) >= v_analytics_threshold_warning then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'warning',
      'title', 'Analytics events table is growing',
      'description', 'The analytics_events table exceeds 500 MB. Monitor growth and plan retention.',
      'count', 1,
      'route', '/admin/analytics',
      'checked_at', v_checked_at
    ));
  end if;

  if v_storage_total_bytes is not null and v_storage_total_bytes >= v_storage_threshold_warning then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'severity', 'warning',
      'title', 'Storage usage is high',
      'description', 'Total tracked storage object size exceeds 5 GB across buckets.',
      'count', coalesce(v_storage_total_objects, 0),
      'route', '/admin/system-health',
      'checked_at', v_checked_at
    ));
  end if;

  return jsonb_build_object(
    'checked_at', v_checked_at,
    'database', jsonb_build_object(
      'database_size_bytes', v_db_bytes,
      'database_size_pretty', pg_size_pretty(v_db_bytes),
      'table_count', coalesce(v_table_count, 0),
      'analytics_events_size_bytes', v_analytics_bytes,
      'analytics_events_size_pretty', pg_size_pretty(coalesce(v_analytics_bytes, 0)),
      'notes', 'Row counts in largest_tables are planner estimates (reltuples), not exact counts.'
    ),
    'largest_tables', coalesce(v_largest_tables, '[]'::jsonb),
    'storage', jsonb_build_object(
      'buckets', coalesce(v_storage_buckets, '[]'::jsonb),
      'total_object_count', coalesce(v_storage_total_objects, 0),
      'total_size_bytes', v_storage_total_bytes,
      'total_size_pretty', case
        when v_storage_total_bytes is not null then pg_size_pretty(v_storage_total_bytes)
        else null
      end,
      'unavailable_reason', v_storage_unavailable
    ),
    'warnings', coalesce(v_warnings, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.kigh_admin_dashboard_infrastructure() from public;
grant execute on function public.kigh_admin_dashboard_infrastructure() to authenticated;

comment on function public.kigh_admin_dashboard_infrastructure() is
  'Super-admin-only infrastructure snapshot for /admin/dashboard Platform Operations. '
  'Uses kigh_is_platform_super_admin(); does not expose raw logs or PII fields.';
