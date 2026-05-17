-- ============================================================
-- 043 — Elevated-admin RLS repair for legacy content tables
-- ============================================================
-- Symptom (May 2026)
--   Authenticated admin users (super_admin, community_admin, ...)
--   hit 403s when listing pending content from the admin UI:
--     events?select=*&status=eq.pending          → 403
--     announcements?select=*&status=eq.pending   → 403
--     businesses?select=*&status=eq.pending      → 403
--     fundraisers?select=*&status=eq.pending     → 403
--     service_interests?select=*                  → 403
--
-- Root cause
--   The "Admins have full access to X" policies created in
--   migration 002 use the legacy `is_admin()` wrapper, applied
--   to the default role list (PUBLIC) with no explicit
--   `to authenticated` clause. The wrapper delegates through
--   two SECURITY DEFINER language-sql layers before reaching the
--   real check, and we have observed that PostgREST + RLS will
--   collapse to a 403 under that combined shape rather than the
--   200-with-empty-array path that admins should see.
--
--   Newer tables in the schema (members, gallery_images,
--   member_media_submissions, etc.) use the direct, explicit
--   form
--       on public.X for all to authenticated
--       using (public.kigh_is_elevated_admin())
--       with check (public.kigh_is_elevated_admin())
--   and work correctly. This migration brings the legacy tables
--   into the same shape.
--
-- Scope
--   Affects only the admin/all-access policies. Public-read and
--   anon-insert policies are left untouched. No data change.
--   Idempotent.
--
-- Diagnostic (run before/after to verify)
--   -- Confirm the helper is reachable for the API roles:
--   select
--     has_function_privilege('authenticated', 'public.kigh_is_elevated_admin()', 'execute') as authn_can_call,
--     has_function_privilege('anon',          'public.kigh_is_elevated_admin()', 'execute') as anon_can_call;
--
--   -- Confirm the new policies replaced the old ones:
--   select tablename, policyname, roles, qual
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('events','announcements','businesses','fundraisers',
--                       'sports_posts','gallery_albums','gallery_images',
--                       'contact_submissions','service_interests')
--   order by tablename, policyname;
-- ============================================================

-- ─── events ──────────────────────────────────────────────────
drop policy if exists "Admins have full access to events" on public.events;
drop policy if exists "events elevated admin all" on public.events;
create policy "events elevated admin all"
  on public.events
  for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── announcements ───────────────────────────────────────────
drop policy if exists "Admins have full access to announcements" on public.announcements;
drop policy if exists "announcements elevated admin all" on public.announcements;
create policy "announcements elevated admin all"
  on public.announcements
  for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── businesses ──────────────────────────────────────────────
drop policy if exists "Admins have full access to businesses" on public.businesses;
drop policy if exists "businesses elevated admin all" on public.businesses;
create policy "businesses elevated admin all"
  on public.businesses
  for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── fundraisers ─────────────────────────────────────────────
drop policy if exists "Admins have full access to fundraisers" on public.fundraisers;
drop policy if exists "fundraisers elevated admin all" on public.fundraisers;
create policy "fundraisers elevated admin all"
  on public.fundraisers
  for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── sports_posts ────────────────────────────────────────────
drop policy if exists "Admins have full access to sports posts" on public.sports_posts;
drop policy if exists "sports_posts elevated admin all" on public.sports_posts;
create policy "sports_posts elevated admin all"
  on public.sports_posts
  for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── gallery_albums ──────────────────────────────────────────
-- (gallery_images is already handled by migration 039's
-- "Admins manage gallery images" policy using
-- kigh_is_elevated_admin directly, so we leave it alone.)
drop policy if exists "Admins manage gallery albums" on public.gallery_albums;
drop policy if exists "gallery_albums elevated admin all" on public.gallery_albums;
create policy "gallery_albums elevated admin all"
  on public.gallery_albums
  for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── contact_submissions ─────────────────────────────────────
drop policy if exists "Admins can read contacts" on public.contact_submissions;
drop policy if exists "Admins can manage contacts" on public.contact_submissions;
drop policy if exists "contact_submissions elevated admin all" on public.contact_submissions;
create policy "contact_submissions elevated admin all"
  on public.contact_submissions
  for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── service_interests ───────────────────────────────────────
drop policy if exists "Admins can select service interests" on public.service_interests;
drop policy if exists "Admins can update service interests" on public.service_interests;
drop policy if exists "service_interests elevated admin all" on public.service_interests;
create policy "service_interests elevated admin all"
  on public.service_interests
  for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── Table grants (belt-and-braces) ──────────────────────────
-- Supabase grants these by default for tables created in `public`,
-- but several of these tables predate the project's default
-- privileges block and have been observed to vary across
-- environments. Granting explicitly here eliminates any future
-- environment drift between dev / staging / prod.
grant select, insert, update, delete on public.events             to authenticated;
grant select, insert, update, delete on public.announcements      to authenticated;
grant select, insert, update, delete on public.businesses         to authenticated;
grant select, insert, update, delete on public.fundraisers        to authenticated;
grant select, insert, update, delete on public.sports_posts       to authenticated;
grant select, insert, update, delete on public.gallery_albums     to authenticated;
grant select, insert, update, delete on public.contact_submissions to authenticated;
grant select, insert, update, delete on public.service_interests  to authenticated;

-- Anonymous reads / inserts (status='published' read + submission inserts).
grant select on public.events             to anon;
grant select on public.announcements      to anon;
grant select on public.businesses         to anon;
grant select on public.fundraisers        to anon;
grant select on public.sports_posts       to anon;
grant select on public.gallery_albums     to anon;

grant insert on public.events             to anon;
grant insert on public.announcements      to anon;
grant insert on public.businesses         to anon;
grant insert on public.fundraisers        to anon;
grant insert on public.contact_submissions to anon;
grant insert on public.service_interests  to anon;
