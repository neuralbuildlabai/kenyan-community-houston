import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migration 079 — community group join requests.
 *
 * Requests hold requester contact details, so the table must stay closed to
 * anon and readable only by elevated admins; the only public write path is
 * the validating RPC.
 */
describe('migration 079 community group join requests', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/079_community_group_join_requests.sql'),
    'utf8'
  )

  it('creates the table idempotently with a cascade to the group', () => {
    expect(sql).toContain('create table if not exists public.community_group_join_requests')
    expect(sql).toContain('references public.community_groups (id) on delete cascade')
  })

  it('enables RLS and gates select/update/delete on elevated admins', () => {
    expect(sql).toContain('alter table public.community_group_join_requests enable row level security;')
    const gated = sql.match(/public\.kigh_is_elevated_admin\(\)/g) ?? []
    expect(gated.length).toBeGreaterThanOrEqual(4)
  })

  it('has no insert policy and never grants the table to anon', () => {
    expect(sql).not.toMatch(/for insert/)
    expect(sql).toContain('revoke all on table public.community_group_join_requests from anon;')
    expect(sql).not.toMatch(/grant [^;]*on table public\.community_group_join_requests to [^;]*anon/)
    expect(sql).not.toMatch(/grant [^;]*insert[^;]*community_group_join_requests/)
  })

  it('exposes the submit RPC to anon and authenticated only', () => {
    expect(sql).toContain(
      'grant execute on function public.submit_community_group_join_request(uuid, text, text, text, text) to anon, authenticated;'
    )
    expect(sql).toContain(
      'revoke all on function public.submit_community_group_join_request(uuid, text, text, text, text) from public;'
    )
  })

  it('runs as security definer with a pinned search_path and column-first name resolution', () => {
    expect(sql).toMatch(/security definer\s+set search_path = public/)
    // Guards against the ambiguous-column bug migration 057 had to fix.
    expect(sql).toContain('#variable_conflict use_column')
  })

  it('only accepts requests for publicly visible groups', () => {
    expect(sql).toContain("cg.status in ('approved', 'published')")
  })

  it('validates input, dedupes repeat requests, and throttles per email', () => {
    for (const code of ['name_required', 'invalid_email', 'invalid_phone', 'invalid_message', 'group_not_found', 'rate_limited']) {
      expect(sql).toContain(`'${code}'`)
    }
    expect(sql).toContain("r.status <> 'closed'")
    expect(sql).toContain("interval '1 day'")
  })
})
