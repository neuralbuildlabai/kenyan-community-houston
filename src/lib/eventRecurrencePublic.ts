import type { Event } from '@/lib/types'

/**
 * Public calendar deduplication for recurring series stored as many published rows
 * (e.g. slug `swahili-sunday-service-2026-05-04`, `…-2026-05-11`, …).
 *
 * Groups rows whose slug ends with `-YYYY-MM-DD` by stem (prefix before that date).
 * Rows whose slug does **not** end with that pattern are treated as unique (`slug:…`)
 * so they never merge with stem-based rows (avoids false merges like `big-event` vs `big-event-2027-03-15`).
 *
 * For each group, the earliest occurrence by (start_date, start_time) is kept — on the
 * upcoming view that is the next occurrence once earlier dates have passed.
 *
 * Optional DB column (e.g. recurrence_group_key) was not added; see SQL hints in project notes / report.
 */

const SLUG_ISO_DATE_SUFFIX = /^(.+)-(\d{4}-\d{2}-\d{2})$/

/** Stable key for grouping occurrences of the same generated series. */
export function publicRecurrenceGroupKeyFromSlug(slug: string): string {
  const s = slug.trim()
  const m = s.match(SLUG_ISO_DATE_SUFFIX)
  if (m) return `stem:${m[1]}`
  return `slug:${s}`
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
    const k = publicRecurrenceGroupKeyFromSlug(e.slug)
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
