-- ============================================================
-- 049 — Self-heal missing profile on promote/demote
-- ============================================================
-- Migration 048's RPCs raised `target_profile_not_found` when the
-- target had a valid `auth.users` row but no `public.profiles` row.
-- That happens for users created before the migration-028 signup
-- trigger landed, or in any case where the auto-create didn't fire
-- (e.g. legacy bulk imports that wrote `members.user_id` directly).
--
-- Fix: before the role update, ensure a profiles row exists. If the
-- caller targets an auth user with no profile, seed one with role
-- 'member' using the auth user's email. After that the RPC proceeds
-- the same way it always did.
--
-- If `auth.users` *also* has no row, we still error — but with a
-- clearer code so the frontend can say "this user no longer exists"
-- instead of the confusing "target_profile_not_found".
-- ============================================================

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
  v_auth_email text;
  v_allowed text[];
  v_now timestamptz := now();
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if p_role is null or btrim(p_role) = '' then
    raise exception 'role_required';
  end if;

  select coalesce(trim(role), '') into v_caller_role
    from public.profiles where id = v_caller;
  if v_caller_role is null or v_caller_role = '' then
    raise exception 'not_authorized';
  end if;

  v_allowed := public.kigh_assignable_roles_for_caller();
  if not (p_role = any(v_allowed)) then
    raise exception 'role_not_assignable_by_caller';
  end if;

  -- Self-heal: if no profile row, but auth.users has the user, seed
  -- a minimal profile so the rest of the path works.
  select email, coalesce(trim(role), '')
    into v_target_email, v_target_current_role
    from public.profiles where id = p_user_id;

  if v_target_email is null then
    select u.email into v_auth_email
      from auth.users u where u.id = p_user_id;
    if v_auth_email is null then
      raise exception 'target_auth_user_not_found';
    end if;
    insert into public.profiles (id, email, role, created_at, updated_at)
    values (p_user_id, v_auth_email, 'member', v_now, v_now)
    on conflict (id) do update set updated_at = v_now;
    v_target_email := v_auth_email;
    v_target_current_role := 'member';
  end if;

  update public.profiles
     set role = p_role,
         updated_at = v_now
   where id = p_user_id;

  insert into public.admin_user_profiles (
    user_id, must_change_password, password_changed_at,
    temporary_password_set_at, display_name, position_title,
    created_at, updated_at
  )
  values (p_user_id, false, v_now, null, null, null, v_now, v_now)
  on conflict (user_id) do update
    set must_change_password = false,
        password_changed_at = coalesce(public.admin_user_profiles.password_changed_at, v_now),
        temporary_password_set_at = null,
        updated_at = v_now;

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
    null;
  end;
end;
$$;

-- Same self-heal on demote so symmetric flows don't trip on the
-- same condition.
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
  v_auth_email text;
  v_allowed text[];
  v_now timestamptz := now();
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if v_caller = p_user_id then
    raise exception 'cannot_demote_self';
  end if;

  select coalesce(trim(role), '') into v_caller_role
    from public.profiles where id = v_caller;

  v_allowed := public.kigh_assignable_roles_for_caller();
  if not ('member' = any(v_allowed)) then
    raise exception 'not_authorized';
  end if;

  select email, coalesce(trim(role), '')
    into v_target_email, v_target_current_role
    from public.profiles where id = p_user_id;

  if v_target_email is null then
    select u.email into v_auth_email
      from auth.users u where u.id = p_user_id;
    if v_auth_email is null then
      raise exception 'target_auth_user_not_found';
    end if;
    -- Already a member by construction; nothing further to do.
    return;
  end if;

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
