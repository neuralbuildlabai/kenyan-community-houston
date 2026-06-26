import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migration 070 — super-admin dashboard infrastructure RPC.
 */
describe('migration 070 super admin dashboard infrastructure', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/070_super_admin_dashboard_infrastructure.sql'),
    'utf8'
  )

  it('defines kigh_admin_dashboard_infrastructure', () => {
    expect(sql).toMatch(/function public\.kigh_admin_dashboard_infrastructure\(\)/)
  })

  it('is SECURITY DEFINER and guarded by super_admin helper (not platform_admin)', () => {
    expect(sql).toMatch(/security definer/i)
    expect(sql).toMatch(/kigh_is_platform_super_admin\(\)/)
    expect(sql).not.toMatch(/kigh_is_system_health_admin\(\)/)
    expect(sql).not.toMatch(/platform_admin/)
    expect(sql).toMatch(/if auth\.uid\(\) is null or not public\.kigh_is_platform_super_admin\(\) then/)
    expect(sql).toMatch(/raise exception 'forbidden'/i)
  })

  it('grants execute to authenticated only', () => {
    expect(sql).toMatch(
      /grant execute on function public\.kigh_admin_dashboard_infrastructure\(\) to authenticated/
    )
    expect(sql).not.toMatch(
      /grant execute on function public\.kigh_admin_dashboard_infrastructure\(\)[\s\S]*to anon/
    )
  })

  it('does not expose raw user_agent, session_id, user_id, or analytics metadata', () => {
    expect(sql).not.toMatch(/user_agent/i)
    expect(sql).not.toMatch(/session_id/i)
    expect(sql).not.toMatch(/\buser_id\b/i)
    expect(sql).not.toMatch(/from public\.analytics_events[\s\S]*metadata/i)
    expect(sql).not.toMatch(/'metadata'/i)
  })

  it('does not reference legacy public_submissions table', () => {
    expect(sql).not.toMatch(/public\.public_submissions/)
    expect(sql).not.toMatch(/from public_submissions/)
  })

  it('documents reuse of existing super_admin helper from migration 013', () => {
    expect(sql).toMatch(/kigh_is_platform_super_admin/)
  })
})
