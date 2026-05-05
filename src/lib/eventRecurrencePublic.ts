import type { Event } from '@/lib/types'

/**
 * Public calendar deduplication for recurring series stored as many published rows.
 *
 * **Primary:** `recurrence_group_id` from the database (022 migration).
 *
 * **Fallback (legacy):** slug stem `-YYYY-MM-DD` when recurrence metadata is absent.
 */

const SLUG_ISO_DATE_SUFFIX = /^(.+)-(\d{4}-\d{2}-\d{2})$/

/** Stable key for grouping occurrences of the same generated series (slug fallback). */
export function publicRecurrenceGroupKeyFromSlug(slug: string): string {
  const s = slug.trim()
  const m = s.match(SLUG_ISO_DATE_SUFFIX)
  if (m) return `stem:${m[1]}`
  return `slug:${s}`
}

/** Prefer DB recurrence grouping; fall back to slug stem for legacy rows. */
export function publicRecurrenceGroupKey(event: Pick<Event, 'slug' | 'recurrence_group_id'>): string {
  if (event.recurrence_group_id) return `gid:${event.recurrence_group_id}`
  return publicRecurrenceGroupKeyFromSlug(event.slug)
}

function compareOccurrence(a: Event, b: Event): number {
  const d = a.start_date.localeCompare(b.start_date)
  if (d !== 0) return d
  return (a.start_time ?? '').localeCompare(b.start_time ?? '')
}

/**
 * One row per recurrence group: the earliest upcoming entry in `events` (caller usually passes only future rows).
 * Single-row / one-off events are unchanged.
 */
export function dedupeToNextOccurrenceOnly(events: Event[]): Event[] {
  const groups = new Map<string, Event[]>()
  for (const e of events) {
    const k = publicRecurrenceGroupKey(e)
    const list = groups.get(k) ?? []
    list.push(e)
    groups.set(k, list)
  }
  const out: Event[] = []
  for (const arr of groups.values()) {
    arr.sort(compareOccurrence)
    out.push(arr[0])
  }
  out.sort(compareOccurrence)
  return out
}
