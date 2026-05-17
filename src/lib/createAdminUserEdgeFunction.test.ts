import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { callerCanAssign } from './adminRoleMatrix'
import {
  buildAdminUserProfilesRow,
  buildAdminUsersRow,
  buildCallerAdminLookupOrFilter,
  buildProfilesRow,
  isAuthUserAlreadyRegistered,
  resolveCallerRole,
} from '../../supabase/functions/_shared/createAdminUserLogic'

describe('create-admin-user edge function', () => {
  const fnSrc = readFileSync(
    resolve(process.cwd(), 'supabase/functions/create-admin-user/index.ts'),
    'utf8'
  )
  const corsSrc = readFileSync(
    resolve(process.cwd(), 'supabase/functions/_shared/cors.ts'),
    'utf8'
  )

  it('handles OPTIONS before Authorization check', () => {
    expect(fnSrc).toContain('handleCorsPreflight(req)')
    const optionsHandler = fnSrc.indexOf('handleCorsPreflight')
    const authCheck = fnSrc.indexOf('Authorization')
    expect(optionsHandler).toBeGreaterThan(-1)
    expect(authCheck).toBeGreaterThan(optionsHandler)
  })

  it('CORS allows POST and OPTIONS with required headers', () => {
    expect(corsSrc).toContain("'Access-Control-Allow-Methods': 'POST, OPTIONS'")
    expect(corsSrc).toContain('authorization, x-client-info, apikey, content-type')
    expect(corsSrc).toContain('kenyansingreaterhouston.org')
    expect(corsSrc).toContain('kenyan-community-houston-')
  })

  it('does not use wildcard Access-Control-Allow-Origin', () => {
    expect(fnSrc).not.toContain("'Access-Control-Allow-Origin': '*'")
    expect(corsSrc).not.toContain("'Access-Control-Allow-Origin': '*'")
  })

  it('super_admin can assign platform_admin (mirrors Edge matrix)', () => {
    expect(callerCanAssign('super_admin', 'platform_admin')).toBe(true)
  })

  it('super_admin can assign super_admin', () => {
    expect(callerCanAssign('super_admin', 'super_admin')).toBe(true)
  })

  it('platform_admin cannot assign super_admin', () => {
    expect(callerCanAssign('platform_admin', 'super_admin')).toBe(false)
  })

  it('platform_admin cannot assign platform_admin (no peer creation)', () => {
    expect(callerCanAssign('platform_admin', 'platform_admin')).toBe(false)
  })

  it('community_admin cannot assign elevated roles', () => {
    expect(callerCanAssign('community_admin', 'super_admin')).toBe(false)
    expect(callerCanAssign('community_admin', 'platform_admin')).toBe(false)
    expect(callerCanAssign('community_admin', 'community_admin')).toBe(false)
  })

  it('non-elevated roles cannot assign admin users', () => {
    expect(callerCanAssign('moderator', 'platform_admin')).toBe(false)
    expect(callerCanAssign('member', 'community_admin')).toBe(false)
  })

  it('uses admin_users as primary caller permission source', () => {
    expect(fnSrc).toContain('userData.user.email')
    expect(fnSrc).toContain('buildCallerAdminLookupOrFilter')
    expect(fnSrc).toContain("select('id, email, role')")
    expect(fnSrc).toContain('resolveCallerRole(callerAdminRow')
    expect(fnSrc).toContain("'CALLER_PERMISSION_LOOKUP_FAILED'")
    expect(fnSrc).toContain("'CALLER_NOT_ADMIN'")
  })

  it('profiles is legacy fallback only when admin_users row is missing', () => {
    const permissionBlock = fnSrc.slice(
      fnSrc.indexOf('const callerId = userData.user.id'),
      fnSrc.indexOf('let body: Body')
    )
    expect(permissionBlock).toContain("from('admin_users')")
    expect(permissionBlock).toMatch(/if\s*\(\s*!callerAdminRow\s*\)[\s\S]*from\('profiles'\)/)
    expect(permissionBlock).not.toMatch(
      /from\('profiles'\)[\s\S]*resolveCallerRole[\s\S]*from\('admin_users'\)/
    )
  })

  it('does not read caller role from profiles when admin_users row exists', () => {
    expect(fnSrc).toContain('if (!callerAdminRow)')
    expect(fnSrc).not.toContain('const callerRole = (profileRow?.role')
  })

  it('returns structured error payloads with ok false', () => {
    expect(fnSrc).toContain('errorJson')
    expect(fnSrc).toContain("'config_missing'")
    expect(fnSrc).toContain("'admin_users_upsert_failed'")
    expect(fnSrc).toContain("'profiles_upsert_failed'")
    expect(fnSrc).toContain("'admin_user_profiles_upsert_failed'")
  })

  it('validates SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY separately', () => {
    expect(fnSrc).toContain("Deno.env.get('SUPABASE_URL')")
    expect(fnSrc).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')")
    expect(fnSrc).toContain('SUPABASE_URL is not set')
    expect(fnSrc).toContain('SUPABASE_SERVICE_ROLE_KEY is not set')
  })

  it('reuses existing auth user when createUser reports duplicate email', () => {
    expect(fnSrc).toContain('isAuthUserAlreadyRegistered')
    expect(fnSrc).toContain('findAuthUserByEmail')
    expect(fnSrc).toContain('updateUserById')
    expect(fnSrc).toContain('reusedExistingAuthUser')
  })

  it('upserts admin_users before admin_user_profiles and profiles', () => {
    const adminUsersUpsertIdx = fnSrc.indexOf('const adminUsersRow = buildAdminUsersRow')
    const securityRowIdx = fnSrc.indexOf('const securityRow = buildAdminUserProfilesRow')
    const profilesUpsertIdx = fnSrc.indexOf('.upsert(\n        buildProfilesRow({')
    expect(adminUsersUpsertIdx).toBeGreaterThan(-1)
    expect(securityRowIdx).toBeGreaterThan(adminUsersUpsertIdx)
    expect(profilesUpsertIdx).toBeGreaterThan(securityRowIdx)
    expect(fnSrc).toMatch(/from\('admin_users'\)[\s\S]*onConflict:\s*'id'/)
    expect(fnSrc).toMatch(/from\('admin_user_profiles'\)[\s\S]*onConflict:\s*'user_id'/)
  })

  it('upserts admin_users with id email role and must_change_password', () => {
    expect(fnSrc).toContain('buildAdminUsersRow')
    expect(fnSrc).toContain("from('admin_users')")
  })

  it('does not insert email into admin_user_profiles', () => {
    expect(fnSrc).not.toMatch(/admin_user_profiles[\s\S]*email:/)
  })

  it('upserts admin_user_profiles with user_id and must_change_password', () => {
    expect(fnSrc).toContain('buildAdminUserProfilesRow')
  })

  it('upserts profiles with force_password_change for login role checks', () => {
    expect(fnSrc).toContain('buildProfilesRow')
    expect(fnSrc).toContain("from('profiles')")
  })

  it('wraps handler in try/catch for uncaught errors', () => {
    expect(fnSrc).toContain("'internal_error'")
    expect(fnSrc).toMatch(/catch\s*\(\s*err\s*\)/)
  })
})

