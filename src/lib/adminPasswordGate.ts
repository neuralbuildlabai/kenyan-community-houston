import type { AdminUserSecurity } from '@/lib/types'
import { adminPasswordExpired } from '@/lib/adminPasswordPolicy'

export type AdminPasswordGateReason = 'forced' | 'expired' | null

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
