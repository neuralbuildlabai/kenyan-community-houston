-- ============================================================
-- 047 — Password policy softening + retain-password path
-- ============================================================
-- Two changes that together unblock admins (incl. the bootstrapped
-- super_admin) and align the password lifecycle with the product spec:
--
--   1. Backfill `password_changed_at` on every existing
--      admin_user_profiles row that's still NULL. Migration 039
--      created the super_admin row without setting it, which made
--      `getAdminPasswordGate()` fail closed on every login because
--      its first check is `if (!security.password_changed_at) { ... }`.
--      Also backfill profiles rows where the column drifted to NULL.
--
--   2. New RPC `kigh_extend_password_expiry()` that bumps a caller's
--      rotation timestamps **without** touching their Supabase Auth
--      password. Backs the "Keep current password" button on the
--      change-password pages — users past 180 days can opt to keep
--      their existing password (re-use is allowed) and get another
--      180-day window. Mirrors the columns the frontend reads from
--      `profiles` and `admin_user_profiles`.
--
-- Spec recap:
--   * Password changed once on first login (via temp).
--   * Valid for 180 days.
--   * Past 180 days: login still works (soft banner), user can
--     either rotate or retain their current password.
--   * Re-use allowed (handled by retain path; never asks Supabase
--     Auth to rotate the password to itself).
-- ============================================================

-- ─── 1. Backfill admin_user_profiles ──────────────────────
-- Every existing admin row gets a non-NULL `password_changed_at` so
-- the gate stops short-circuiting on the null check. We prefer the
-- row's own `created_at` so the 180-day window starts from when the
-- admin existed, not from now (which would silently extend everyone's
-- window). Fallback is now() for rows missing both.
update public.admin_user_profiles
   set password_changed_at = coalesce(password_changed_at, created_at, now()),
       updated_at = now()
 where password_changed_at is null;

-- ─── 2. Backfill profiles ─────────────────────────────────
-- Same idea for the member-side gate. If `password_changed_at` is
-- NULL but `password_expires_at` is set, infer back from expiry;
-- otherwise fall through to created_at / now().
update public.profiles
   set password_changed_at = coalesce(
         password_changed_at,
         case
           when password_expires_at is not null
             then password_expires_at - interval '180 days'
           else null
         end,
         created_at,
         now()
       ),
       password_expires_at = coalesce(
         password_expires_at,
         coalesce(password_changed_at, created_at, now()) + interval '180 days'
       ),
       updated_at = now()
 where password_changed_at is null or password_expires_at is null;

-- ─── 3. Retain-password RPC ────────────────────────────────
-- Lets a signed-in user reset their rotation window without changing
-- the actual password in Supabase Auth. Updates both the profile and
-- (when present) the admin_user_profiles row in one call so the two
-- gates see a consistent view.
--
-- Permissions: any authenticated user can extend their own expiry.
-- This is the "Keep using it" affordance — we explicitly want it
-- self-serve so admins don't pile up at the support inbox at the
-- 180-day mark.
create or replace function public.kigh_extend_password_expiry()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
     set password_changed_at = v_now,
         password_expires_at = v_now + interval '180 days',
         force_password_change = false,
         updated_at = v_now
   where id = v_uid;

  update public.admin_user_profiles
     set password_changed_at = v_now,
         must_change_password = false,
         updated_at = v_now
   where user_id = v_uid;
end;
$$;

comment on function public.kigh_extend_password_expiry() is
  'Bumps the caller''s password rotation timestamps by 180 days without changing the Supabase Auth password. Backs the "Keep current password" UI affordance. See migration 047.';

revoke all on function public.kigh_extend_password_expiry() from public;
grant execute on function public.kigh_extend_password_expiry() to authenticated;

-- ─── 4. Sanity reset of stuck force-change flags ──────────
-- Defensive: an admin who's been bouncing between login and
-- change-password may have a stale `force_password_change = true`
-- left on their profile because the change flow failed midway.
-- Clear it for any row where `password_changed_at` is now set —
-- the gate will still fire correctly for fresh temp-password admins
-- because `createAdminUserLogic.ts` sets BOTH columns at create time.
update public.profiles
   set force_password_change = false,
       updated_at = now()
 where force_password_change = true
   and password_changed_at is not null
   and (password_expires_at is null or password_expires_at > now() - interval '180 days');
