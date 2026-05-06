-- ============================================================
-- 026 — Document legacy member cleanup + link helper (no behavior change)
-- ============================================================
-- `public.kigh_link_member_to_user(p_member_id, p_user_id)` is defined
-- in migration 016. It is SECURITY DEFINER and restricted to callers
-- where public.kigh_is_elevated_admin() is true.
--
-- Audit legacy rows (run in SQL editor / psql):
--   select id, email, first_name, last_name, submitted_at
--   from public.members
--   where user_id is null
--   order by submitted_at desc nulls last;
--
-- After creating the real Supabase Auth user for an applicant, link:
--   select public.kigh_link_member_to_user('<member_uuid>'::uuid, '<auth_user_uuid>'::uuid);
--
-- Before linking, ensure no other members row already uses the same
-- user_id (unique index members_user_id_unique_idx). Resolve duplicate
-- emails manually if an old anon row conflicts with a new auth user.
-- ============================================================

comment on function public.kigh_link_member_to_user(uuid, uuid) is
  'Elevated-admin only. Sets members.user_id to an existing auth.users id and stamps reviewed_at. Use after creating or locating the Auth user for a legacy applicant. Does not validate email equality — admins must verify identity out of band.';
