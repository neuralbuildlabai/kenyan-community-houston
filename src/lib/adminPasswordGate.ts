import type { AdminUserSecurity } from '@/lib/types'
import { adminPasswordExpired } from '@/lib/adminPasswordPolicy'

export type AdminPasswordGateReason = 'forced' | 'expired' | null

/**
 * Hard-block gate for the admin area. Per migration 047 / the May 2026
 * spec, the only hard-block case is the explicit `must_change_password`
 * flag — set when an admin's temp password was issued by another admin.
 *
 * Expiry (>180 days since last rotation) is now a soft prompt, not a
 * redirect — see `isAdminPasswordExpiryReached`.
 *
 * Missing `admin_user_profiles` row no longer fails closed; the admin
 * can still navigate. This trades a tiny amount of defense-in-depth for
 * not locking elevated users out when their row was never created.
 */
export function getAdminPasswordGate(security: AdminUserSecurity | null): {
  required: boolean
  reason: AdminPasswordGateReason
} {
  if (!security) {
    return { required: false, reason: null }
  }
  if (security.must_change_password) {
    return { required: true, reason: 'forced' }
  }
  return { required: false, reason: null }
}

/**
 * Soft signal: caller's admin password is at or past 180 days.
 * Drives the expiry banner. Returns false when there's no metadata
 * (fresh row) so we don't nag accounts that haven't rotated yet.
 */
export function isAdminPasswordExpiryReached(security: AdminUserSecurity | null): boolean {
  if (!security || !security.password_changed_at) return false
  return adminPasswordExpired(security.password_changed_at)
}

/**
 * Session-scoped gate. Non-admins never go through the admin flow.
 */
export function getSessionAdminPasswordGate(
  isAdmin: boolean,
  security: AdminUserSecurity | null
): {
  required: boolean
  reason: AdminPasswordGateReason
} {
  if (!isAdmin) {
    return { required: false, reason: null }
  }
  return getAdminPasswordGate(security)
}
