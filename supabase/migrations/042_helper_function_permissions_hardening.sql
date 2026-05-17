-- ============================================================
-- 042 — Make tenant-default + validator helpers safely callable
--       from any API role (permanent fix)
-- ============================================================
-- Context
--   While debugging a 500 in the `create-admin-user` Edge Function
--   we surfaced a chain of three "permission denied" (42501) errors
--   raised when service_role tried to insert into public.profiles:
--
--     (1) permission denied for function kigh_default_community_id
--     (2) permission denied for table  communities
--     (3) permission denied for function kigh_is_valid_general_location_area
--
--   Migration 041 unblocked production by granting service_role
--   EXECUTE on the default helper, SELECT on communities, and
--   EXECUTE on the three validator helpers from migration 031.
--   That was the immediate fix, not the structural one.
--
-- Why this migration exists
--   The structural problem is two-fold:
--
--   A. `kigh_default_community_id()` was declared `language sql
--      stable` (caller-rights). So every caller-role that fires
--      it as a column default must ALSO have SELECT on
--      public.communities. Every new server-side role we ever
--      add would need that table grant. That doesn't scale.
--
--   B. Migration 031 revoked EXECUTE on three validator functions
--      from `public` without granting it back to the API roles.
--      Those validators are wired into CHECK constraints on
--      public.profiles and public.members, so every insert by any
--      role except the function owner (postgres) was broken on
--      paper — the only reason it didn't show up sooner is that
--      most real-world profile inserts go through SECURITY DEFINER
--      RPCs that already run as postgres.
--
-- Permanent fix
--   1. Recreate `kigh_default_community_id()` as SECURITY DEFINER
--      with an explicit search_path. The function only reads a
--      single tenant UUID — that value is already public via every
--      published row of every community-scoped table — so running
--      it with definer rights carries no information-disclosure
--      risk. This removes the need for every future caller-role
--      to be granted SELECT on `public.communities`.
--
--   2. Re-grant EXECUTE on all four helpers (the default helper
--      plus the three migration-031 validators) to anon,
--      authenticated, AND service_role. The grants live next to
--      the function definitions here so a future reader sees the
--      intended access model in one place.
--
--   3. After this migration is applied the SELECT grant from 041
--      on public.communities → service_role becomes redundant for
--      this code path. It is harmless and is left in place — no
--      revoke is performed here to avoid breaking any other
--      server-side code that may have started relying on it
--      between 041 and 042.
--
-- Safety
--   - Idempotent: function recreate uses `create or replace`,
--     grants use the standard form (no error if already present).
--   - No data change.
--   - SECURITY DEFINER function carries `set search_path = public`
--     to neutralise search_path-based privilege escalation.
-- ============================================================

-- ─── 1. Tenant-default helper: SECURITY DEFINER ─────────────
create or replace function public.kigh_default_community_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.communities where slug = 'kigh' limit 1;
$$;

comment on function public.kigh_default_community_id() is
  'Returns the default (KIGH) community UUID. SECURITY DEFINER so callers do not need SELECT on public.communities. See migration 042.';

revoke all on function public.kigh_default_community_id() from public;
grant execute on function public.kigh_default_community_id()
  to anon, authenticated, service_role;

-- ─── 2. CHECK-constraint validator helpers: re-grant EXECUTE ─
-- These are pure, parameterised data validators with no side
-- effects and no table access. Migration 031 revoked them from
-- `public` and never granted EXECUTE back — fixed here.
grant execute on function public.kigh_is_valid_general_location_area(text)
  to anon, authenticated, service_role;

grant execute on function public.kigh_is_valid_professional_field(text)
  to anon, authenticated, service_role;

grant execute on function public.kigh_professional_other_ok(text, text)
  to anon, authenticated, service_role;
