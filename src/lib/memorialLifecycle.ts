/**
 * Memorial lifecycle — whether a memorial is still promoted on /memorials
 * or has been archived after the funeral service.
 *
 * Content lives in the code registry (`memorials.ts`); only this lifecycle
 * state lives in the database (`memorial_states`, migration 084), so admins
 * can archive a memorial without a deploy.
 *
 * Two rules everything here exists to protect:
 *
 *  - Fail open. An unknown, missing, or unreadable state resolves to
 *    'active'. A database hiccup must never quietly remove someone's
 *    memorial from the site.
 *  - Archiving is presentation only. It changes where a memorial appears
 *    on the index, never whether /memorials/<slug> resolves — printed QR
 *    codes point at those URLs permanently.
 */
import type { MemorialEntry } from '@/lib/memorials'

export const MEMORIAL_LIFECYCLE_STATUSES = ['active', 'archived'] as const

export type MemorialLifecycleStatus = (typeof MEMORIAL_LIFECYCLE_STATUSES)[number]

/** Row shape of `public.memorial_states` as the browser reads it. */
export interface MemorialStateRow {
  slug: string
  status: string | null
  archived_at?: string | null
}

export type MemorialStatusMap = Record<string, MemorialLifecycleStatus>

export const ARCHIVED_MEMORIAL_NOTICE =
  'The funeral service has taken place. This page remains online in remembrance.'

export const ARCHIVED_MEMORIALS_HEADING = 'Earlier memorials'

export function normalizeMemorialStatus(value: unknown): MemorialLifecycleStatus {
  return value === 'archived' ? 'archived' : 'active'
}

export function isArchivedMemorial(value: unknown): boolean {
  return normalizeMemorialStatus(value) === 'archived'
}

export function memorialStatusLabel(value: unknown): string {
  return isArchivedMemorial(value) ? 'Archived' : 'Promoted'
}

export function memorialStatusMap(rows: readonly MemorialStateRow[] | null | undefined): MemorialStatusMap {
  const map: MemorialStatusMap = {}
  for (const row of rows ?? []) {
    if (!row?.slug) continue
    map[row.slug] = normalizeMemorialStatus(row.status)
  }
  return map
}

export function memorialStatusFor(
  slug: string,
  statuses: MemorialStatusMap | null | undefined
): MemorialLifecycleStatus {
  return normalizeMemorialStatus(statuses?.[slug])
}

/**
 * Split the registry for the index page, preserving registry order within
 * each list. Memorials with no stored state stay in `promoted`.
 */
export function partitionMemorials(
  entries: readonly MemorialEntry[],
  statuses: MemorialStatusMap | null | undefined
): { promoted: MemorialEntry[]; archived: MemorialEntry[] } {
  const promoted: MemorialEntry[] = []
  const archived: MemorialEntry[] = []
  for (const entry of entries) {
    if (memorialStatusFor(entry.slug, statuses) === 'archived') archived.push(entry)
    else promoted.push(entry)
  }
  return { promoted, archived }
}

/**
 * Upsert payload for an admin status change. Archiving stamps who and when;
 * restoring clears both so the schema's archived_at constraint holds.
 */
export function memorialStatePatch({
  slug,
  status,
  adminId,
  now = new Date(),
}: {
  slug: string
  status: MemorialLifecycleStatus
  adminId?: string | null
  now?: Date
}): {
  slug: string
  status: MemorialLifecycleStatus
  archived_at: string | null
  archived_by: string | null
} {
  const next = normalizeMemorialStatus(status)
  return {
    slug,
    status: next,
    archived_at: next === 'archived' ? now.toISOString() : null,
    archived_by: next === 'archived' ? (adminId ?? null) : null,
  }
}
