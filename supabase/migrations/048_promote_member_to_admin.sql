-- ============================================================
-- 048 — Promote an existing member to admin (and demote back)
-- ============================================================
-- Closes the gap that surfaced during the May 2026 launch readiness
-- pass: there was no in-app path to take an existing member (who
-- already has an auth account) and grant them admin powers without
-- creating a fresh account with a temp password.
--
-- Two SECURITY DEFINER functions:
--
--   * kigh_promote_member_to_admin(p_user_id, p_role) —
--     Server-side mirror of `src/lib/adminRoleMatrix.ts`. The caller's
--     `profiles.role` decides what target roles they may assign.
--     super_admin: anything. platform_admin: community_admin + below.
--     community_admin: media_moderator and below. Anyone else: nothing.
--
--     Updates `profiles.role` to the target role and upserts an
--     `admin_user_profiles` row with `must_change_password = false`
--     and `password_changed_at = now()` — the user already has a
--     working password, so we don't force them through the change
--     flow. The 180-day soft prompt still applies from migration 047.
--
--   * kigh_demote_admin_to_member(p_user_id) —
--     Symmetric path: resets the target's role to 'member' and
--     removes their `admin_user_profiles` row. Same matrix governs
--     who can demote whom. A user may not demote themselves (avoids
--     the "last super_admin locks themselves out" footgun).
--
-- Both functions write to `audit_logs` (migration 015) so the trail
-- is queryable in admin tools.
-- ============================================================

-- ─── 1. Helper: assignable roles for a caller ─────────────
-- Returns the array of role labels the caller can assign. Mirror of
-- `assignableRolesForCaller` in adminRoleMatrix.ts.
create or replace function public.kigh_assignable_roles_for_caller()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when (select coalesce(trim(p.role), '') from public.profiles p where p.id = auth.uid()) = 'super_admin'
      then array[
        'super_admin','platform_admin','community_admin','content_manager',
        'membership_manager','treasurer','media_moderator','ads_manager',
        'business_admin','support_admin','moderator','viewer','member'
      ]::text[]
    when (select coalesce(trim(p.role), '') from public.profiles p where p.id = auth.uid()) = 'platform_admin'
      then array[
        'community_admin','content_manager','membership_manager','treasurer',
        'media_moderator','ads_manager','business_admin','support_admin',
        'moderator','viewer','member'
      ]::text[]
    when (select coalesce(trim(p.role), '') from public.profiles p where p.id = auth.uid()) = 'community_admin'
      then array[
        'media_moderator','ads_manager','business_admin','support_admin',
        'moderator','viewer','member'
      ]::text[]
    else array[]::text[]
  end;
$$;

revoke all on function public.kigh_assignable_roles_for_caller() from public;
grant execute on function public.kigh_assignable_roles_for_caller() to authenticated;

comment on function public.kigh_assignable_roles_for_caller() is
  'Roles the current caller may assign via kigh_promote_member_to_admin. Mirrors src/lib/adminRoleMatrix.ts.';

