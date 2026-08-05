import { describe, expect, it } from 'vitest'
import { DUES_WAIVER_ENDS_AT, isDuesWaiverActive } from './eventVolunteerSignup'

/**
 * 2026 dues waiver sunset — community decision: dues waived for 2026,
 * 2027 dues in play beginning Dec 1, 2026 (after November by-elections).
 * Migration 074 encodes the same boundary server-side; if this date
 * ever changes, change it in BOTH places.
 */
describe('2026 dues waiver window', () => {
  it('is active through the end of Nov 30, 2026 (America/Chicago)', () => {
    expect(isDuesWaiverActive(new Date('2026-08-14T12:00:00-05:00'))).toBe(true)
    expect(isDuesWaiverActive(new Date('2026-11-30T23:59:59-06:00'))).toBe(true)
  })

  it('ends exactly at Dec 1, 2026 00:00 America/Chicago', () => {
    expect(isDuesWaiverActive(new Date('2026-12-01T00:00:00-06:00'))).toBe(false)
    expect(isDuesWaiverActive(new Date('2027-01-15T09:00:00-06:00'))).toBe(false)
  })

  it('boundary constant matches migration 074 (2026-12-01 00:00 CST = 06:00 UTC)', () => {
    expect(DUES_WAIVER_ENDS_AT.toISOString()).toBe('2026-12-01T06:00:00.000Z')
  })
})
