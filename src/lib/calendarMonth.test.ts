import { describe, expect, it } from 'vitest'
import {
  buildEventCountByDate,
  formatDateKey,
  getEventsForDate,
  getMonthDays,
  isValidDateKey,
  parseDateKey,
} from '@/lib/calendarMonth'
import { getHolidaysForMonth } from '@/data/calendarHolidays'
import type { Event } from '@/lib/types'

function baseEvent(overrides: Partial<Event> & { id: string }): Event {
  const { id, ...rest } = overrides
  return {
    id,
    slug: 'slug',
    title: 'T',
    description: null,
    location: 'L',
    address: null,
    start_date: '2026-06-01',
    end_date: null,
    start_time: null,
    end_time: null,
    is_free: true,
    ticket_price: null,
    ticket_url: null,
    category: 'Community',
    tags: [],
    flyer_url: null,
    status: 'published',
    organizer_name: null,
    organizer_email: null,
    published_at: null,
    created_at: '',
    updated_at: '',
    is_featured: false,
    ...rest,
  } as Event
}

describe('formatDateKey', () => {
  it('formats local calendar date', () => {
    expect(formatDateKey(new Date(2026, 4, 23, 12))).toBe('2026-05-23')
  })
})

describe('parseDateKey / isValidDateKey', () => {
  it('rejects invalid keys', () => {
    expect(parseDateKey('not-a-date')).toBeNull()
    expect(isValidDateKey('2026-13-40')).toBe(false)
  })

  it('accepts valid YYYY-MM-DD', () => {
    expect(isValidDateKey('2026-05-23')).toBe(true)
  })
})

describe('getMonthDays', () => {
  it('returns 42 cells for a six-week grid', () => {
    const days = getMonthDays(2026, 4, new Date(2026, 4, 15, 12))
    expect(days).toHaveLength(42)
    expect(days.filter((d) => d.isCurrentMonth)).toHaveLength(31)
    expect(days.some((d) => d.isToday)).toBe(true)
  })
})

describe('getEventsForDate', () => {
  it('filters by start_date', () => {
    const rows = [
      baseEvent({ id: 'a', start_date: '2026-05-23' }),
      baseEvent({ id: 'b', start_date: '2026-05-24' }),
    ]
    expect(getEventsForDate(rows, '2026-05-23').map((e) => e.id)).toEqual(['a'])
  })
})

describe('buildEventCountByDate', () => {
  it('counts multiple events on same day', () => {
    const rows = [
      baseEvent({ id: 'a', start_date: '2026-05-23' }),
      baseEvent({ id: 'b', start_date: '2026-05-23' }),
    ]
    expect(buildEventCountByDate(rows).get('2026-05-23')).toBe(2)
  })
})

describe('getHolidaysForMonth', () => {
  it('includes US Independence Day in July', () => {
    const july = getHolidaysForMonth(2026, 6)
    expect(july.some((h) => h.name === 'Independence Day' && h.country === 'US')).toBe(true)
  })

  it('includes Kenyan Madaraka Day in June', () => {
    const june = getHolidaysForMonth(2026, 5)
    expect(june.some((h) => h.name === 'Madaraka Day')).toBe(true)
  })

  it('omits holidays outside the month', () => {
    const feb = getHolidaysForMonth(2026, 1)
    expect(feb.some((h) => h.name === 'Independence Day')).toBe(false)
  })
})
