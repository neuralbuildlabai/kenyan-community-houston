import { describe, expect, it } from 'vitest'
import { buildHomepageWhatsHappeningList, dedupeUpcomingByDisplayTitle, filterPublishedUpcomingByStartDate } from '@/lib/homepageEvents'
import type { Event } from '@/lib/types'

function baseEvent(overrides: Partial<Event> & { id: string }): Event {
  const { id, ...rest } = overrides
  return {
    id,
    slug: 'slug',
    title: 'T',
    description: null,
    location: 'L',
    address: null,
    start_date: '2026-06-01',
    end_date: null,
    start_time: null,
    end_time: null,
    is_free: true,
    ticket_price: null,
    ticket_url: null,
    category: 'Community',
    tags: [],
    flyer_url: null,
    status: 'published',
    organizer_name: null,
    organizer_email: null,
    published_at: null,
    created_at: '',
    updated_at: '',
    is_featured: false,
    ...rest,
  } as Event
}

describe('filterPublishedUpcomingByStartDate', () => {
  it('drops non-published and dates before cutoff', () => {
    const rows = [
      baseEvent({ id: 'a', slug: 'a', title: 'Future', start_date: '2026-12-01', status: 'published' }),
      baseEvent({ id: 'b', slug: 'b', title: 'Past', start_date: '2026-01-01', status: 'published' }),
      baseEvent({ id: 'c', slug: 'c', title: 'Draft', start_date: '2026-12-02', status: 'draft' }),
    ]
    const out = filterPublishedUpcomingByStartDate(rows, '2026-06-01')
    expect(out.map((e) => e.id)).toEqual(['a'])
  })
})

describe('dedupeUpcomingByDisplayTitle', () => {
  it('keeps earliest row per title (case / spacing insensitive)', () => {
    const a = baseEvent({ id: 'e1', title: 'Same Title', slug: 'a', start_date: '2026-07-01' })
    const b = baseEvent({ id: 'e2', title: '  same TITLE ', slug: 'b', start_date: '2026-08-01' })
    const out = dedupeUpcomingByDisplayTitle([b, a])
    expect(out.map((e) => e.id)).toEqual(['e1'])
  })
})

describe('buildHomepageWhatsHappeningList', () => {
  it('caps at 3 and dedupes recurrence group via dedupeToNextOccurrenceOnly', () => {
    const gid = '00000000-0000-4000-8000-000000000001'
    const rows = [
      baseEvent({
        id: 'r1',
        slug: 'series-2026-06-01',
        title: 'Series',
        recurrence_group_id: gid,
        start_date: '2026-06-01',
      }),
      baseEvent({
        id: 'r2',
        slug: 'series-2026-06-08',
        title: 'Series',
        recurrence_group_id: gid,
        start_date: '2026-06-08',
      }),
      baseEvent({ id: 'r3', slug: 'other-a', title: 'Other A', start_date: '2026-06-02' }),
      baseEvent({ id: 'r4', slug: 'other-b', title: 'Other B', start_date: '2026-06-03' }),
      baseEvent({ id: 'r5', slug: 'other-c', title: 'Other C', start_date: '2026-06-04' }),
    ]
    const out = buildHomepageWhatsHappeningList(rows, 3)
    expect(out).toHaveLength(3)
    expect(out.map((e) => e.slug).sort()).toEqual(['other-a', 'other-b', 'series-2026-06-01'])
  })
})
