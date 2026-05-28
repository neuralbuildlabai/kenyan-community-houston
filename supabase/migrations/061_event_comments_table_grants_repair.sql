-- ============================================================
-- 061 — Repair table-level grants on public.event_comments
-- ============================================================
-- /admin/event-comments was failing with HTTP 403 from PostgREST:
--   { code: 42501,
--     message: "permission denied for table event_comments",
--     hint: "Grant the required privileges to the current role
--            with: GRANT UPDATE ON public.event_comments TO
--            authenticated;" }
-- whenever an admin clicked Approve / Hide / Remove on a pending
-- comment.
--
-- Root cause: same class of bug as migration 060 (resources).
--   Postgres checks table-level GRANTs BEFORE row-level security.
--   Migration 030 created public.event_comments with:
--     GRANT SELECT                       TO anon, authenticated
--     GRANT INSERT                       TO authenticated
--     GRANT SELECT, INSERT, UPDATE, DELETE TO service_role, postgres
--   The RLS policies "event_comments admin moderate" (UPDATE) and
--   "event_comments admin delete" (DELETE) were written to allow
--   admins to act — but the `authenticated` role had no table-level
--   UPDATE or DELETE privilege, so PostgREST refused before RLS
--   could even run.
--
-- Fix: add UPDATE and DELETE grants for `authenticated`. RLS still
-- restricts both to admins via public.is_admin(), so this does not
-- broaden access for ordinary members.
-- ============================================================

grant update, delete on public.event_comments to authenticated;

-- Defensive: re-affirm the full service_role grant in case it was
-- stripped at some point. Service role bypasses RLS but still
-- needs the table-level grant.
grant all on public.event_comments to service_role;
