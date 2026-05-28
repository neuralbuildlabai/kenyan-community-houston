-- ============================================================
-- 062 — Repair table-level grants on chat_threads + chat_messages
-- ============================================================
-- The audit query run after 061 surfaced the same bug class on
-- the two chat tables created in migration 030:
--
--   public.chat_threads  — admin UPDATE+DELETE RLS policies exist
--                          but `authenticated` has no table grant
--   public.chat_messages — same
--
-- These would 403 with PostgreSQL error 42501 ("permission denied
-- for table …") the moment any admin tries to moderate a chat
-- thread/message. The dormant bug only matters once admin chat
-- moderation gets used, but better to fix it before the page
-- gets opened in anger.
--
-- Same shape as 060 (resources) and 061 (event_comments). RLS
-- still gates these verbs to admins via public.is_admin(), so
-- this does not broaden access for ordinary members.
-- ============================================================

grant update, delete on public.chat_threads  to authenticated;
grant update, delete on public.chat_messages to authenticated;

-- Defensive: re-affirm full service_role grants in case any were
-- stripped at some point. Service role bypasses RLS but still
-- needs the table-level grant.
grant all on public.chat_threads  to service_role;
grant all on public.chat_messages to service_role;
