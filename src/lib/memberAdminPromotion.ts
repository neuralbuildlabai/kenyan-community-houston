import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/lib/types'

/**
 * Thin wrappers around the migration-048 RPCs that elevate an existing
 * member to an admin role (or demote them back to plain member).
 *
 * The frontend already has a role-assignment matrix in
 * `src/lib/adminRoleMatrix.ts` for the "create new admin" flow; this
 * module is the parallel for the "promote existing member" flow.
 * Server-side, both flows are gated by the same matrix.
 */

/**
 * Roles the *current* caller is allowed to assign, fetched server-side.
 * Source of truth — the frontend matrix is a cache for UX, but here we
 * round-trip so the picker never offers a role the RPC will reject.
 */
export async function fetchAssignableRolesForCaller(): Promise<UserRole[]> {
  const { data, error } = await supabase.rpc('kigh_assignable_roles_for_caller')
  if (error) throw error
  return ((data as string[] | null) ?? []) as UserRole[]
}

/** Read a member's current `profiles.role` (admins-only via RLS). */
export async function fetchProfileRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (error) return null
  if (!data) return null
  return (data as { role: UserRole }).role
}

/**
 * Promote a member to the given admin role. Server enforces who can
 * assign what; on rejection the RPC raises with one of:
 *   - not_authenticated
 *   - role_required
 *   - not_authorized
 *   - role_not_assignable_by_caller
 *   - target_profile_not_found
 */
export async function promoteMemberToAdmin(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.rpc('kigh_promote_member_to_admin', {
    p_user_id: userId,
    p_role: role,
  })
  if (error) throw error
}

/**
 * Reset an admin back to `role = 'member'` and clear their
 * admin_user_profiles row. Errors out on `cannot_demote_self` (caller
 * may not demote themselves) and `target_outranks_caller` (a
 * community_admin can't demote a platform_admin, etc).
 */
export async function demoteAdminToMember(userId: string): Promise<void> {
  const { error } = await supabase.rpc('kigh_demote_admin_to_member', {
    p_user_id: userId,
  })
  if (error) throw error
}

/**
 * Human-readable label for a role. Used by the picker.
 */
export const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  platform_admin: 'Platform admin',
  community_admin: 'Community admin',
  content_manager: 'Content manager',
  membership_manager: 'Membership manager',
  treasurer: 'Treasurer',
  media_moderator: 'Media moderator',
  ads_manager: 'Ads manager',
  business_admin: 'Business admin',
  support_admin: 'Support admin',
  moderator: 'Moderator',
  viewer: 'Viewer',
  member: 'Member',
}
