import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migration 034 event volunteer signups', () => {
  it('defines table, event columns, RLS, RPC, phone constraint, unique(event_id, phone), and no broad anon select', () => {
    const p = resolve(process.cwd(), 'supabase/migrations/034_event_volunteer_signups.sql')
    const sql = readFileSync(p, 'utf8')
    expect(sql).toContain('034')
    expect(sql).toContain('create table if not exists public.event_volunteer_signups')
    expect(sql).toContain('volunteer_signup_enabled')
    expect(sql).toContain('volunteer_signup_slug')
    expect(sql).toContain('alter table public.event_volunteer_signups enable row level security')
    expect(sql).toContain("phone ~ '^\\+?[0-9]{7,15}$'")
    expect(sql).toContain('event_volunteer_signups_event_phone_unique')
    expect(sql).toContain("status in ('submitted', 'confirmed', 'waitlisted', 'cancelled', 'declined')")
    expect(sql).toContain('create or replace function public.create_event_volunteer_signup')
    expect(sql).toContain('create or replace function public.public_event_volunteer_signup_count')

    expect(sql).toContain('create policy "event_volunteer_signups select own"')
    expect(sql).toContain('create policy "event_volunteer_signups select admin"')
    expect(sql).not.toContain('on public.event_volunteer_signups for select\n  to anon')
    expect(sql).not.toMatch(/on public\.event_volunteer_signups for select[\s\S]{0,120}to anon/i)
  })
})
