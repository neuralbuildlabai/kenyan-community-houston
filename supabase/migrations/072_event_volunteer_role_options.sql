-- ============================================================
-- 072 — Per-event volunteer/presenter role options
-- ============================================================
-- KIGH runs many kinds of recurring events (back-to-school,
-- financial literacy, social groups, health sessions, …). The
-- public signup form shows a role dropdown; by default it uses a
-- generic, event-agnostic list defined in the app
-- (`VOLUNTEER_ROLE_GROUPS` in src/lib/eventVolunteerSignup.ts)
-- that covers presenters/professionals and day-of helpers.
--
-- This migration adds an OPTIONAL per-event override so a specific
-- event can present its own tailored role list without a deploy:
--
--   update public.events
--   set volunteer_role_options = array[
--     'Insurance Professional',
--     'Tax Preparer',
--     'Financial Planner',
--     'Tech / Zoom support'
--   ]
--   where slug = '<event-slug>';
--
-- Null or empty ⇒ the app falls back to the default generic list.
-- Values are stored verbatim into event_volunteer_signups.volunteer_role
-- (max 120 chars each, enforced by the existing table constraint at
-- insert time via the RPC).
-- ============================================================

alter table public.events add column if not exists volunteer_role_options text[];

-- Note: CHECK constraints cannot contain subqueries, so per-element
-- length validation happens in the app + the signup RPC (volunteer_role
-- is already constrained to ≤120 chars on event_volunteer_signups).
-- Here we only bound the array size.
alter table public.events drop constraint if exists events_volunteer_role_options_chk;
alter table public.events add constraint events_volunteer_role_options_chk
  check (
    volunteer_role_options is null
    or coalesce(array_length(volunteer_role_options, 1), 0) <= 30
  );

comment on column public.events.volunteer_role_options is
  'Optional per-event role list for the public volunteer/presenter signup dropdown. Null/empty = app default generic list. Each entry 2–120 chars, max 30 entries.';
