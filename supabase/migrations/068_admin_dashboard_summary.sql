-- ============================================================
-- 068 — Admin dashboard summary RPC (consolidated KPI counts)
-- ============================================================
-- Single SECURITY DEFINER RPC for /admin/dashboard KPI tiles.
-- Replaces many parallel table count queries with one round-trip.
-- Does not reference legacy public_submissions.

create or replace function public.kigh_admin_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Chicago')::date;
  v_expiring_cutoff timestamptz := now() + interval '7 days';
  v_events_pending bigint;
  v_announcements_pending bigint;
  v_businesses_pending bigint;
  v_fundraisers_pending bigint;
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*)::bigint into v_events_pending
  from public.events where status = 'pending';

  select count(*)::bigint into v_announcements_pending
  from public.announcements where status = 'pending';

  select count(*)::bigint into v_businesses_pending
  from public.businesses where status = 'pending';

  select count(*)::bigint into v_fundraisers_pending
  from public.fundraisers where status = 'pending';

  return jsonb_build_object(
    'checked_at', now(),
    'members', jsonb_build_object(
      'total', coalesce((select count(*)::bigint from public.members), 0),
      'pending', coalesce((select count(*)::bigint from public.members where membership_status = 'pending'), 0),
      'approved', coalesce((select count(*)::bigint from public.members where membership_status = 'active'), 0)
    ),
    'profiles', jsonb_build_object(
      'total', coalesce((select count(*)::bigint from public.profiles), 0)
    ),
    'events', jsonb_build_object(
      'published', coalesce((select count(*)::bigint from public.events where status = 'published'), 0),
      'pending', coalesce(v_events_pending, 0),
      'upcoming_published', coalesce((
        select count(*)::bigint
        from public.events
        where status = 'published'
          and start_date >= v_today
      ), 0)
    ),
    'announcements', jsonb_build_object(
      'published', coalesce((select count(*)::bigint from public.announcements where status = 'published'), 0),
      'pending', coalesce(v_announcements_pending, 0),
      'expiring_soon', coalesce((
        select count(*)::bigint
        from public.announcements
        where status = 'published'
          and expires_at is not null
          and expires_at >= now()
          and expires_at <= v_expiring_cutoff
      ), 0)
    ),
    'businesses', jsonb_build_object(
      'published', coalesce((select count(*)::bigint from public.businesses where status = 'published'), 0),
      'pending', coalesce(v_businesses_pending, 0)
    ),
    'fundraisers', jsonb_build_object(
      'published', coalesce((select count(*)::bigint from public.fundraisers where status = 'published'), 0),
      'pending', coalesce(v_fundraisers_pending, 0),
      'live', coalesce((
        select count(*)::bigint
        from public.fundraisers
        where status = 'published'
          and (deadline is null or deadline >= v_today)
      ), 0)
    ),
    'gallery', jsonb_build_object(
      'pending_images', coalesce((select count(*)::bigint from public.gallery_images where status = 'pending'), 0),
      'total_images', coalesce((select count(*)::bigint from public.gallery_images), 0)
    ),
    'member_media_submissions', jsonb_build_object(
      'pending', coalesce((select count(*)::bigint from public.member_media_submissions where status = 'pending'), 0),
      'total', coalesce((select count(*)::bigint from public.member_media_submissions), 0)
    ),
    'contact_messages', jsonb_build_object(
      'new', coalesce((select count(*)::bigint from public.contact_submissions where status = 'new'), 0),
      'total', coalesce((select count(*)::bigint from public.contact_submissions), 0)
    ),
    'public_submissions', jsonb_build_object(
      'pending_total', coalesce(v_events_pending, 0)
        + coalesce(v_announcements_pending, 0)
        + coalesce(v_businesses_pending, 0)
        + coalesce(v_fundraisers_pending, 0)
    ),
    'volunteers', jsonb_build_object(
      'total', coalesce((select count(*)::bigint from public.event_volunteer_signups), 0),
      'submitted', coalesce((
        select count(*)::bigint
        from public.event_volunteer_signups
        where status = 'submitted'
      ), 0)
    ),
    'vendors', jsonb_build_object(
      'total', coalesce((select count(*)::bigint from public.event_vendor_signups), 0),
      'submitted', coalesce((
        select count(*)::bigint
        from public.event_vendor_signups
        where status = 'submitted'
      ), 0)
    ),
    'polls', jsonb_build_object(
      'active', coalesce((
        select count(*)::bigint
        from public.polls
        where is_active = true
          and (closes_at is null or closes_at > now())
      ), 0),
      'total_votes', coalesce((select count(*)::bigint from public.poll_votes), 0),
      'votes_7d', coalesce((
        select count(*)::bigint
        from public.poll_votes
        where created_at >= now() - interval '7 days'
      ), 0),
      'votes_30d', coalesce((
        select count(*)::bigint
        from public.poll_votes
        where created_at >= now() - interval '30 days'
      ), 0)
    ),
    'community', jsonb_build_object(
      'open_chat_threads', coalesce((
        select count(*)::bigint
        from public.chat_threads
        where status in ('open', 'pending_admin', 'pending_member')
      ), 0),
      'pending_community_groups', coalesce((
        select count(*)::bigint
        from public.community_groups
        where status = 'pending'
      ), 0),
      'pending_event_comments', coalesce((
        select count(*)::bigint
        from public.event_comments
        where status = 'pending'
      ), 0),
      'new_service_interests', coalesce((
        select count(*)::bigint
        from public.service_interests
        where status = 'new'
      ), 0),
      'member_invites_total', coalesce((select count(*)::bigint from public.member_invites), 0),
      'member_invites_opened', coalesce((
        select count(*)::bigint
        from public.member_invites
        where status = 'opened_whatsapp'
      ), 0)
    )
  );
end;
$$;

revoke all on function public.kigh_admin_dashboard_summary() from public;
grant execute on function public.kigh_admin_dashboard_summary() to authenticated;

comment on function public.kigh_admin_dashboard_summary() is
  'Consolidated operational KPI counts for /admin/dashboard. Elevated admins only.';
