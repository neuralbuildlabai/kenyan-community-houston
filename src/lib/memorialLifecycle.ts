/**
 * Memorial lifecycle — whether a memorial is published on /memorials or has
 * been archived after the funeral service.
 *
 * Content lives in the code registry (`memorials.ts`); only this lifecycle
 * state lives in the database (`memorial_states`, migration 084), so admins
 * can archive a memorial without a deploy.
 *
 * Two rules everything here exists to protect:
 *
 *  - Fail open. An unknown, missing, or unreadable state resolves to
 *    'active'. A database hiccup must never quietly take someone's
 *    memorial offline.
 *  - Archiving takes the memorial offline, gently. It disappears from the
 *    index, and `/memorials/<slug>` plus every asset beneath it answers
 *    with the notice below instead of the page (see `middleware.ts`).
 *    Printed QR codes stay in circulation long after a service, so a
 *    scan must land on an explanation rather than a raw 404.
 *
 * Elevated admins can still open an archived memorial — see
 * `memorialPreview.ts`.
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

export const ARCHIVED_MEMORIAL_HEADING = 'This memorial has been archived'

export const ARCHIVED_MEMORIAL_NOTICE =
  'The funeral service has taken place and this page is no longer published. Our thoughts remain with the family.'

/** Shown to an admin previewing a memorial the public can no longer reach. */
export const ARCHIVED_MEMORIAL_ADMIN_BANNER =
  'Archived — this page is offline to the public. You are viewing it as an admin.'

export function normalizeMemorialStatus(value: unknown): MemorialLifecycleStatus {
  return value === 'archived' ? 'archived' : 'active'
}

export function isArchivedMemorial(value: unknown): boolean {
  return normalizeMemorialStatus(value) === 'archived'
}

export function memorialStatusLabel(value: unknown): string {
  return isArchivedMemorial(value) ? 'Archived' : 'Published'
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
 * Split the registry, preserving registry order within each list. Memorials
 * with no stored state stay in `promoted`. The public index renders only
 * `promoted`; `archived` is for admin views, which still list everything.
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
