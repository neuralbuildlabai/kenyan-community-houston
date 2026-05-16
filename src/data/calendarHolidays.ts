/** Local holiday definitions for the public community calendar (no external API). */

export type HolidayCountry = 'US' | 'KE'

export type FixedHolidayRule = {
  type: 'fixed'
  month: number
  day: number
}

/** `weekday`: 0 = Sunday … 6 = Saturday. `nth`: 1 = first, 4 = fourth, etc. */
export type NthWeekdayHolidayRule = {
  type: 'nthWeekday'
  month: number
  weekday: number
  nth: number
}

export type LastWeekdayHolidayRule = {
  type: 'lastWeekday'
  month: number
  weekday: number
}

export type CalendarHolidayRule = FixedHolidayRule | NthWeekdayHolidayRule | LastWeekdayHolidayRule

export type CalendarHolidayDef = {
  id: string
  name: string
  country: HolidayCountry
  description?: string
  rule: CalendarHolidayRule
}

export const CALENDAR_HOLIDAY_DEFINITIONS: CalendarHolidayDef[] = [
  {
    id: 'us-new-year',
    name: "New Year's Day",
    country: 'US',
    description: 'Federal holiday',
    rule: { type: 'fixed', month: 0, day: 1 },
  },
  {
    id: 'ke-new-year',
    name: "New Year's Day",
    country: 'KE',
    description: 'Public holiday in Kenya',
    rule: { type: 'fixed', month: 0, day: 1 },
  },
  {
    id: 'us-mlk',
    name: 'Martin Luther King Jr. Day',
    country: 'US',
    description: 'Third Monday in January',
    rule: { type: 'nthWeekday', month: 0, weekday: 1, nth: 3 },
  },
  {
    id: 'ke-madaraka',
    name: 'Madaraka Day',
    country: 'KE',
    description: 'Kenya self-governance day',
    rule: { type: 'fixed', month: 5, day: 1 },
  },
  {
    id: 'us-memorial',
    name: 'Memorial Day',
    country: 'US',
    description: 'Last Monday in May',
    rule: { type: 'lastWeekday', month: 4, weekday: 1 },
  },
  {
    id: 'us-independence',
    name: 'Independence Day',
    country: 'US',
    description: 'Fourth of July',
    rule: { type: 'fixed', month: 6, day: 4 },
  },
  {
    id: 'us-labor',
    name: 'Labor Day',
    country: 'US',
    description: 'First Monday in September',
    rule: { type: 'nthWeekday', month: 8, weekday: 1, nth: 1 },
  },
  {
    id: 'ke-mashujaa',
    name: 'Mashujaa Day',
    country: 'KE',
    description: 'Heroes Day in Kenya',
    rule: { type: 'fixed', month: 9, day: 20 },
  },
  {
    id: 'us-thanksgiving',
    name: 'Thanksgiving Day',
    country: 'US',
    description: 'Fourth Thursday in November',
    rule: { type: 'nthWeekday', month: 10, weekday: 4, nth: 4 },
  },
  {
    id: 'ke-jamhuri',
    name: 'Jamhuri Day',
    country: 'KE',
    description: 'Kenya Republic Day',
    rule: { type: 'fixed', month: 11, day: 12 },
  },
  {
    id: 'us-christmas',
    name: 'Christmas Day',
    country: 'US',
    rule: { type: 'fixed', month: 11, day: 25 },
  },
  {
    id: 'ke-christmas',
    name: 'Christmas Day',
    country: 'KE',
    rule: { type: 'fixed', month: 11, day: 25 },
  },
  {
    id: 'ke-boxing',
    name: 'Boxing Day',
    country: 'KE',
    rule: { type: 'fixed', month: 11, day: 26 },
  },
]

export type ResolvedCalendarHoliday = CalendarHolidayDef & {
  dateKey: string
}

function resolveRuleDate(year: number, rule: CalendarHolidayRule): Date {
  if (rule.type === 'fixed') {
    return new Date(year, rule.month, rule.day, 12, 0, 0, 0)
  }
  if (rule.type === 'nthWeekday') {
    let count = 0
    for (let day = 1; day <= 31; day++) {
      const d = new Date(year, rule.month, day, 12, 0, 0, 0)
      if (d.getMonth() !== rule.month) break
      if (d.getDay() === rule.weekday) {
        count++
        if (count === rule.nth) return d
      }
    }
    return new Date(year, rule.month, 1, 12, 0, 0, 0)
  }
  const last = new Date(year, rule.month + 1, 0, 12, 0, 0, 0)
  for (let day = last.getDate(); day >= 1; day--) {
    const d = new Date(year, rule.month, day, 12, 0, 0, 0)
    if (d.getDay() === rule.weekday) return d
  }
  return last
}

function formatDateKeyLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** All holidays with concrete YYYY-MM-DD keys for a calendar year. */
export function resolveHolidaysForYear(year: number): ResolvedCalendarHoliday[] {
  return CALENDAR_HOLIDAY_DEFINITIONS.map((def) => {
    const date = resolveRuleDate(year, def.rule)
    return { ...def, dateKey: formatDateKeyLocal(date) }
  })
}

/** Holidays whose date falls in the given month (month is 0-indexed). */
export function getHolidaysForMonth(year: number, month: number): ResolvedCalendarHoliday[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  return resolveHolidaysForYear(year).filter((h) => h.dateKey.startsWith(prefix))
}
