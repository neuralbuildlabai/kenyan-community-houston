import { endOfDay, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'

export type EventScheduleFields = {
  start_date: string
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
}

function parseTimeOnDate(ymd: string, time: string): Date {
  const parts = time.trim().split(':')
  const d = parseISO(ymd)
  d.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, Number(parts[2]) || 0, 0)
  return d
}

/**
 * Local instant after which a public event is no longer current.
 * Uses end date/time when set; otherwise start date/time (end of day if no time).
 */
export function getEventExpirationInstant(event: EventScheduleFields): Date {
  const endDate = event.end_date?.trim() || null
  const endTime = event.end_time?.trim() || null
  const startDate = event.start_date
  const startTime = event.start_time?.trim() || null

  if (endDate) {
    if (endTime) return parseTimeOnDate(endDate, endTime)
    return endOfDay(parseISO(endDate))
  }
  if (startTime) return parseTimeOnDate(startDate, startTime)
  return endOfDay(parseISO(startDate))
}

/**
 * True when an event is no longer current for public listings.
 * Accepts full schedule fields, or a legacy start-date string (calendar-day only).
 */
export function isEventPast(eventOrStartDate: EventScheduleFields | string, now: Date = new Date()): boolean {
  if (typeof eventOrStartDate === 'string') {
    const d = startOfDay(parseISO(eventOrStartDate))
    return isBefore(d, startOfDay(now))
  }
  return isAfter(now, getEventExpirationInstant(eventOrStartDate))
}
