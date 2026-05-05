import type { UserRole } from '@/lib/types'

/**
 * Frontend mirror of the role assignment matrix enforced server-side
 * by `supabase/functions/create-admin-user/index.ts`.
 *
 * The Edge Function is the authoritative gate — this module exists
 * only so the Admin Users UI does not surface options that will be
 * rejected. Any change here must be matched in the Edge Function
 * (and vice versa).
 *
 * Audit reference: May 2026 production-readiness run, Part A/B.
 */

const SUPER_ADMIN_ASSIGNABLE: ReadonlyArray<UserRole> = [
  'super_admin',
  'platform_admin',
  'community_admin',
  'content_manager',
  'membership_manager',
  'treasurer',
  'media_moderator',
  'ads_manager',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
  'member',
]

const PLATFORM_ADMIN_ASSIGNABLE: ReadonlyArray<UserRole> = [
  'community_admin',
  'content_manager',
  'membership_manager',
  'treasurer',
  'media_moderator',
  'ads_manager',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
  'member',
]

const COMMUNITY_ADMIN_ASSIGNABLE: ReadonlyArray<UserRole> = [
  'media_moderator',
  'ads_manager',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
  'member',
]

/**
 * Returns the set of roles a caller with `callerRole` is permitted
 * to assign when creating a new admin via the `create-admin-user`
 * Edge Function. Returns `[]` for unknown / non-elevated callers.
 */
export function assignableRolesForCaller(
  callerRole: string | null | undefined
): ReadonlyArray<UserRole> {
  switch ((callerRole ?? '').trim()) {
    case 'super_admin':
      return SUPER_ADMIN_ASSIGNABLE
    case 'platform_admin':
      return PLATFORM_ADMIN_ASSIGNABLE
    case 'community_admin':
      return COMMUNITY_ADMIN_ASSIGNABLE
    default:
      return []
  }
}

export function callerCanAssign(
  callerRole: string | null | undefined,
  targetRole: string
): boolean {
  return (assignableRolesForCaller(callerRole) as ReadonlyArray<string>).includes(targetRole)
}

/** Roles that may open the Admin Users page (i.e. anyone allowed to invite). */
export const ADMIN_USER_INVITER_ROLES: ReadonlyArray<UserRole> = [
  'super_admin',
  'platform_admin',
  'community_admin',
]

export function canInviteAdminUsers(role: string | null | undefined): boolean {
  return (ADMIN_USER_INVITER_ROLES as ReadonlyArray<string>).includes((role ?? '').trim())
}
