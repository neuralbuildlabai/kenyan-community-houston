import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migration 051 vendor signup reference code', () => {
  it('adds the reference_code column, unique index, generator, trigger, and updated RPC return shape', () => {
    const p = resolve(
      process.cwd(),
      'supabase/migrations/051_event_vendor_signup_reference_code.sql'
    )
    const sql = readFileSync(p, 'utf8')
    expect(sql).toContain('051')

    // Column + uniqueness + NOT NULL after backfill
    expect(sql).toMatch(/add column if not exists reference_code text/i)
    expect(sql).toMatch(/alter column reference_code set not null/i)
    expect(sql).toContain('event_vendor_signups_reference_code_unique')

    // Generator function and trigger
    expect(sql).toContain('create or replace function public.kigh_generate_vendor_reference_code')
    expect(sql).toContain('create or replace function public.kigh_set_vendor_reference_code')
    expect(sql).toMatch(/create trigger event_vendor_signups_reference_code/i)

    // Reference code prefix is stable for grep-by-code workflows.
    expect(sql).toContain("'VND-'")

    // Updated RPC returns reference_code so the client can show it.
    expect(sql).toMatch(/drop function if exists public\.create_event_vendor_signup/i)
    expect(sql).toContain('reference_code text')
    expect(sql).toContain('return query select v_id, v_fee_cents, v_category, v_code')

    // Grants on the new RPC signature must include anon for
    // self-serve signup.
    expect(sql).toMatch(/grant execute on function public\.create_event_vendor_signup/i)
  })
})
