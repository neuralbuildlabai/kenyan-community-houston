-- ============================================================
-- 013 — Security repair: is_admin() now requires elevated role
-- ============================================================
-- Context
--   The legacy `public.is_admin()` returned true for any authenticated
--   user (`auth.uid() is not null`). Every "Admins have full access"
--   RLS policy across the schema therefore collapsed to "any signed-in
--   user has admin powers." This migration repairs that without
--   dropping or rewriting the dozens of policies that already reference
--   `is_admin()`.
--
-- Strategy
--   1. Extend the existing secure helper `public.kigh_is_elevated_admin()`
--      to recognise the full role set (legacy + new spec roles).
--   2. Add new helpers:
--        - public.kigh_current_user_role()        : text
--        - public.kigh_is_platform_super_admin()  : boolean
--        - public.kigh_has_community_role(...)    : boolean
--   3. Replace `public.is_admin()` so it now delegates to
--      `public.kigh_is_elevated_admin()`. Existing policies keep working
--      and become safe automatically.
--
-- Notes
--   - Idempotent / safe to re-run.
--   - Does not drop any existing policy.
--   - Does not relax member self-RLS introduced by 012.
--   - `kigh_has_community_role` is forward-looking: it checks
--     `community_admin_roles` if that table exists (introduced in 014),
--     and falls back to legacy `profiles.role` semantics so this
--     migration can land before 014 without breaking.

-- ─── Recreate elevated admin helper with full role set ──────
create or replace function public.kigh_is_elevated_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(trim(p.role), '') in (
        -- New spec roles
        'super_admin',
        'community_admin',
        'admin',
        'content_manager',
        'membership_manager',
        'treasurer',
        'media_moderator',
        'ads_manager',
        -- Legacy roles preserved for backward compatibility
        'business_admin',
        'support_admin',
        'moderator'
      )
  );
$$;

revoke all on function public.kigh_is_elevated_admin() from public;
grant execute on function public.kigh_is_elevated_admin() to authenticated, anon;

-- ─── Current user role helper (text) ─────────────────────────
create or replace function public.kigh_current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(trim(p.role), '')
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.kigh_current_user_role() from public;
grant execute on function public.kigh_current_user_role() to authenticated, anon;

-- ─── Platform-level super admin helper ──────────────────────
create or replace function public.kigh_is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(trim(p.role), '') = 'super_admin'
  );
$$;

revoke all on function public.kigh_is_platform_super_admin() from public;
grant execute on function public.kigh_is_platform_super_admin() to authenticated, anon;

-- ─── Community-scoped role check ────────────────────────────
-- Returns true if the current user has any of `required_roles` for
-- `target_community_id`. If `target_community_id` is null, returns
-- true if the user has the role on ANY community (legacy/global
-- admin behaviour). Falls back to `profiles.role` if the
-- `community_admin_roles` table does not yet exist (pre-migration 014).
create or replace function public.kigh_has_community_role(
  required_roles text[],
  target_community_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_has boolean;
  v_table_exists boolean;
begin
  if v_uid is null then
    return false;
  end if;

  if required_roles is null or array_length(required_roles, 1) is null then
    return false;
  end if;

  -- Super admins always pass.
  if public.kigh_is_platform_super_admin() then
    return true;
  end if;

  v_role := public.kigh_current_user_role();
  if v_role = '' or v_role is null then
    return false;
  end if;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'community_admin_roles'
  ) into v_table_exists;

  if v_table_exists then
    -- Community-scoped membership check
    execute format($q$
      select exists (
        select 1
        from public.community_admin_roles car
        where car.user_id = $1
          and coalesce(trim(car.status), 'active') = 'active'
          and car.role = any($2)
          and ($3 is null or car.community_id = $3)
      )
    $q$)
    using v_uid, required_roles, target_community_id
    into v_has;

    if v_has then
      return true;
    end if;
  end if;

  -- Fallback: check profiles.role
  return v_role = any(required_roles);
end;
$$;

revoke all on function public.kigh_has_community_role(text[], uuid) from public;
grant execute on function public.kigh_has_community_role(text[], uuid) to authenticated, anon;

-- ─── Repair `is_admin()` ────────────────────────────────────
-- This is the security blocker: the original implementation returned
-- true for any authenticated user. We now delegate to the elevated
-- check so every existing RLS policy that referenced `is_admin()`
-- becomes safe in one step.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.kigh_is_elevated_admin();
$$;

comment on function public.is_admin() is
  'Returns true only for elevated admin roles in profiles.role. Repaired in migration 013.';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;
