-- ============================================================
-- 020 — profiles.role privilege-escalation guard
-- ============================================================
-- Context (May 2026 pre-duplication audit)
--   Migration 010 created `public.profiles` with
--     `role text not null default 'community_admin'`.
--   Migration 010 also added the policy
--     `create policy "profiles insert own"
--        on public.profiles for insert
--        with check (id = auth.uid());`
--   That policy does NOT restrict `role`, and `community_admin`
--   sits in `kigh_is_elevated_admin()`'s allowed set
--   (migration 013). The combination meant any authenticated
--   user (including a self-signup if Supabase email signup is on)
--   could insert their own profiles row and inherit elevated
--   admin privileges via the column default — and could pass
--   `role: 'super_admin'` explicitly with no rejection.
--
--   The `src/pages/member/ProfilePage.tsx` auto-create flow also
--   relied on the default, so any board-issued auth user would
--   silently become an elevated admin on first profile load.
--
-- Fix
--   1. Lower the default to a non-elevated role (`'member'`).
--   2. Install a BEFORE INSERT/UPDATE trigger that demotes any
--      attempt by a non-admin caller to set `role` to an elevated
--      value back to the safe default (or to the previous role on
--      UPDATE). Service-role / DEFINER calls (no `auth.uid()`)
--      are exempt so seeding/admin RPCs continue to work.
--   3. Tighten the RLS WITH CHECK predicates as belt-and-braces.
--   4. Idempotent / safe to re-run on staging and on a fresh
--      production project.
--
-- Notes
--   - This migration is ADDITIVE. It does not modify any existing
--     row's role. Any current admins already in `profiles` keep
--     their role.
--   - Frontend `src/lib/types.ts` already lacks `'member'` in
--     `ELEVATED_ADMIN_ROLES`, so adding `'member'` to the
--     `UserRole` union is purely a typing improvement.
--
-- ============================================================

-- ─── 1. Safer default role ──────────────────────────────────
alter table public.profiles
  alter column role set default 'member';

-- ─── 2. Privilege-escalation guard trigger ──────────────────
create or replace function public.kigh_profiles_role_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_caller_is_admin boolean;
  v_old_role text;
  v_elevated text[] := array[
    'super_admin',
    'community_admin',
    'admin',
    'content_manager',
    'membership_manager',
    'treasurer',
    'media_moderator',
    'ads_manager',
    -- Legacy roles preserved for backward compatibility.
    'business_admin',
    'support_admin',
    'moderator'
  ];
begin
  -- Service role / SECURITY DEFINER paths have no auth.uid().
  -- Trust them; the RLS layer is bypassed in those contexts.
  if v_uid is null then
    return new;
  end if;

  v_caller_is_admin := public.kigh_is_elevated_admin();

  if tg_op = 'INSERT' then
    -- Self-insert: never let a non-admin claim an elevated role.
    if not v_caller_is_admin and new.role = any(v_elevated) then
      new.role := 'member';
    end if;
  elsif tg_op = 'UPDATE' then
    v_old_role := coalesce(old.role, 'member');
    if new.role is distinct from v_old_role and not v_caller_is_admin then
      -- Non-admins may not change their own role.
      new.role := v_old_role;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.kigh_profiles_role_guard() from public;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before insert or update on public.profiles
  for each row execute function public.kigh_profiles_role_guard();

comment on function public.kigh_profiles_role_guard() is
  'Demotes self-set elevated roles on profiles (insert/update) when caller is not already an elevated admin. Service-role paths bypass.';

-- ─── 3. Tighten profiles RLS belt-and-braces ────────────────
-- The trigger above is the authoritative guard. The RLS policies
-- below add a second safety net so a future schema change cannot
-- silently re-open the hole.

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
  on public.profiles for insert
  with check (
    id = auth.uid()
    and (
      coalesce(role, 'member') in ('member', 'viewer')
      or public.kigh_is_elevated_admin()
    )
  );

drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin"
  on public.profiles for update
  using (id = auth.uid() or public.kigh_is_elevated_admin())
  with check (
    (id = auth.uid() or public.kigh_is_elevated_admin())
    and (
      -- Non-admin self-updates may not change role at all.
      public.kigh_is_elevated_admin()
      or role = (select p.role from public.profiles p where p.id = profiles.id)
    )
  );

-- profiles insert admin policy (already exists from 010); recreate
-- defensively so its WITH CHECK matches the new model.
drop policy if exists "profiles insert admin" on public.profiles;
create policy "profiles insert admin"
  on public.profiles for insert
  with check (public.kigh_is_elevated_admin());

-- ─── 4. Document the safe role list ─────────────────────────
comment on column public.profiles.role is
  'User role. Default ''member''. Elevated values (community_admin, super_admin, admin, content_manager, membership_manager, treasurer, media_moderator, ads_manager and legacy business_admin/support_admin/moderator) require an admin caller to assign — see kigh_profiles_role_guard().';
