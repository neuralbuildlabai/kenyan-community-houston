-- ============================================================
-- 069 — Admin dashboard analytics ranges (day / month / top pages / CTAs)
-- ============================================================
-- Dashboard-ready aggregates over public.analytics_events.
-- Excludes /admin traffic. Elevated admins only.

-- ─── 1. Engagement by day ───────────────────────────────────
create or replace function public.kigh_admin_engagement_by_day(p_days integer default 30)
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
      select jsonb_agg(to_jsonb(x) order by x.bucket_date)
      from (
        select (ae.created_at at time zone 'utc')::date as bucket_date,
          count(*) filter (where ae.event_type = 'page_view')::bigint as page_views,
          count(distinct ae.session_id) filter (
            where ae.session_id is not null and btrim(ae.session_id) <> ''
          )::bigint as unique_sessions,
          count(*) filter (
            where ae.event_type in ('cta_click', 'entity_click')
          )::bigint as clicks,
          count(*) filter (where ae.event_type = 'cta_click')::bigint as cta_clicks,
          count(*) filter (where ae.event_type = 'submission_created')::bigint as form_submissions,
          count(*) filter (where ae.event_type = 'login')::bigint as sign_ins
        from public.analytics_events ae
        where ae.created_at >= v_from
          and coalesce(ae.path, '') not like '/admin%'
        group by 1
        order by 1
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.kigh_admin_engagement_by_day(integer) from public;
grant execute on function public.kigh_admin_engagement_by_day(integer) to authenticated;

-- ─── 2. Engagement by month ─────────────────────────────────
create or replace function public.kigh_admin_engagement_by_month(p_months integer default 12)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_months integer := greatest(1, least(coalesce(p_months, 12), 24));
  v_from timestamptz := date_trunc('month', now()) - ((v_months - 1) || ' months')::interval;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(x) order by x.bucket_month)
      from (
        select date_trunc('month', ae.created_at at time zone 'utc')::date as bucket_month,
          count(*) filter (where ae.event_type = 'page_view')::bigint as page_views,
          count(distinct ae.session_id) filter (
            where ae.session_id is not null and btrim(ae.session_id) <> ''
          )::bigint as unique_sessions,
          count(*) filter (
            where ae.event_type in ('cta_click', 'entity_click')
          )::bigint as clicks,
          count(*) filter (where ae.event_type = 'cta_click')::bigint as cta_clicks,
          count(*) filter (where ae.event_type = 'submission_created')::bigint as form_submissions,
          count(*) filter (where ae.event_type = 'login')::bigint as sign_ins
        from public.analytics_events ae
        where ae.created_at >= v_from
          and coalesce(ae.path, '') not like '/admin%'
        group by 1
        order by 1
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.kigh_admin_engagement_by_month(integer) from public;
grant execute on function public.kigh_admin_engagement_by_month(integer) to authenticated;

-- ─── 3. Top pages ───────────────────────────────────────────
create or replace function public.kigh_admin_top_pages(
  p_days integer default 30,
  p_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 366));
  v_lim integer := greatest(1, least(coalesce(p_limit, 10), 50));
  v_from timestamptz := now() - (v_days || ' days')::interval;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(x) order by x.views desc, x.path asc)
      from (
        with normalized as (
          select
            coalesce(nullif(btrim(ae.path), ''), '/') as norm_path,
            ae.session_id,
            ae.created_at,
            nullif(
              btrim(coalesce(ae.metadata->>'page_title', ae.metadata->>'title', '')),
              ''
            ) as page_title
          from public.analytics_events ae
          where ae.created_at >= v_from
            and ae.event_type = 'page_view'
            and coalesce(ae.path, '') not like '/admin%'
        ),
        page_stats as (
          select
            norm_path as path,
            max(page_title) as page_title,
            count(*)::bigint as views,
            count(distinct session_id) filter (
              where session_id is not null and btrim(session_id) <> ''
            )::bigint as unique_sessions,
            max(created_at) as last_accessed_at
          from normalized
          group by norm_path
        )
        select
          ps.path,
          ps.page_title,
          ps.views,
          ps.unique_sessions,
          coalesce(cl.clicks_on_path, 0)::bigint as clicks_on_path,
          ps.last_accessed_at
        from page_stats ps
        left join lateral (
          select count(*)::bigint as clicks_on_path
          from public.analytics_events ae
          where ae.created_at >= v_from
            and ae.event_type in ('cta_click', 'entity_click')
            and coalesce(ae.path, '') not like '/admin%'
            and coalesce(nullif(btrim(ae.path), ''), '/') = ps.path
        ) cl on true
        order by ps.views desc, ps.path asc
        limit v_lim
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.kigh_admin_top_pages(integer, integer) from public;
grant execute on function public.kigh_admin_top_pages(integer, integer) to authenticated;

-- ─── 4. Top CTAs ────────────────────────────────────────────
create or replace function public.kigh_admin_top_ctas(
  p_days integer default 30,
  p_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 366));
  v_lim integer := greatest(1, least(coalesce(p_limit, 10), 50));
  v_from timestamptz := now() - (v_days || ' days')::interval;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(x) order by x.clicks desc, x.element_label asc)
      from (
        select
          coalesce(nullif(btrim(ae.label), ''), nullif(btrim(ae.event_name), '')) as element_label,
          coalesce(nullif(btrim(ae.path), ''), '/') as path,
          count(*)::bigint as clicks,
          max(ae.created_at) as last_clicked_at,
          max(
            case
              when coalesce(ae.metadata->>'href', ae.metadata->>'element_href', '') ~* '^https?://'
                then left(
                  btrim(coalesce(ae.metadata->>'href', ae.metadata->>'element_href', '')),
                  2048
                )
              else null
            end
          ) as element_href
        from public.analytics_events ae
        where ae.created_at >= v_from
          and ae.event_type = 'cta_click'
          and coalesce(ae.path, '') not like '/admin%'
          and coalesce(nullif(btrim(ae.label), ''), nullif(btrim(ae.event_name), '')) is not null
        group by 1, 2
        order by clicks desc, element_label asc
        limit v_lim
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.kigh_admin_top_ctas(integer, integer) from public;
grant execute on function public.kigh_admin_top_ctas(integer, integer) to authenticated;

comment on function public.kigh_admin_engagement_by_day(integer) is
  'Daily public-site engagement buckets for admin dashboard. Excludes /admin paths.';
comment on function public.kigh_admin_engagement_by_month(integer) is
  'Monthly public-site engagement buckets for admin dashboard. Excludes /admin paths.';
comment on function public.kigh_admin_top_pages(integer, integer) is
  'Top public page views by path for admin dashboard. No PII fields returned.';
comment on function public.kigh_admin_top_ctas(integer, integer) is
  'Top CTA click labels for admin dashboard. No raw metadata/user fields returned.';
