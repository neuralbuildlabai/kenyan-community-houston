import { describe, expect, it } from 'vitest'
import {
  buildHomepageAnnouncementsList,
  filterActiveAnnouncements,
  isAnnouncementPubliclyActive,
  sortHomepageAnnouncements,
  validateAnnouncementDates,
} from '@/lib/announcementsPublic'
import type { Announcement } from '@/lib/types'

function baseAnnouncement(overrides: Partial<Announcement> & { id: string }): Announcement {
  const { id, ...rest } = overrides
  return {
    id,
    title: 'Title',
    slug: 'slug',
    summary: 'Summary',
    body: 'Body',
    category: 'Community News',
    image_url: null,
    author_name: 'Admin',
    author_id: null,
    status: 'published',
    is_featured: false,
    is_pinned: false,
    submitted_by: null,
    approved_by: null,
    published_at: '2026-06-01T12:00:00Z',
    expires_at: null,
    priority: 0,
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    ...rest,
  }
}

const now = new Date('2026-06-15T12:00:00Z')

describe('isAnnouncementPubliclyActive', () => {
  it('returns true for published announcements without expiration', () => {
    expect(
      isAnnouncementPubliclyActive(
        baseAnnouncement({ id: 'a', expires_at: null }),
        now
      )
    ).toBe(true)
  })

  it('returns false for expired published announcements', () => {
    expect(
      isAnnouncementPubliclyActive(
        baseAnnouncement({ id: 'a', expires_at: '2026-06-10T00:00:00Z' }),
        now
      )
    ).toBe(false)
  })

  it('returns false for non-published announcements', () => {
    expect(
      isAnnouncementPubliclyActive(
        baseAnnouncement({ id: 'a', status: 'draft' }),
        now
      )
    ).toBe(false)
  })
})

describe('filterActiveAnnouncements', () => {
  it('drops expired items', () => {
    const items = [
      baseAnnouncement({ id: 'active', expires_at: '2026-07-01T00:00:00Z' }),
      baseAnnouncement({ id: 'expired', expires_at: '2026-06-01T00:00:00Z' }),
    ]
    expect(filterActiveAnnouncements(items, now).map((a) => a.id)).toEqual(['active'])
  })
})

describe('sortHomepageAnnouncements', () => {
  it('prioritizes featured, then priority, then published date', () => {
    const items = [
      baseAnnouncement({
        id: 'old-featured',
        is_featured: true,
        priority: 0,
        published_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      }),
      baseAnnouncement({
        id: 'high-priority',
        is_featured: false,
        priority: 10,
        published_at: '2026-06-10T00:00:00Z',
        created_at: '2026-06-10T00:00:00Z',
      }),
      baseAnnouncement({
        id: 'new-featured',
        is_featured: true,
        priority: 0,
        published_at: '2026-06-14T00:00:00Z',
        created_at: '2026-06-14T00:00:00Z',
      }),
    ]
    expect(sortHomepageAnnouncements(items).map((a) => a.id)).toEqual([
      'new-featured',
      'old-featured',
      'high-priority',
    ])
  })
})

describe('buildHomepageAnnouncementsList', () => {
  it('returns up to three active announcements in sort order', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      baseAnnouncement({
        id: `a${i}`,
        priority: i,
        published_at: `2026-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        created_at: `2026-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      })
    )
    const out = buildHomepageAnnouncementsList(items, 3, now)
    expect(out).toHaveLength(3)
    expect(out[0].id).toBe('a4')
  })

  it('excludes expired announcements', () => {
    const items = [
      baseAnnouncement({ id: 'live', expires_at: '2026-07-01T00:00:00Z' }),
      baseAnnouncement({ id: 'gone', expires_at: '2026-06-01T00:00:00Z' }),
    ]
    expect(buildHomepageAnnouncementsList(items, 3, now).map((a) => a.id)).toEqual(['live'])
  })
})

describe('validateAnnouncementDates', () => {
  it('requires expiration after publish date when both are set', () => {
    expect(
      validateAnnouncementDates('2026-06-10T12:00:00Z', '2026-06-09T12:00:00Z')
    ).toMatch(/after publish/i)
    expect(
      validateAnnouncementDates('2026-06-10T12:00:00Z', '2026-06-11T12:00:00Z')
    ).toBeNull()
  })
})