describe('caller permission resolution', () => {
  it('buildCallerAdminLookupOrFilter matches id or email', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    expect(buildCallerAdminLookupOrFilter(id, 'admin@kenyancommunityhouston.org')).toBe(
      `id.eq.${id},email.eq.admin@kenyancommunityhouston.org`
    )
    expect(buildCallerAdminLookupOrFilter(id, '')).toBe(`id.eq.${id}`)
  })

  it('super_admin from admin_users can assign platform_admin even if profiles.role is absent', () => {
    const role = resolveCallerRole({ id: 'x', role: 'super_admin' }, null)
    expect(role).toBe('super_admin')
    expect(callerCanAssign(role, 'platform_admin')).toBe(true)
  })

  it('resolveCallerRole prefers admin_users over profiles', () => {
    expect(resolveCallerRole({ role: 'super_admin' }, 'member')).toBe('super_admin')
    expect(resolveCallerRole({ role: 'platform_admin' }, 'super_admin')).toBe('platform_admin')
  })

  it('resolveCallerRole uses profiles only when admin_users row is missing', () => {
    expect(resolveCallerRole(null, 'super_admin')).toBe('super_admin')
    expect(resolveCallerRole(null, null)).toBe('')
  })
})

describe('createAdminUserLogic helpers', () => {
  const nowIso = '2026-05-16T12:00:00.000Z'
  const userId = '11111111-1111-1111-1111-111111111111'

  it('admin_users row uses id email role and password flags', () => {
    const row = buildAdminUsersRow({
      userId,
      email: 'admin@example.com',
      role: 'platform_admin',
      displayName: 'Test Admin',
      positionTitle: 'Chair',
      nowIso,
    })
    expect(row.id).toBe(userId)
    expect(row.email).toBe('admin@example.com')
    expect(row.role).toBe('platform_admin')
    expect(row.must_change_password).toBe(true)
    expect(row.temporary_password_set_at).toBe(nowIso)
    expect(row.password_changed_at).toBeNull()
    expect(row.display_name).toBe('Test Admin')
    expect(row.position_title).toBe('Chair')
  })

  it('admin_user_profiles row uses user_id and not email', () => {
    const row = buildAdminUserProfilesRow({
      userId,
      displayName: 'Test Admin',
      positionTitle: 'Chair',
      nowIso,
    })
    expect(row.user_id).toBe(userId)
    expect(row).not.toHaveProperty('email')
    expect(row.must_change_password).toBe(true)
    expect(row.temporary_password_set_at).toBe(nowIso)
    expect(row.display_name).toBe('Test Admin')
    expect(row.position_title).toBe('Chair')
  })

  it('profiles row sets force_password_change for login policy', () => {
    const row = buildProfilesRow({
      userId,
      email: 'admin@example.com',
      role: 'platform_admin',
      displayName: 'Test Admin',
      nowIso,
    })
    expect(row.id).toBe(userId)
    expect(row.force_password_change).toBe(true)
    expect(row.password_changed_at).toBeNull()
    expect(row.role).toBe('platform_admin')
  })

  it('detects duplicate-registration auth errors', () => {
    expect(isAuthUserAlreadyRegistered('User already registered')).toBe(true)
    expect(isAuthUserAlreadyRegistered('A user with this email address has already been registered')).toBe(
      true
    )
    expect(isAuthUserAlreadyRegistered('Invalid email')).toBe(false)
  })

  it('duplicate admin row path uses upsert onConflict id (not insert-only)', () => {
    const fnSrc = readFileSync(
      resolve(process.cwd(), 'supabase/functions/create-admin-user/index.ts'),
      'utf8'
    )
    expect(fnSrc).toMatch(/from\('admin_users'\)[\s\S]*upsert[\s\S]*onConflict:\s*'id'/)
  })
})

describe('UsersPage create-admin-user integration', () => {
  it('invokes Edge Function and surfaces formatted errors', () => {
    const usersPage = readFileSync(
      resolve(process.cwd(), 'src/pages/admin/UsersPage.tsx'),
      'utf8'
    )
    expect(usersPage).toContain("invoke('create-admin-user'")
    expect(usersPage).toContain('formatEdgeFunctionInvokeError')
  })
})
