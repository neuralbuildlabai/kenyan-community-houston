import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migration 069 — admin dashboard analytics ranges.
 */
describe('migration 069 admin dashboard analytics ranges', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/069_admin_dashboard_analytics_ranges.sql'),
    'utf8'
  )

  const rpcNames = [
    'kigh_admin_engagement_by_day',
    'kigh_admin_engagement_by_month',
    'kigh_admin_top_pages',
    'kigh_admin_top_ctas',
  ] as const

  it('migration file exists with all four RPCs', () => {
    for (const name of rpcNames) {
      expect(sql).toMatch(new RegExp(`function public\\.${name}\\(`))
    }
  })

  it('each RPC is SECURITY DEFINER and guarded by kigh_is_elevated_admin', () => {
    for (const name of rpcNames) {
      const block = sql.slice(sql.indexOf(`function public.${name}`))
      expect(block).toMatch(/security definer/i)
      expect(block).toMatch(/if auth\.uid\(\) is null or not public\.kigh_is_elevated_admin\(\) then/)
      expect(block).toMatch(/raise exception 'forbidden'/i)
    }
  })

  it('grants execute to authenticated only', () => {
    for (const name of rpcNames) {
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]*to authenticated`))
      expect(sql).not.toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]*to anon`))
    }
  })

  it('top page and top CTA RPCs exclude /admin traffic', () => {
    expect(sql).toMatch(
      /kigh_admin_top_pages[\s\S]*coalesce\(ae\.path, ''\) not like '\/admin%'/
    )
    expect(sql).toMatch(
      /kigh_admin_top_ctas[\s\S]*coalesce\(ae\.path, ''\) not like '\/admin%'/
    )
    expect(sql).toMatch(
      /kigh_admin_engagement_by_day[\s\S]*coalesce\(ae\.path, ''\) not like '\/admin%'/
    )
    expect(sql).toMatch(
      /kigh_admin_engagement_by_month[\s\S]*coalesce\(ae\.path, ''\) not like '\/admin%'/
    )
  })

  it('does not expose raw user_agent, metadata blob, session_id, or user_id in returned rows', () => {
    expect(sql).not.toMatch(/\bas user_agent\b/i)
    expect(sql).not.toMatch(/\bas metadata\b/i)
    expect(sql).not.toMatch(/\bas session_id\b/i)
    expect(sql).not.toMatch(/\bas user_id\b/i)
    expect(sql).not.toMatch(/metadata\s*,/i)
    expect(sql).toMatch(/metadata->>'page_title'/)
    expect(sql).toMatch(/metadata->>'href'/)
  })

  it('does not reference legacy public_submissions table', () => {
    expect(sql).not.toMatch(/public\.public_submissions/)
    expect(sql).not.toMatch(/from public_submissions/)
  })

  it('caps day and limit parameters', () => {
    expect(sql).toMatch(/least\(coalesce\(p_days, 30\), 366\)/)
    expect(sql).toMatch(/least\(coalesce\(p_months, 12\), 24\)/)
    expect(sql).toMatch(/least\(coalesce\(p_limit, 10\), 50\)/)
  })
})
