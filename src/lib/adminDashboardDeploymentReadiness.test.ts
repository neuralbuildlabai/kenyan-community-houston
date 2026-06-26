import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Cross-migration deployment readiness for admin dashboard phases 1–4 (068–070).
 */
describe('admin dashboard migrations 068–070 deployment readiness', () => {
  const migrationsDir = resolve(process.cwd(), 'supabase/migrations')
  const files = readdirSync(migrationsDir).filter((f) => /^\d{3}_/.test(f))

  const migration068 = readFileSync(resolve(migrationsDir, '068_admin_dashboard_summary.sql'), 'utf8')
  const migration069 = readFileSync(resolve(migrationsDir, '069_admin_dashboard_analytics_ranges.sql'), 'utf8')
  const migration070 = readFileSync(resolve(migrationsDir, '070_super_admin_dashboard_infrastructure.sql'), 'utf8')

  it('migration files exist in ascending order', () => {
    for (const name of [
      '068_admin_dashboard_summary.sql',
      '069_admin_dashboard_analytics_ranges.sql',
      '070_super_admin_dashboard_infrastructure.sql',
    ]) {
      expect(existsSync(resolve(migrationsDir, name))).toBe(true)
    }
    const idx068 = files.indexOf('068_admin_dashboard_summary.sql')
    const idx069 = files.indexOf('069_admin_dashboard_analytics_ranges.sql')
    const idx070 = files.indexOf('070_super_admin_dashboard_infrastructure.sql')
    expect(idx068).toBeGreaterThanOrEqual(0)
    expect(idx069).toBeGreaterThan(idx068)
    expect(idx070).toBeGreaterThan(idx069)
  })

  it('uses create or replace for idempotent function definitions', () => {
    for (const sql of [migration068, migration069, migration070]) {
      expect(sql).toMatch(/create or replace function/i)
    }
  })

  it('sets search_path on all new dashboard RPCs', () => {
    expect(migration068).toMatch(/set search_path = public/)
    expect(migration069).toMatch(/set search_path = public/)
    expect(migration070).toMatch(/set search_path = public/)
  })

  it('does not reference legacy public_submissions table', () => {
    for (const sql of [migration068, migration069, migration070]) {
      expect(sql).not.toMatch(/public\.public_submissions/)
      expect(sql).not.toMatch(/from public_submissions/)
    }
  })

  it('grants admin dashboard RPCs to authenticated only (not anon)', () => {
    expect(migration068).toMatch(/grant execute on function public\.kigh_admin_dashboard_summary\(\) to authenticated/)
    expect(migration068).not.toMatch(/grant execute on function public\.kigh_admin_dashboard_summary\(\)[\s\S]*to anon/)

    for (const name of [
      'kigh_admin_engagement_by_day',
      'kigh_admin_engagement_by_month',
      'kigh_admin_top_pages',
      'kigh_admin_top_ctas',
    ]) {
      expect(migration069).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]*to authenticated`))
      expect(migration069).not.toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]*to anon`))
    }

    expect(migration070).toMatch(
      /grant execute on function public\.kigh_admin_dashboard_infrastructure\(\) to authenticated/
    )
    expect(migration070).not.toMatch(
      /grant execute on function public\.kigh_admin_dashboard_infrastructure\(\)[\s\S]*to anon/
    )
  })

  it('uses kigh_is_elevated_admin for summary and analytics RPCs', () => {
    expect(migration068).toMatch(/kigh_is_elevated_admin\(\)/)
    expect(migration069).toMatch(/kigh_is_elevated_admin\(\)/)
  })

  it('uses super_admin-only helper for infrastructure RPC (not system-health gate)', () => {
    expect(migration070).toMatch(/kigh_is_platform_super_admin\(\)/)
    expect(migration070).not.toMatch(/kigh_is_system_health_admin\(\)/)
  })

  it('does not alter kigh_admin_system_health from migration 024', () => {
    expect(migration070).not.toMatch(/create or replace function public\.kigh_admin_system_health/)
    expect(migration069).not.toMatch(/create or replace function public\.kigh_admin_system_health/)
    expect(migration068).not.toMatch(/create or replace function public\.kigh_admin_system_health/)
  })
})
