-- ============================================================
-- 044 — Relax kigh_professional_other_ok: "Other" no longer
--       requires a follow-up description
-- ============================================================
-- Context (May 2026)
--   Migration 031 added a CHECK constraint to public.members and
--   public.profiles backed by `public.kigh_professional_other_ok(pf, pfo)`:
--
--     select coalesce(trim(pf), '') is distinct from 'other'
--        or (pfo is not null and char_length(trim(pfo)) between 1 and 80);
--
--   In practice that meant any row with `professional_field = 'other'`
--   was rejected unless `professional_field_other` was also populated
--   (1-80 chars). The admin Member detail UI surfaced a 23514 check
--   violation whenever a reviewer picked "Other" from the dropdown
--   because the row was written immediately without prompting for
--   the description.
--
--   Product decision: "Other" should stand alone as a valid value.
--   The follow-up free-text question was not delivering enough data
--   to justify blocking writes on it.
--
-- Fix
--   Redefine `kigh_professional_other_ok` to allow `professional_field
--   = 'other'` regardless of whether `professional_field_other` is
--   populated. Keep the 1-80 char ceiling as a safety net for the
--   legacy rows / API clients that still send a description.
--
--   The CHECK constraints on `public.profiles` and `public.members`
--   are NOT re-created here — they reference the function, and
--   `create or replace function` updates the body in place, so the
--   constraints automatically use the new logic on the next write.
-- ============================================================

create or replace function public.kigh_professional_other_ok(pf text, pfo text)
returns boolean
language sql
immutable
parallel safe
as $$
  -- Always allow when no description is supplied. When a description
  -- IS supplied, cap it at 80 characters to keep stored values sane.
  select pfo is null
      or coalesce(trim(pfo), '') = ''
      or char_length(trim(pfo)) <= 80;
$$;

comment on function public.kigh_professional_other_ok(text, text) is
  'Allows public.profiles / public.members to set professional_field = ''other'' without a follow-up description. Caps any supplied description at 80 characters. See migration 044.';

-- Grants are unchanged (migration 042 already granted EXECUTE to
-- anon, authenticated, service_role). `create or replace` preserves
-- those grants.
