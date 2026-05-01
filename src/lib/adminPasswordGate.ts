import type { AdminUserSecurity } from '@/lib/types'
import { adminPasswordExpired } from '@/lib/adminPasswordPolicy'

export type AdminPasswordGateReason = 'forced' | 'expired' | null

/**
 * Evaluate gate for a concrete admin_user_profiles row (e.g. admin user table).
 * Null security means the row is missing — treat as must resolve (admin tooling).
 */
export function getAdminPasswordGate(security: AdminUserSecurity | null): {
  required: boolean
  reason: AdminPasswordGateReason
} {
  if (!security) {
    return { required: true, reason: 'forced' }
  }
  if (security.must_change_password) {
    return { required: true, reason: 'forced' }
  }
  if (!security.password_changed_at) {
    return { required: true, reason: 'forced' }
  }
  if (adminPasswordExpired(security.password_changed_at)) {
    return { required: true, reason: 'expired' }
  }
  return { required: false, reason: null }
}

/**
 * Gate for the **current session** only. Non-admins never require the admin password flow.
 * When `isAdmin` is true and `security` is null (loaded, no row), fail closed for /admin.
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
