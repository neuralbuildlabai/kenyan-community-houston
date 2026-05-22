import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migration 050 event vendor signups', () => {
  it('defines table, event columns, RLS, RPCs, fee constraints, and no broad anon select', () => {
    const p = resolve(process.cwd(), 'supabase/migrations/050_event_vendor_signups.sql')
    const sql = readFileSync(p, 'utf8')
    expect(sql).toContain('050')
    expect(sql).toContain('create table if not exists public.event_vendor_signups')

    // Event-level vendor settings
    expect(sql).toContain('vendor_signup_enabled')
    expect(sql).toContain('vendor_signup_closes_at')
    expect(sql).toContain('vendor_signup_instructions')
    expect(sql).toContain('vendor_food_fee_cents')
    expect(sql).toContain('vendor_other_fee_cents')

    // Vendor row constraints (mirrors volunteer flow)
    expect(sql).toContain("phone ~ '^\\+?[0-9]{7,15}$'")
    expect(sql).toContain("vendor_category in ('food', 'other')")
    expect(sql).toContain("status in ('submitted', 'confirmed', 'waitlisted', 'cancelled', 'declined')")
    expect(sql).toContain("payment_status in ('unpaid', 'paid', 'waived', 'refunded')")

    // Anti-duplicate indices
    expect(sql).toContain('event_vendor_signups_event_phone_unique')
    expect(sql).toContain('event_vendor_signups_event_email_unique')

    // RLS — no public read; insert routes through SECURITY DEFINER RPC
    expect(sql).toContain('alter table public.event_vendor_signups enable row level security')
    expect(sql).toContain('create policy "event_vendor_signups select own"')
    expect(sql).toContain('create policy "event_vendor_signups select admin"')
    expect(sql).not.toMatch(/on public\.event_vendor_signups for select[\s\S]{0,120}to anon/i)
    expect(sql).not.toMatch(/on public\.event_vendor_signups for insert/i)

    // Public-facing RPCs
    expect(sql).toContain('create or replace function public.create_event_vendor_signup')
    expect(sql).toContain('create or replace function public.public_event_vendor_signup_count')

    // RPC grants the public role can call (anon for self-serve signup)
    expect(sql).toContain('grant execute on function public.create_event_vendor_signup')
    expect(sql).toContain('grant execute on function public.public_event_vendor_signup_count')
  })
})
