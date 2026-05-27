-- ============================================================
-- 052 — Critical security: SECURITY DEFINER views, auth.users
--       exposure, admin_user_profiles RLS repair
-- ============================================================
-- Supabase database linter (May 2026) flagged four ERROR-level
-- findings on the production project (tzrlwleaycawpkzmbqxr) and
-- the dev project (eipjpvltwmvdyvbqqwus):
--
--   1. auth_users_exposed
--        View `public.admin_users` exposes `auth.users` to the
--        anon role via PostgREST.
--
--   2. security_definer_view  (x4)
--        Views inherit their creator's privileges instead of the
--        querying user's. Flagged on:
--          - public.admin_users
--          - public.gallery_images_public
--          - public.gallery_albums_public
--          - public.members_in_good_standing
--
--   3. policy_exists_rls_disabled
--   4. rls_disabled_in_public
--        `public.admin_user_profiles` has SELECT/INSERT/UPDATE
--        policies but RLS is OFF on the production project. The
--        original migration (010) enabled RLS — production state
--        diverged. This migration re-asserts RLS idempotently.
--
-- Approach:
--   * Convert all four views to `security_invoker = on` so they
--     enforce the caller's RLS and grants, not the view owner's.
--   * Remove direct `auth.users` reference from `admin_users` so
--     the lint cannot flag it. The `last_sign_in_at` field is
--     retrieved via a SECURITY DEFINER helper function that gates
--     access with `is_admin()`. The view itself reads only from
--     `public.profiles` + `public.admin_user_profiles`.
--   * Restore anon read of gallery_images_public via column-level
--     SELECT grants on the underlying table plus a narrow RLS
--     policy. The PII columns (submitter email/name/uid) remain
--     unreachable from the anon role at every layer.
--   * Re-enable RLS on admin_user_profiles (idempotent).
--
-- No data migration. No functional change for end users.
-- ============================================================

-- ─── 1. Re-assert RLS on admin_user_profiles (production drift) ──
alter table public.admin_user_profiles enable row level security;
-- Defense-in-depth: force RLS even for table owners / superuser-via-PostgREST.
alter table public.admin_user_profiles force row level security;

-- ─── 2. Helper: gated auth.users read for admin UI ───────────────
-- Only callable by elevated admins. Returns nothing for non-admins,
-- so an unprivileged caller of admin_users sees null last_sign_in_at
-- instead of leaking the join target.
create or replace function public.admin_user_last_sign_in_at(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.last_sign_in_at
  from auth.users u
  where u.id = p_user_id
    and public.is_admin();
$$;

comment on function public.admin_user_last_sign_in_at(uuid) is
  'Returns auth.users.last_sign_in_at only when the caller is an elevated admin. '
  'Used by public.admin_users so the view itself no longer references auth.users '
  '(closes Supabase lint 0002_auth_users_exposed; migration 052).';

revoke all on function public.admin_user_last_sign_in_at(uuid) from public;
grant execute on function public.admin_user_last_sign_in_at(uuid) to authenticated;
-- Intentionally NOT granted to anon. Even if it were, is_admin() returns
-- false for anon and the function yields nothing.

-- ─── 3. admin_users view: security_invoker, no auth.users ────────
drop view if exists public.admin_users;

create view public.admin_users
  with (security_invoker = on)
as
select
  p.id,
  p.email,
  coalesce(nullif(trim(p.role), ''), 'community_admin') as role,
  p.created_at,
  public.admin_user_last_sign_in_at(p.id) as last_sign_in_at,
  coalesce(s.must_change_password, false) as must_change_password,
  s.temporary_password_set_at,
  s.password_changed_at,
  s.display_name,
  s.position_title
from public.profiles p
left join public.admin_user_profiles s on s.user_id = p.id;

comment on view public.admin_users is
  'Admin user roster — security_invoker so callers see only rows their RLS '
  'on public.profiles permits. last_sign_in_at is fetched via the gated '
  'admin_user_last_sign_in_at() helper; the view body no longer joins '
  'auth.users directly (migration 052).';

-- Explicit grants: revoke from anon (was implicitly inherited before),
-- restore authenticated read. RLS on profiles still gates row visibility.
revoke all on public.admin_users from public;
revoke all on public.admin_users from anon;
grant select on public.admin_users to authenticated;

-- ─── 4. gallery_images_public: security_invoker + anon access ────
alter view public.gallery_images_public set (security_invoker = on);

-- Re-grant the narrow column projection to anon. Migration 036 had
-- revoked SELECT entirely; with security_invoker we need the caller
-- to be allowed to read the columns the view projects.
grant select
  (id, album_id, image_url, thumbnail_url, caption, alt_text, status,
   is_homepage_featured, sort_order, created_at, updated_at)
  on public.gallery_images
  to anon;

-- The view also filters on status = 'published'; RLS must permit anon
-- to read those rows. Reinstate the narrow public read policy (the
-- old "Public can read published gallery images" policy was dropped
-- by migration 036). PII columns remain unreachable because the
-- column-level grant above does not include them.
drop policy if exists "Public can read published gallery images"
  on public.gallery_images;
create policy "Public can read published gallery images"
  on public.gallery_images for select
  to anon
  using (status = 'published');

comment on policy "Public can read published gallery images" on public.gallery_images is
  'Anon may read published rows only. Column-level grants limit anon to '
  'safe columns; PII (submitted_by_*, approver_*) is not selectable '
  '(migration 052; pairs with view security_invoker conversion).';

-- ─── 5. gallery_albums_public: security_invoker ──────────────────
alter view public.gallery_albums_public set (security_invoker = on);

-- The view filters on `coalesce(visibility, 'public') = 'public'` and
-- references gallery_images_public. With security_invoker the caller
-- needs SELECT on the gallery_albums columns the view projects.
-- gallery_albums already has the "Public can read gallery albums"
-- policy (migrations 029/038) so RLS is fine; we just need the grant.
grant select
  (id, name, slug, description, cover_url, created_at, event_date,
   open_for_submissions, visibility)
  on public.gallery_albums
  to anon;

-- ─── 6. members_in_good_standing: security_invoker ───────────────
alter view public.members_in_good_standing set (security_invoker = on);

comment on view public.members_in_good_standing is
  'Active members in good standing per community. security_invoker — '
  'admins see all rows via the "Admins full access members" policy; '
  'regular members see only their own row (used for self-status check). '
  'AGM/quorum reporting runs as an admin (migration 052).';

-- ─── 7. Sanity: confirm grants on admin_user_profiles unchanged ─
-- (Migration 010 already granted these; restated for production drift.)
grant select, insert, update, delete on public.admin_user_profiles to authenticated;
