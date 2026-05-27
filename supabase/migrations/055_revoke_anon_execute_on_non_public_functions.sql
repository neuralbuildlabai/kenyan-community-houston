-- ============================================================
-- 055 — Revoke anon EXECUTE on SECURITY DEFINER functions that
--       were never meant to be PostgREST-callable by anon.
-- ============================================================
-- Addresses Supabase lints:
--   * 0028_anon_security_definer_function_executable
--   * 0029_authenticated_security_definer_function_executable
--
-- IMPORTANT: We deliberately DO NOT touch:
--
--   1. RLS helper functions. `is_admin`, `kigh_is_elevated_admin`,
--      `kigh_is_platform_super_admin`, `kigh_is_system_health_admin`,
--      `kigh_current_user_role`, `kigh_default_community_id`,
--      `kigh_has_community_role`, `kigh_feed_safe_display_name`,
--      `kigh_agm_quorum_required`. These are called from RLS
--      policies in the calling role's context, so revoking EXECUTE
--      from anon or authenticated would break RLS evaluation for
--      those roles (queries would fail with "permission denied
--      for function"). The lint warning on these is accepted.
--
--   2. Public RPCs intentionally callable by anon:
--      `list_active_community_ads`, `list_community_feed_posts`,
--      `list_community_feed_comments`, `list_public_community_groups`,
--      `create_event_vendor_signup`, `create_event_volunteer_signup`,
--      `public_event_vendor_signup_count`,
--      `public_event_volunteer_signup_count`, `kigh_poll_results`,
--      `kigh_is_approved_member`.
--
-- Classification of what we DO change:
--
--   A) Trigger functions — revoke from public, anon, authenticated.
--      Triggers run in the table-owner context and never need any
--      EXECUTE grant via PostgREST. Removing the grant closes the
--      lint without affecting trigger behavior.
--
--   B) Admin-only RPCs — revoke from anon, keep authenticated.
--      Internal `is_admin()` / role checks inside each function
--      still gate non-admin authenticated callers.
--
--   C) Authenticated-only RPCs — revoke from anon, keep authenticated.
--
-- All revokes are idempotent (REVOKE on something already revoked
-- is a no-op).
-- ============================================================

-- ─── A. Trigger functions (no PostgREST exposure needed) ─────────

revoke all on function public.chat_messages_after_insert_bump_thread()
  from public, anon, authenticated;
revoke all on function public.chat_messages_community_safety_guard()
  from public, anon, authenticated;
revoke all on function public.event_comments_community_safety_guard()
  from public, anon, authenticated;
revoke all on function public.kigh_on_auth_user_created()
  from public, anon, authenticated;
revoke all on function public.kigh_on_auth_user_updated()
  from public, anon, authenticated;
revoke all on function public.kigh_profiles_role_guard()
  from public, anon, authenticated;
revoke all on function public.member_invites_note_safety_guard()
  from public, anon, authenticated;

-- ─── B. Admin-only RPCs — strip anon, keep authenticated ─────────
-- Internal admin role checks inside each function continue to gate
-- non-admin callers. Revoking anon EXECUTE prevents unauthenticated
-- probing of these endpoints via /rest/v1/rpc.

revoke execute on function public.admin_delete_gallery_image(uuid)
  from anon, public;
revoke execute on function public.admin_list_gallery_images()
  from anon, public;
revoke execute on function public.admin_set_gallery_image_status(uuid, text)
  from anon, public;
revoke execute on function public.admin_update_member_status(uuid, text, text, boolean)
  from anon, public;
revoke execute on function public.kigh_admin_analytics_summary(integer)
  from anon, public;
revoke execute on function public.kigh_admin_engagement_by_week(integer)
  from anon, public;
revoke execute on function public.kigh_admin_login_counts(integer)
  from anon, public;
revoke execute on function public.kigh_admin_member_demographics()
  from anon, public;
revoke execute on function public.kigh_admin_member_growth_by_week(integer)
  from anon, public;
revoke execute on function public.kigh_admin_system_health()
  from anon, public;
revoke execute on function public.kigh_admin_top_clicks(integer, integer)
  from anon, public;
revoke execute on function public.kigh_demote_admin_to_member(uuid)
  from anon, public;
revoke execute on function public.kigh_promote_member_to_admin(uuid, text)
  from anon, public;
revoke execute on function public.kigh_link_member_to_user(uuid, uuid)
  from anon, public;
revoke execute on function public.kigh_record_audit(text, text, uuid, uuid, jsonb)
  from anon, public;
revoke execute on function public.kigh_profile_force_password_change(uuid)
  from anon, public;
revoke execute on function public.moderate_feed_comment(uuid, text, text)
  from anon, public;
revoke execute on function public.moderate_feed_post(uuid, text, text)
  from anon, public;

-- rls_auto_enable() is not created by any in-repo migration but was
-- found on the production database (likely an out-of-band install).
-- Revoke conditionally so this migration is safe in environments
-- where the function does not exist.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and p.pronargs = 0
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from anon, public';
  end if;
end
$$;

-- ─── C. Authenticated-only RPCs — strip anon ─────────────────────

revoke execute on function public.claim_or_create_member_for_auth_user()
  from anon, public;
revoke execute on function public.close_chat_request(uuid, text)
  from anon, public;
revoke execute on function public.create_chat_request(text, text, text)
  from anon, public;
revoke execute on function public.create_feed_comment(uuid, text)
  from anon, public;
revoke execute on function public.create_feed_post(text, text, boolean)
  from anon, public;
revoke execute on function public.feed_post_limit_status()
  from anon, public;
revoke execute on function public.kigh_apply_profile_password_rotation()
  from anon, public;
revoke execute on function public.kigh_assignable_roles_for_caller()
  from anon, public;
revoke execute on function public.kigh_extend_password_expiry()
  from anon, public;
revoke execute on function public.kigh_my_poll_vote(uuid)
  from anon, public;
revoke execute on function public.kigh_sync_member_record_for_auth_user(uuid)
  from anon, public;
revoke execute on function public.submit_membership_registration(jsonb)
  from anon, public;
revoke execute on function public.toggle_feed_post_comments(uuid, boolean)
  from anon, public;

-- ─── Notes ───────────────────────────────────────────────────────
-- After this migration the Supabase linter should still show
-- 0028/0029 warnings for the RLS helpers and the intentionally
-- public RPCs listed above. Those are accepted and documented;
-- they cannot be revoked without breaking RLS or the public-facing
-- features (anonymous event signup, community feed reads, etc).
--
-- The leaked-password-protection auth lint
-- (`auth_leaked_password_protection`) is a Supabase Dashboard
-- toggle, not a SQL setting. Enable it at:
--   Project Settings → Authentication → Password security →
--   "Enable Leaked Password Protection"
