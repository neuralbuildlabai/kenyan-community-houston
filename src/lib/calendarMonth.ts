import type { Event } from '@/lib/types'
import type { ResolvedCalendarHoliday } from '@/data/calendarHolidays'
import { getHolidaysForMonth, resolveHolidaysForYear } from '@/data/calendarHolidays'

export type CalendarGridDay = {
  date: Date
  dateKey: string
  isCurrentMonth: boolean
  isToday: boolean
}

/** Local calendar date as YYYY-MM-DD (avoids UTC drift). */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const d = new Date(`${key}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isValidDateKey(key: string): boolean {
  const d = parseDateKey(key)
  return d !== null && formatDateKey(d) === key
}

/** Six-week Sunday-start grid for the given month (month is 0-indexed). */
export function getMonthDays(year: number, month: number, today: Date = new Date()): CalendarGridDay[] {
  const todayKey = formatDateKey(today)
  const firstOfMonth = new Date(year, month, 1, 12, 0, 0, 0)
  const startOffset = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startOffset, 12, 0, 0, 0)
  const days: CalendarGridDay[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i, 12, 0, 0, 0)
    const dateKey = formatDateKey(d)
    days.push({
      date: d,
      dateKey,
      isCurrentMonth: d.getMonth() === month,
      isToday: dateKey === todayKey,
    })
  }
  return days
}

export function getEventsForDate(events: Event[], dateKey: string): Event[] {
  return events.filter((e) => e.start_date === dateKey)
}

export function getEventDateKeys(events: Event[]): Set<string> {
  return new Set(events.map((e) => e.start_date))
}

export function buildEventCountByDate(events: Event[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const e of events) {
    counts.set(e.start_date, (counts.get(e.start_date) ?? 0) + 1)
  }
  return counts
}

export function getHolidaysForDate(
  holidays: ResolvedCalendarHoliday[],
  dateKey: string
): ResolvedCalendarHoliday[] {
  return holidays.filter((h) => h.dateKey === dateKey)
}

export function getHolidaysForYearDate(dateKey: string): ResolvedCalendarHoliday[] {
  const d = parseDateKey(dateKey)
  if (!d) return []
  return getHolidaysForDate(resolveHolidaysForYear(d.getFullYear()), dateKey)
}

export { getHolidaysForMonth, resolveHolidaysForYear }

export function buildDateAriaLabel(
  date: Date,
  eventCount: number,
  holidayNames: string[]
): string {
  const formatted = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const parts: string[] = [formatted]
  if (eventCount > 0) {
    parts.push(`${eventCount} event${eventCount === 1 ? '' : 's'}`)
  }
  if (holidayNames.length > 0) {
    parts.push(holidayNames.join(', '))
  }
  return parts.join(' — ')
}
