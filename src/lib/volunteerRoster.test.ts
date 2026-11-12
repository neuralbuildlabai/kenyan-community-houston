import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildVolunteerRoster, rosterRoleOptions, type RosterRecord } from '@/lib/volunteerRoster'

let n = 0
function rec(over: Partial<RosterRecord>): RosterRecord {
  n += 1
  return {
    source: 'event',
    id: `r${n}`,
    full_name: 'Jane Wanjiku',
    phone: '+17135550001',
    email: 'jane@example.com',
    role: null,
    submitted_at: `2026-0${(n % 9) + 1}-01T12:00:00Z`,
    event_id: `e${n}`,
    event_title: `Event ${n}`,
    event_date: null,
    status: 'confirmed',
    recontact_ok: false,
    note: null,
    ...over,
  }
}

describe('buildVolunteerRoster', () => {
  it('treats one email with different phones as one person and lists every phone', () => {
    const people = buildVolunteerRoster([
      rec({ phone: '+17135550001', email: 'Jane@Example.com', submitted_at: '2026-01-01T00:00:00Z' }),
      rec({ phone: '+12815550002', email: 'jane@example.com', submitted_at: '2026-05-01T00:00:00Z' }),
    ])
    expect(people).toHaveLength(1)
    expect(people[0].phones).toEqual(['+12815550002', '+17135550001'])
    expect(people[0].eventIds).toHaveLength(2)
    expect(people[0].lastActive).toBe('2026-05-01T00:00:00Z')
    expect(people[0].firstActive).toBe('2026-01-01T00:00:00Z')
  })

  it('keeps different emails apart even when they share a phone', () => {
    const people = buildVolunteerRoster([
      rec({ email: 'mum@example.com', phone: '+17135559999' }),
      rec({ email: 'son@example.com', phone: '+17135559999' }),
    ])
    expect(people).toHaveLength(2)
  })

  it('attaches an older no-email signup to the only email-person with that phone', () => {
    const people = buildVolunteerRoster([
      rec({ email: null, phone: '7135550001' }),
      rec({ email: 'jane@example.com', phone: '+17135550001' }),
    ])
    expect(people).toHaveLength(1)
    expect(people[0].records).toHaveLength(2)
  })

  it('does not guess when a no-email phone belongs to two email-people', () => {
    const people = buildVolunteerRoster([
      rec({ email: 'mum@example.com', phone: '+17135559999' }),
      rec({ email: 'son@example.com', phone: '+17135559999' }),
      rec({ email: null, phone: '+17135559999' }),
    ])
    expect(people).toHaveLength(3)
  })

  it('groups no-email signups by phone', () => {
    const people = buildVolunteerRoster([
      rec({ email: null, phone: '+254712345678' }),
      rec({ email: null, phone: '+254712345678' }),
    ])
    expect(people).toHaveLength(1)
  })

  it('does not count cancelled or declined events, or repeat signups for one event', () => {
    const [p] = buildVolunteerRoster([
      rec({ event_id: 'a', status: 'confirmed' }),
      rec({ event_id: 'a', status: 'submitted' }),
      rec({ event_id: 'b', status: 'cancelled' }),
      rec({ event_id: 'c', status: 'declined' }),
    ])
    expect(p.eventIds).toEqual(['a'])
  })

  it('marks contact permission from any consenting record, including Call to Serve', () => {
    const [legacy] = buildVolunteerRoster([rec({ email: 'old@example.com', recontact_ok: false })])
    expect(legacy.recontactOk).toBe(false)

    const [mixed] = buildVolunteerRoster([
      rec({ email: 'x@example.com', recontact_ok: false }),
      rec({ email: 'x@example.com', source: 'serve', event_id: null, recontact_ok: true }),
    ])
    expect(mixed.recontactOk).toBe(true)
    expect(mixed.fromServe).toBe(true)
    expect(mixed.eventIds).toHaveLength(1)
  })

  it('uses the most recent name and sorts people by last activity', () => {
    const people = buildVolunteerRoster([
      rec({ email: 'a@example.com', full_name: 'Old Name', submitted_at: '2026-01-01T00:00:00Z' }),
      rec({ email: 'a@example.com', full_name: 'New Name', submitted_at: '2026-03-01T00:00:00Z' }),
      rec({ email: 'b@example.com', full_name: 'Recent', submitted_at: '2026-06-01T00:00:00Z' }),
    ])
    expect(people.map((p) => p.name)).toEqual(['Recent', 'New Name'])
  })

  it('lists distinct roles for the filter', () => {
    const people = buildVolunteerRoster([
      rec({ email: 'a@example.com', role: 'Individual volunteer — General helper' }),
      rec({ email: 'b@example.com', role: 'Individual volunteer — General helper' }),
      rec({ email: 'b@example.com', role: 'Guest speaker / presenter' }),
    ])
    expect(rosterRoleOptions(people)).toEqual(['Guest speaker / presenter', 'Individual volunteer — General helper'])
  })
})

describe('migration 094 volunteer email + re-contact consent', () => {
  const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/094_volunteer_email_required_and_recontact.sql'), 'utf8')

  it('requires email, records consent and blocks the same email twice per event', () => {
    expect(sql).toContain('add column if not exists recontact_consent_at timestamptz')
    expect(sql).toContain("raise exception 'email_required'")
    expect(sql).toContain('p_recontact_consent boolean default false')
    expect(sql).toMatch(/lower\(s\.email\) = v_email[\s\S]{0,80}duplicate_signup/)
  })

  it('replaces the 8-argument function so PostgREST calls stay unambiguous, and re-grants execute', () => {
    expect(sql).toContain(
      'drop function if exists public.create_event_volunteer_signup(uuid, text, text, text, text, text, boolean, boolean);'
    )
    expect(sql).toContain(
      'grant execute on function public.create_event_volunteer_signup(uuid, text, text, text, text, text, boolean, boolean, boolean) to anon, authenticated;'
    )
  })

  it('keeps the column nullable so older signups without email stay editable', () => {
    expect(sql).not.toMatch(/alter column email set not null/i)
  })
})
