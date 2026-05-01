import { isBefore, parseISO, startOfDay } from 'date-fns'

/** True if the event's start date is strictly before local calendar today. */
export function isEventPast(startDateYmd: string, now: Date = new Date()): boolean {
  const d = startOfDay(parseISO(startDateYmd))
  return isBefore(d, startOfDay(now))
}
