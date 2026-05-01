import { format } from 'date-fns'

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function wallClockCompact(dateYmd: string, hhmm: string | null | undefined): string {
  const d = dateYmd.replace(/-/g, '')
  const t = (hhmm?.slice(0, 5) ?? '09:00').replace(':', '')
  const sec = t.length === 4 ? `${t}00` : t.padEnd(6, '0')
  return `${d}T${sec}`
}

/** Build a minimal single-event ICS file for download (floating local times). */
export function buildEventIcs(opts: {
  title: string
  description?: string | null
  location?: string | null
  startDate: string
  startTime?: string | null
  endTime?: string | null
  url?: string | null
}): string {
  const dtStart = wallClockCompact(opts.startDate, opts.startTime)
  const dtEnd = wallClockCompact(opts.startDate, opts.endTime ?? opts.startTime)
  const uid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KIGH//Community Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@kenyancommunityhouston`,
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss")}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(opts.title)}`,
    opts.description ? `DESCRIPTION:${escapeIcsText(opts.description)}` : '',
    opts.location ? `LOCATION:${escapeIcsText(opts.location)}` : '',
    opts.url ? `URL:${escapeIcsText(opts.url)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.join('\r\n')
}

export function googleCalendarUrl(opts: {
  title: string
  details?: string | null
  location?: string | null
  startDate: string
  startTime?: string | null
  endTime?: string | null
}): string {
  const d = opts.startDate.replace(/-/g, '')
  const st = (opts.startTime?.slice(0, 5) ?? '09:00').replace(':', '') + '00'
  const et = (opts.endTime?.slice(0, 5) ?? opts.startTime?.slice(0, 5) ?? '10:00').replace(':', '') + '00'
  const dates = `${d}T${st}/${d}T${et}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates,
    details: opts.details ?? '',
    location: opts.location ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
