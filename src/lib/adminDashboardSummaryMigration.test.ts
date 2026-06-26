import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migration 068 — admin dashboard summary RPC.
 */
describe('migration 068 admin dashboard summary', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/068_admin_dashboard_summary.sql'),
    'utf8'
  )

  it('defines kigh_admin_dashboard_summary', () => {
    expect(sql).toMatch(/function public\.kigh_admin_dashboard_summary\(\)/)
  })

  it('is SECURITY DEFINER and guarded by kigh_is_elevated_admin', () => {
    expect(sql).toMatch(/security definer/i)
    expect(sql).toMatch(/if auth\.uid\(\) is null or not public\.kigh_is_elevated_admin\(\) then/)
    expect(sql).toMatch(/raise exception 'forbidden'/i)
  })

  it('grants execute to authenticated only', () => {
    expect(sql).toMatch(/grant execute on function public\.kigh_admin_dashboard_summary\(\) to authenticated/)
    expect(sql).not.toMatch(/grant execute on function public\.kigh_admin_dashboard_summary\(\)[\s\S]*to anon/)
  })

  it('does not reference legacy public_submissions table', () => {
    expect(sql).not.toMatch(/public\.public_submissions/)
    expect(sql).not.toMatch(/from public_submissions/)
  })

  it('computes public_submissions.pending_total from content queues', () => {
    expect(sql).toMatch(/'pending_total'/)
    expect(sql).toMatch(/v_events_pending/)
    expect(sql).toMatch(/v_announcements_pending/)
    expect(sql).toMatch(/v_businesses_pending/)
    expect(sql).toMatch(/v_fundraisers_pending/)
  })
})
