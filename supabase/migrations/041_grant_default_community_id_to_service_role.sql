-- ============================================================
-- 041 — Grant kigh_default_community_id() execute to service_role
-- ============================================================
-- Context (May 2026)
--   Migration 014 set `public.kigh_default_community_id()` as the
--   column default on 14 tenant-scoped tables (events, announcements,
--   businesses, fundraisers, gallery_albums, gallery_images,
--   contact_submissions, members, household_members,
--   membership_payments, resources, community_groups,
--   service_interests, profiles, plus `community_ads` from 017).
--
--   That migration only granted EXECUTE to `authenticated` and `anon`:
--     grant execute on function public.kigh_default_community_id()
--       to authenticated, anon;
--
--   The service_role used by Supabase Edge Functions was never
--   granted execute. RLS is bypassed for service_role, but function
--   EXECUTE privileges are NOT — so any service-role insert that
--   omits `community_id` hits PostgreSQL 42501
--   ("permission denied for function kigh_default_community_id")
--   when the column default fires.
--
--   This first surfaced in the `create-admin-user` Edge Function
--   when it upserts a profiles row for a new admin: the function
--   builds `buildProfilesRow({ id, email, role, ... })` and leaves
--   community_id off the payload so the column default applies.
--   Postgres rejects the insert before the row is written.
--
-- Fix
--   Grant EXECUTE on kigh_default_community_id() to service_role
--   so server-side admin writes can rely on the same default the
--   rest of the schema does. No data change. Idempotent.
--
-- Notes
--   This does NOT widen access in any user-facing way. The
--   service_role key is server-only (Supabase service_role JWT is
--   never exposed to browsers); granting it execute on a helper
--   that returns a single tenant UUID is strictly safer than the
--   alternative of having every server-side writer carry its own
--   community_id literal.
-- ============================================================

grant execute on function public.kigh_default_community_id() to service_role;

-- The function body does `select id from public.communities ...`. Migration 014
-- granted SELECT on communities only to anon/authenticated, and the function
-- is `language sql stable` (not security definer) so it runs as the calling
-- role. Without this second grant the default firing during a service-role
-- insert into profiles fails with: "permission denied for table communities".
grant select on public.communities to service_role;

-- ─── Validator functions used in profiles/members CHECK constraints ──────────
--
-- Migration 031 created these three helpers and revoked them from `public`,
-- but never granted EXECUTE back to anyone. The functions are wired into
-- CHECK constraints on public.profiles and public.members, so any insert
-- by anything except the function owner (postgres) fails with
--   permission denied for function kigh_is_valid_general_location_area
-- or its sibling. This affects service_role writes from Edge Functions AND
-- direct RLS-permitted writes by authenticated users. Granting EXECUTE
-- to the three API roles fixes both paths.
grant execute on function public.kigh_is_valid_general_location_area(text)
  to authenticated, anon, service_role;
grant execute on function public.kigh_is_valid_professional_field(text)
  to authenticated, anon, service_role;
grant execute on function public.kigh_professional_other_ok(text, text)
  to authenticated, anon, service_role;
