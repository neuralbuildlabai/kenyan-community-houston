import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { callerCanAssign } from './adminRoleMatrix'

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
    expect(fnSrc).toContain("handleCorsPreflight(req)")
    const optionsHandler = fnSrc.indexOf('handleCorsPreflight')
    const authCheck = fnSrc.indexOf("Authorization")
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

  it('platform_admin cannot assign super_admin', () => {
    expect(callerCanAssign('platform_admin', 'super_admin')).toBe(false)
  })

  it('platform_admin cannot assign platform_admin (no peer creation)', () => {
    expect(callerCanAssign('platform_admin', 'platform_admin')).toBe(false)
  })

  it('non-elevated roles cannot assign admin users', () => {
    expect(callerCanAssign('moderator', 'platform_admin')).toBe(false)
    expect(callerCanAssign('member', 'community_admin')).toBe(false)
  })

  it('reads caller role from profiles table', () => {
    expect(fnSrc).toMatch(/from\('profiles'\)[\s\S]*select\('role/)
    expect(fnSrc).toContain('const callerRole = (profile?.role')
  })

  it('upserts admin_user_profiles with must_change_password', () => {
    expect(fnSrc).toContain('admin_user_profiles')
    expect(fnSrc).toContain('must_change_password: true')
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
