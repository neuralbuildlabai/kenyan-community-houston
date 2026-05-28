-- ============================================================
-- 060 — Repair table-level grants on public.resources
-- ============================================================
-- Production (tzrlwleaycawpkzmbqxr) was returning HTTP 401 with
--   { code: 42501, message: "permission denied for table resources" }
-- on every read of public.resources — including from the admin
-- UI where the caller IS an elevated admin and the
-- "Admins full access resources" RLS policy should allow it.
--
-- Root cause:
--   Postgres checks table-level GRANTs BEFORE row-level security.
--   The resources table on prod was missing the standard
--     GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated
--     GRANT SELECT TO anon
--   pair that Supabase normally seeds with the public schema. UAT
--   had it from initial project setup; production diverged at some
--   point (likely table recreation without re-granting).
--
-- This migration restores the grants idempotently. RLS policies
-- already in place (migrations 002, 004, 014) continue to gate
-- which rows each role can actually see:
--   * "Public read published public resources" — anon may read
--     only published+public rows.
--   * "Admins full access resources" — elevated admins (via
--     is_admin()) have full access for any row.
-- ============================================================

grant select on public.resources to anon;
grant select, insert, update, delete on public.resources to authenticated;

-- Defensive: also re-grant to service_role (used by edge functions
-- and migration tooling). Service role bypasses RLS but still
-- needs the table-level grant if it was somehow revoked.
grant all on public.resources to service_role;
