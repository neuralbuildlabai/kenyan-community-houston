import { describe, expect, it } from 'vitest'
import { isSuperAdminRole, isSystemHealthAdminRole } from '@/lib/platformAdmin'

describe('isSuperAdminRole', () => {
  it('matches super_admin only', () => {
    expect(isSuperAdminRole('super_admin')).toBe(true)
    expect(isSuperAdminRole('platform_admin')).toBe(false)
    expect(isSuperAdminRole('community_admin')).toBe(false)
    expect(isSuperAdminRole(null)).toBe(false)
    expect(isSuperAdminRole(undefined)).toBe(false)
  })
})

describe('isSystemHealthAdminRole', () => {
  it('includes super_admin and platform_admin but not community_admin', () => {
    expect(isSystemHealthAdminRole('super_admin')).toBe(true)
    expect(isSystemHealthAdminRole('platform_admin')).toBe(true)
    expect(isSystemHealthAdminRole('community_admin')).toBe(false)
  })
})
