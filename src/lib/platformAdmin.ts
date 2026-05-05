import type { UserRole } from '@/lib/types'

/** Infrastructure / system health (sidebar + RPC); not for community ops admins. */
export function isSystemHealthAdminRole(role: string | null | undefined): role is 'super_admin' | 'platform_admin' {
  return role === 'super_admin' || role === 'platform_admin'
}

export const SYSTEM_HEALTH_ADMIN_ROLES: UserRole[] = ['super_admin', 'platform_admin']