-- ─── 2. Promote ────────────────────────────────────────────
create or replace function public.kigh_promote_member_to_admin(
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_target_email text;
  v_target_current_role text;
  v_allowed text[];
  v_now timestamptz := now();
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if p_role is null or btrim(p_role) = '' then
    raise exception 'role_required';
  end if;

  select coalesce(trim(role), '')
    into v_caller_role
    from public.profiles
   where id = v_caller;

  if v_caller_role is null or v_caller_role = '' then
    raise exception 'not_authorized';
  end if;

  v_allowed := public.kigh_assignable_roles_for_caller();
  if not (p_role = any(v_allowed)) then
    raise exception 'role_not_assignable_by_caller';
  end if;

  select email, coalesce(trim(role), '')
    into v_target_email, v_target_current_role
    from public.profiles
   where id = p_user_id;

  if v_target_email is null then
    raise exception 'target_profile_not_found';
  end if;

  -- Update the profile role. The role-guard trigger from migration 020
  -- already checks the caller has authority for the target role, but
  -- the matrix above is stricter so we win.
  update public.profiles
     set role = p_role,
         updated_at = v_now
   where id = p_user_id;

  -- Ensure admin_user_profiles exists and is in a clean state. We
  -- explicitly set must_change_password=false and bump
  -- password_changed_at so the gate (post-047) is happy without
  -- forcing the user through change-password on next login.
  insert into public.admin_user_profiles (
    user_id,
    must_change_password,
    password_changed_at,
    temporary_password_set_at,
    display_name,
    position_title,
    created_at,
    updated_at
  )
  values (
    p_user_id,
    false,
    v_now,
    null,
    null,
    null,
    v_now,
    v_now
  )
  on conflict (user_id) do update
    set must_change_password = false,
        password_changed_at = coalesce(public.admin_user_profiles.password_changed_at, v_now),
        temporary_password_set_at = null,
        updated_at = v_now;

  -- Audit trail (defensive — audit_logs is from migration 015).
  begin
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      v_caller,
      'promote_member_to_admin',
      'profiles',
      p_user_id,
      jsonb_build_object(
        'previous_role', v_target_current_role,
        'new_role', p_role,
        'target_email', v_target_email
      )
    );
  exception when others then
    -- Don't fail the promotion if the audit table is missing or RLS
    -- blocks the insert. Promotion is the user-visible win.
    null;
  end;
end;
$$;

revoke all on function public.kigh_promote_member_to_admin(uuid, text) from public;
grant execute on function public.kigh_promote_member_to_admin(uuid, text) to authenticated;

comment on function public.kigh_promote_member_to_admin(uuid, text) is
  'Elevate an existing member to the given admin role. Caller must be allowed to assign p_role per the role-assignment matrix.';

-- ─── 3. Demote ─────────────────────────────────────────────
create or replace function public.kigh_demote_admin_to_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_target_email text;
  v_target_current_role text;
  v_allowed text[];
  v_now timestamptz := now();
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if v_caller = p_user_id then
    raise exception 'cannot_demote_self';
  end if;

  select coalesce(trim(role), '')
    into v_caller_role
    from public.profiles
   where id = v_caller;

  v_allowed := public.kigh_assignable_roles_for_caller();
  -- A caller can demote only if they're allowed to *assign* 'member'.
  -- All three admin tiers (super, platform, community) include
  -- 'member' in their assignable list, so this is essentially a
  -- "must be an admin who could create the role they're demoting"
  -- check.
  if not ('member' = any(v_allowed)) then
    raise exception 'not_authorized';
  end if;

  select email, coalesce(trim(role), '')
    into v_target_email, v_target_current_role
    from public.profiles
   where id = p_user_id;

  if v_target_email is null then
    raise exception 'target_profile_not_found';
  end if;

  -- A community_admin cannot demote a community_admin / platform_admin
  -- / super_admin (since they couldn't have promoted them either).
  if not (v_target_current_role = any(v_allowed))
     and v_target_current_role <> 'member' then
    raise exception 'target_outranks_caller';
  end if;

  update public.profiles
     set role = 'member',
         updated_at = v_now
   where id = p_user_id;

  delete from public.admin_user_profiles where user_id = p_user_id;

  begin
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      v_caller,
      'demote_admin_to_member',
      'profiles',
      p_user_id,
      jsonb_build_object(
        'previous_role', v_target_current_role,
        'new_role', 'member',
        'target_email', v_target_email
      )
    );
  exception when others then
    null;
  end;
end;
$$;

revoke all on function public.kigh_demote_admin_to_member(uuid) from public;
grant execute on function public.kigh_demote_admin_to_member(uuid) to authenticated;

comment on function public.kigh_demote_admin_to_member(uuid) is
  'Reset an admin user back to role=''member'' and remove their admin_user_profiles row.';
