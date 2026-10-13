import { describe, expect, it } from 'vitest'
import { formatDateTime, houstonToday } from './utils'

describe('houstonToday', () => {
  it('keeps the Houston date after the UTC date has turned over', () => {
    // 8:15 pm CDT on Oct 12 is already Oct 13 in UTC.
    expect(houstonToday(new Date('2026-10-13T01:15:00Z'))).toBe('2026-10-12')
    // 7:30 pm CST on Dec 31 is already Jan 1 in UTC.
    expect(houstonToday(new Date('2027-01-01T01:30:00Z'))).toBe('2026-12-31')
  })

  it('matches the UTC date earlier in the day', () => {
    expect(houstonToday(new Date('2026-10-12T15:00:00Z'))).toBe('2026-10-12')
  })
})

describe('formatDateTime', () => {
  it('shows timestamps in Houston time with the zone', () => {
    expect(formatDateTime('2026-10-13T01:15:00Z')).toBe('Oct 12, 2026 8:15 PM CDT')
    expect(formatDateTime('2026-12-15T18:00:00+00:00')).toBe('Dec 15, 2026 12:00 PM CST')
  })

  it('leaves date-only values as a plain date', () => {
    expect(formatDateTime('2026-10-12')).toBe('Oct 12, 2026')
  })
})
