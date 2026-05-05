import { test, expect } from '@playwright/test'
import {
  assignableRolesForCaller,
  callerCanAssign,
  canInviteAdminUsers,
} from '../../src/lib/adminRoleMatrix'

/**
 * Role-governance unit tests for the May 2026 production-readiness
 * run. These mirror the matrix enforced server-side by
 * `supabase/functions/create-admin-user/index.ts` (see Part A).
 *
 * The matrix is the contract between the Edge Function and the
 * Admin Users UI. If you change one, change both, and update
 * these tests so they keep failing for the right reasons.
 */
test.describe('admin role assignment matrix', () => {
  test('community_admin cannot create super_admin', () => {
    expect(callerCanAssign('community_admin', 'super_admin')).toBe(false)
  })

  test('community_admin cannot create platform_admin', () => {
    expect(callerCanAssign('community_admin', 'platform_admin')).toBe(false)
  })

  test('community_admin cannot create another community_admin (no peer creation)', () => {
    expect(callerCanAssign('community_admin', 'community_admin')).toBe(false)
  })

  test('community_admin can create lower operational roles', () => {
    for (const r of ['moderator', 'viewer', 'media_moderator', 'support_admin', 'business_admin', 'ads_manager', 'member']) {
      expect(callerCanAssign('community_admin', r)).toBe(true)
    }
  })

  test('platform_admin cannot create super_admin', () => {
    expect(callerCanAssign('platform_admin', 'super_admin')).toBe(false)
  })

  test('platform_admin cannot create platform_admin (peer escalation blocked)', () => {
    expect(callerCanAssign('platform_admin', 'platform_admin')).toBe(false)
  })

  test('platform_admin can create community_admin and operational roles', () => {
    for (const r of [
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
    ]) {
      expect(callerCanAssign('platform_admin', r)).toBe(true)
    }
  })

  test('super_admin can create platform_admin', () => {
    expect(callerCanAssign('super_admin', 'platform_admin')).toBe(true)
  })

  test('super_admin can create super_admin', () => {
    expect(callerCanAssign('super_admin', 'super_admin')).toBe(true)
  })

  test('super_admin can create every documented role', () => {
    for (const r of [
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
    ]) {
      expect(callerCanAssign('super_admin', r)).toBe(true)
    }
  })

  test('lower roles cannot create elevated roles', () => {
    for (const caller of ['moderator', 'viewer', 'member', 'business_admin', 'support_admin']) {
      for (const target of ['super_admin', 'platform_admin', 'community_admin']) {
        expect(callerCanAssign(caller, target)).toBe(false)
      }
    }
  })

  test('unknown caller role yields empty assignable list', () => {
    expect(assignableRolesForCaller('not_a_real_role')).toEqual([])
    expect(assignableRolesForCaller(null)).toEqual([])
    expect(assignableRolesForCaller(undefined)).toEqual([])
    expect(assignableRolesForCaller('')).toEqual([])
  })

  test('unknown target role rejected for every caller', () => {
    for (const caller of ['super_admin', 'platform_admin', 'community_admin']) {
      expect(callerCanAssign(caller, 'not_a_real_role')).toBe(false)
      expect(callerCanAssign(caller, '')).toBe(false)
    }
  })

  test('canInviteAdminUsers returns true only for elevated inviters', () => {
    expect(canInviteAdminUsers('super_admin')).toBe(true)
    expect(canInviteAdminUsers('platform_admin')).toBe(true)
    expect(canInviteAdminUsers('community_admin')).toBe(true)
    expect(canInviteAdminUsers('moderator')).toBe(false)
    expect(canInviteAdminUsers('viewer')).toBe(false)
    expect(canInviteAdminUsers('member')).toBe(false)
    expect(canInviteAdminUsers(null)).toBe(false)
  })

  test('super_admin assignable list contains super_admin and platform_admin (UI option visibility)', () => {
    const opts = assignableRolesForCaller('super_admin')
    expect(opts).toContain('super_admin')
    expect(opts).toContain('platform_admin')
  })

  test('platform_admin assignable list excludes super_admin and platform_admin (UI option visibility)', () => {
    const opts = assignableRolesForCaller('platform_admin')
    expect(opts).not.toContain('super_admin')
    expect(opts).not.toContain('platform_admin')
  })

  test('community_admin assignable list excludes super_admin/platform_admin/community_admin (UI option visibility)', () => {
    const opts = assignableRolesForCaller('community_admin')
    expect(opts).not.toContain('super_admin')
    expect(opts).not.toContain('platform_admin')
    expect(opts).not.toContain('community_admin')
  })
})
