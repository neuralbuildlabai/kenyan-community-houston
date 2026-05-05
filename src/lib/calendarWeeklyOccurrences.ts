import { addMonths, addWeeks, format, isAfter, isBefore, min as minDate, parseISO, startOfDay } from 'date-fns'

/** Default horizon when no explicit recurrence end date is set (matches product copy). */
export const RECURRENCE_DEFAULT_MONTHS_HORIZON = 6

/**
 * Weekly occurrence dates (same weekday as anchor) from the first occurrence on or after
 * local "today" through the earlier of: optional recurrence end date, or today + monthsHorizon.
 */
export function weeklyOccurrenceDates(
  anchorYmd: string,
  recurrenceUntilYmd: string | null,
  monthsHorizon: number = RECURRENCE_DEFAULT_MONTHS_HORIZON
): string[] {
  const today = startOfDay(new Date())
  let d = startOfDay(parseISO(anchorYmd))
  const horizonEnd = addMonths(today, monthsHorizon)
  const untilCap = recurrenceUntilYmd
    ? minDate([startOfDay(parseISO(recurrenceUntilYmd)), horizonEnd])
    : horizonEnd

  while (isBefore(d, today)) {
    d = addWeeks(d, 1)
  }

  const out: string[] = []
  while (!isAfter(d, untilCap)) {
    out.push(format(d, 'yyyy-MM-dd'))
    d = addWeeks(d, 1)
  }
  return out
}
