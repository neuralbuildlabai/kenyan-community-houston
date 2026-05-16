import type { Event } from '@/lib/types'
import { dedupeToNextOccurrenceOnly } from '@/lib/eventRecurrencePublic'

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * After recurrence deduplication, keep at most one row per normalized
 * title (earliest start wins). Handles accidental duplicate rows that
 * share a title but not recurrence metadata.
 */
export function dedupeUpcomingByDisplayTitle(events: Event[]): Event[] {
  const sorted = [...events].sort((a, b) => {
    const d = a.start_date.localeCompare(b.start_date)
    if (d !== 0) return d
    return (a.start_time ?? '').localeCompare(b.start_time ?? '')
  })
  const seen = new Set<string>()
  const out: Event[] = []
  for (const e of sorted) {
    const k = normalizeTitle(e.title)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(e)
  }
  return out
}

/**
 * Homepage and other surfaces: only `published` rows on or after a
 * calendar start date (YYYY-MM-DD). Past or non-public statuses never
 * pass through.
 */
export function filterPublishedUpcomingByStartDate(
  events: Event[],
  startOnOrAfterYmd: string
): Event[] {
  return events.filter((e) => e.status === 'published' && e.start_date >= startOnOrAfterYmd)
}

/**
 * Homepage “What’s happening”: published-only rows are expected from
 * the query; dedupe recurrence + duplicate titles; cap at `max`.
 */
export function buildHomepageWhatsHappeningList(upcomingPublished: Event[], max = 3): Event[] {
  return dedupeUpcomingByDisplayTitle(dedupeToNextOccurrenceOnly(upcomingPublished)).slice(0, max)
}
