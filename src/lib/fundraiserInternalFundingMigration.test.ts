import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/083_fundraiser_internal_funding_mode.sql'),
  'utf8'
)

describe('migration 083 fundraiser funding mode', () => {
  it('adds funding_mode defaulting existing rows to external', () => {
    expect(sql).toContain("add column if not exists funding_mode text not null default 'external'")
    expect(sql).toContain('comment on column public.fundraisers.funding_mode')
  })

  it('validates the selection server-side', () => {
    expect(sql).toContain('fundraisers_funding_mode_chk')
    expect(sql).toContain("funding_mode in ('external', 'internal')")
  })

  it('refuses an external donation link on internal fundraisers', () => {
    expect(sql).toContain('fundraisers_internal_no_donation_url_chk')
    expect(sql).toContain("funding_mode <> 'internal' or donation_url is null")
  })

  it('keeps public submissions inside the moderation queue', () => {
    expect(sql).toContain('"Anyone can submit fundraisers"')
    expect(sql).toContain("status = 'pending'")
    expect(sql).toContain("verification_status = 'unverified'")
    expect(sql).toContain('published_at is null')
  })

  it('is idempotent on re-run', () => {
    expect(sql).toContain('drop constraint if exists fundraisers_funding_mode_chk')
    expect(sql).toContain('drop constraint if exists fundraisers_internal_no_donation_url_chk')
    expect(sql).toContain('drop policy if exists "Anyone can submit fundraisers"')
  })
})
