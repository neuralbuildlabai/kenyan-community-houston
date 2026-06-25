import { describe, expect, it } from 'vitest'
import { getEventExpirationInstant, isEventPast } from '@/lib/eventDate'

describe('getEventExpirationInstant', () => {
  it('uses end date and time when both are set', () => {
    const exp = getEventExpirationInstant({
      start_date: '2026-06-20',
      end_date: '2026-06-21',
      start_time: '18:00',
      end_time: '22:30',
    })
    expect(exp.getHours()).toBe(22)
    expect(exp.getMinutes()).toBe(30)
  })

  it('uses end of end date when end time is missing', () => {
    const exp = getEventExpirationInstant({
      start_date: '2026-06-20',
      end_date: '2026-06-21',
      start_time: null,
      end_time: null,
    })
    expect(exp.getHours()).toBe(23)
    expect(exp.getMinutes()).toBe(59)
  })

  it('falls back to start date/time when no end date', () => {
    const exp = getEventExpirationInstant({
      start_date: '2026-06-20',
      end_date: null,
      start_time: '14:00',
      end_time: null,
    })
    expect(exp.getHours()).toBe(14)
  })
})

describe('isEventPast', () => {
  const noon = new Date('2026-06-20T12:00:00')

  it('keeps same-day events without times visible through end of day', () => {
    expect(
      isEventPast(
        { start_date: '2026-06-20', end_date: null, start_time: null, end_time: null },
        noon
      )
    ).toBe(false)
  })

  it('expires after end time on the same day', () => {
    const afterEnd = new Date('2026-06-20T23:00:00')
    expect(
      isEventPast(
        {
          start_date: '2026-06-20',
          end_date: '2026-06-20',
          start_time: '20:00',
          end_time: '22:00',
        },
        afterEnd
      )
    ).toBe(true)
  })

  it('stays current until end time on multi-day events', () => {
    const during = new Date('2026-06-21T10:00:00')
    expect(
      isEventPast(
        {
          start_date: '2026-06-20',
          end_date: '2026-06-21',
          start_time: '18:00',
          end_time: '22:00',
        },
        during
      )
    ).toBe(false)
  })

  it('supports legacy start-date-only checks', () => {
    expect(isEventPast('2026-06-19', noon)).toBe(true)
    expect(isEventPast('2026-06-20', noon)).toBe(false)
  })
})
