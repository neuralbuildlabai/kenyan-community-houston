import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migration 031 member invites & demographics', () => {
  it('defines member_invites, RLS, demographics RPC, and excludes prefer_not_to_say', () => {
    const p = resolve(process.cwd(), 'supabase/migrations/031_member_invites_location_profession_metrics.sql')
    const sql = readFileSync(p, 'utf8')
    expect(sql).toContain('create table if not exists public.member_invites')
    expect(sql).toContain('alter table public.member_invites enable row level security')
    expect(sql).toContain('kigh_admin_member_demographics')
    expect(sql).toContain('submit_membership_registration')
    expect(sql).toContain('missing_or_invalid_general_location_area')
    expect(sql.toLowerCase()).not.toContain('prefer_not_to_say')
  })
})
