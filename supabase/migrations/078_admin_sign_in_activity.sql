-- ============================================================
-- 078 — Admin sign-in activity feed
-- ============================================================
-- Backs /admin/sign-ins: who signed in, when, and what they opened
-- during that visit. Reads only `public.analytics_events` (already
-- written by src/lib/analytics.ts) and resolves identity through
-- `public.profiles` / `public.members`.
--
-- A "visit" is every non-login analytics event sharing the sign-in's
-- session_id, from the sign-in until the next sign-in on that session.
-- Elevated admins only; idempotent.

-- ─── 1. Indexes for the session-window join ─────────────────
create index if not exists analytics_events_session_created_idx
  on public.analytics_events (session_id, created_at);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc)
  where user_id is not null;

-- ─── 2. Sign-in list + window summary ───────────────────────
create or replace function public.kigh_admin_sign_ins(
  p_days integer default 30,
  p_limit integer default 200,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days  integer := greatest(1, least(coalesce(p_days, 30), 366));
  v_lim   integer := greatest(1, least(coalesce(p_limit, 200), 1000));
  v_from  timestamptz := now() - (v_days || ' days')::interval;
  v_q     text := nullif(btrim(coalesce(p_search, '')), '');
  v_out   jsonb;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with logins as (
    select
      ae.id,
      ae.created_at,
      ae.event_name,
      ae.session_id,
      ae.user_id,
      ae.path,
      lead(ae.created_at) over (
        partition by coalesce(ae.session_id, ae.id::text)
        order by ae.created_at
      ) as next_login_at
    from public.analytics_events ae
    where ae.event_type = 'login'
      and ae.created_at >= v_from
  ),
  activity as (
    select
      l.id as login_id,
      count(*)::bigint as event_count,
      count(*) filter (where ae.event_type = 'page_view')::bigint as page_views,
      count(distinct ae.path) filter (where ae.path is not null)::bigint as distinct_paths,
      max(ae.created_at) as last_event_at
    from logins l
    join public.analytics_events ae
      on ae.session_id is not null
     and ae.session_id = l.session_id
     and ae.created_at > l.created_at
     and (l.next_login_at is null or ae.created_at < l.next_login_at)
     and ae.event_type <> 'login'
    group by l.id
  ),
  resolved as (
    select
      l.id,
      l.created_at   as occurred_at,
      l.event_name   as kind,
      l.user_id,
      l.session_id,
      l.path         as entry_path,
      p.email        as email,
      p.full_name    as full_name,
      p.role         as role,
      m.first_name   as member_first_name,
      m.last_name    as member_last_name,
      m.membership_status,
      coalesce(a.event_count, 0)    as event_count,
      coalesce(a.page_views, 0)     as page_views,
      coalesce(a.distinct_paths, 0) as distinct_paths,
      a.last_event_at
    from logins l
    left join public.profiles p on p.id = l.user_id
    left join lateral (
      select mm.first_name, mm.last_name, mm.membership_status
      from public.members mm
      where p.email is not null
        and lower(mm.email) = lower(p.email)
      order by mm.submitted_at desc
      limit 1
    ) m on true
    left join activity a on a.login_id = l.id
  ),
  filtered as (
    select r.*
    from resolved r
    where v_q is null
      or lower(coalesce(r.email, '')) like '%' || lower(v_q) || '%'
      or lower(coalesce(r.full_name, '')) like '%' || lower(v_q) || '%'
      or lower(coalesce(r.member_first_name, '') || ' ' || coalesce(r.member_last_name, ''))
           like '%' || lower(v_q) || '%'
      or lower(coalesce(r.role, '')) like '%' || lower(v_q) || '%'
    order by r.occurred_at desc
    limit v_lim
  )
  select jsonb_build_object(
    'period_days', v_days,
    'period_from', v_from,
    'generated_at', now(),
    'limit', v_lim,
    'summary', (
      select jsonb_build_object(
        'total', count(*)::bigint,
        'unique_users', count(distinct user_id)::bigint,
        'admin_logins', count(*) filter (where kind = 'admin_login')::bigint,
        'member_logins', count(*) filter (where kind <> 'admin_login')::bigint,
        'unidentified', count(*) filter (where user_id is null)::bigint
      )
      from resolved
    ),
    'rows', coalesce(
      (select jsonb_agg(to_jsonb(f) order by f.occurred_at desc) from filtered f),
      '[]'::jsonb
    )
  )
  into v_out;

  return v_out;
end;
$$;

revoke all on function public.kigh_admin_sign_ins(integer, integer, text) from public;
grant execute on function public.kigh_admin_sign_ins(integer, integer, text) to authenticated;

-- ─── 3. What one sign-in accessed ───────────────────────────
create or replace function public.kigh_admin_sign_in_activity(
  p_login_event_id uuid,
  p_limit integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lim     integer := greatest(1, least(coalesce(p_limit, 300), 1000));
  v_login   public.analytics_events%rowtype;
  v_next_at timestamptz;
  v_out     jsonb;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_login
  from public.analytics_events
  where id = p_login_event_id
    and event_type = 'login';

  if not found then
    raise exception 'sign-in event not found' using errcode = 'P0002';
  end if;

  if v_login.session_id is null then
    return jsonb_build_object(
      'login_event_id', p_login_event_id,
      'session_id', null,
      'started_at', v_login.created_at,
      'ended_at', null,
      'rows', '[]'::jsonb
    );
  end if;

  select min(ae.created_at) into v_next_at
  from public.analytics_events ae
  where ae.session_id = v_login.session_id
    and ae.event_type = 'login'
    and ae.created_at > v_login.created_at;

  select jsonb_build_object(
    'login_event_id', p_login_event_id,
    'session_id', v_login.session_id,
    'started_at', v_login.created_at,
    'ended_at', v_next_at,
    'limit', v_lim,
    'rows', coalesce(
      (
        select jsonb_agg(to_jsonb(x) order by x.occurred_at asc)
        from (
          select
            ae.id,
            ae.created_at as occurred_at,
            ae.event_type,
            ae.event_name,
            ae.path,
            ae.label,
            ae.entity_table,
            ae.entity_id
          from public.analytics_events ae
          where ae.session_id = v_login.session_id
            and ae.created_at > v_login.created_at
            and (v_next_at is null or ae.created_at < v_next_at)
            and ae.event_type <> 'login'
          order by ae.created_at asc
          limit v_lim
        ) x
      ),
      '[]'::jsonb
    )
  )
  into v_out;

  return v_out;
end;
$$;

revoke all on function public.kigh_admin_sign_in_activity(uuid, integer) from public;
grant execute on function public.kigh_admin_sign_in_activity(uuid, integer) to authenticated;
