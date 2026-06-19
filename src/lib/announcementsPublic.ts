import type { Announcement } from '@/lib/types'

export type AnnouncementVisibilityFields = Pick<
  Announcement,
  'status' | 'expires_at' | 'is_featured' | 'priority' | 'published_at' | 'created_at'
>

export function isAnnouncementExpired(
  announcement: Pick<Announcement, 'expires_at'>,
  now: Date = new Date()
): boolean {
  if (!announcement.expires_at) return false
  const exp = new Date(announcement.expires_at).getTime()
  return !Number.isNaN(exp) && exp < now.getTime()
}

/** Published and not past expiration (client-side guard; RLS also enforces on read). */
export function isAnnouncementPubliclyActive(
  announcement: Pick<Announcement, 'status' | 'expires_at'>,
  now: Date = new Date()
): boolean {
  if (announcement.status !== 'published') return false
  return !isAnnouncementExpired(announcement, now)
}

export function filterActiveAnnouncements<T extends Pick<Announcement, 'status' | 'expires_at'>>(
  items: T[],
  now: Date = new Date()
): T[] {
  return items.filter((a) => isAnnouncementPubliclyActive(a, now))
}

export function compareHomepageAnnouncements(
  a: AnnouncementVisibilityFields,
  b: AnnouncementVisibilityFields
): number {
  if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
  const pa = a.priority ?? 0
  const pb = b.priority ?? 0
  if (pa !== pb) return pb - pa
  const pubA = a.published_at ? new Date(a.published_at).getTime() : 0
  const pubB = b.published_at ? new Date(b.published_at).getTime() : 0
  if (pubA !== pubB) return pubB - pubA
  const creA = a.created_at ? new Date(a.created_at).getTime() : 0
  const creB = b.created_at ? new Date(b.created_at).getTime() : 0
  return creB - creA
}

export function sortHomepageAnnouncements<T extends AnnouncementVisibilityFields>(items: T[]): T[] {
  return items.slice().sort(compareHomepageAnnouncements)
}

export function buildHomepageAnnouncementsList(
  items: Announcement[],
  limit = 3,
  now: Date = new Date()
): Announcement[] {
  return sortHomepageAnnouncements(filterActiveAnnouncements(items, now)).slice(0, limit)
}

export function validateAnnouncementDates(
  publishedAt: string | null | undefined,
  expiresAt: string | null | undefined
): string | null {
  if (!publishedAt || !expiresAt) return null
  const pub = new Date(publishedAt).getTime()
  const exp = new Date(expiresAt).getTime()
  if (Number.isNaN(pub) || Number.isNaN(exp)) return 'Invalid date.'
  if (exp <= pub) return 'Expiration date must be after publish date.'
  return null
}

export function announcementShowsExpiredBadge(
  item: Pick<Announcement, 'expires_at'>,
  now: Date = new Date()
): boolean {
  return isAnnouncementExpired(item, now)
}
