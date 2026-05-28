import { describe, expect, it } from 'vitest'
import {
  dedupeToNextOccurrenceOnly,
  limitOccurrencesPerGroup,
  publicRecurrenceGroupKey,
  publicRecurrenceGroupKeyFromSlug,
} from '@/lib/eventRecurrencePublic'
import type { Event } from '@/lib/types'

function baseEvent(overrides: Partial<Event> & { id: string }): Event {
  const { id, ...rest } = overrides
  return {
    id,
    slug: id,
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

describe('publicRecurrenceGroupKeyFromSlug', () => {
  it('extracts the slug stem before a trailing ISO date', () => {
    expect(publicRecurrenceGroupKeyFromSlug('swahili-sunday-service-2026-10-04')).toBe(
      'stem:swahili-sunday-service'
    )
  })

  it('falls back to the raw slug when no ISO date suffix is present', () => {
    expect(publicRecurrenceGroupKeyFromSlug('one-off-event')).toBe('slug:one-off-event')
  })
})

describe('publicRecurrenceGroupKey', () => {
  it('prefers the database recurrence_group_id when present', () => {
    const gid = '00000000-0000-4000-8000-0000000000aa'
    const k = publicRecurrenceGroupKey({ slug: 'series-2026-10-04', recurrence_group_id: gid })
    expect(k).toBe(`gid:${gid}`)
  })

  it('falls back to slug stem for legacy rows without recurrence metadata', () => {
    const k = publicRecurrenceGroupKey({ slug: 'series-2026-10-04', recurrence_group_id: null })
    expect(k).toBe('stem:series')
  })
})

describe('limitOccurrencesPerGroup', () => {
  const gid = '00000000-0000-4000-8000-000000000001'
  const series = [
    baseEvent({ id: 'r1', slug: 'series-2026-09-06', recurrence_group_id: gid, start_date: '2026-09-06' }),
    baseEvent({ id: 'r2', slug: 'series-2026-09-13', recurrence_group_id: gid, start_date: '2026-09-13' }),
    baseEvent({ id: 'r3', slug: 'series-2026-09-20', recurrence_group_id: gid, start_date: '2026-09-20' }),
    baseEvent({ id: 'r4', slug: 'series-2026-09-27', recurrence_group_id: gid, start_date: '2026-09-27' }),
    baseEvent({ id: 'r5', slug: 'series-2026-10-04', recurrence_group_id: gid, start_date: '2026-10-04' }),
  ]
  const oneOff = baseEvent({ id: 'x', slug: 'gala', start_date: '2026-09-15' })

  it('keeps the earliest N occurrences per recurrence group', () => {
    const out = limitOccurrencesPerGroup([...series, oneOff], 2)
    expect(out.map((e) => e.id)).toEqual(['r1', 'r2', 'x'])
  })

  it('admin cap of 3 keeps the three soonest occurrences of a weekly series', () => {
    const out = limitOccurrencesPerGroup([...series, oneOff], 3)
    expect(out.map((e) => e.id)).toEqual(['r1', 'r2', 'x', 'r3'])
  })

  it('leaves one-off events untouched regardless of cap', () => {
    const oneOffs = [
      baseEvent({ id: 'a', slug: 'a', start_date: '2026-06-01' }),
      baseEvent({ id: 'b', slug: 'b', start_date: '2026-06-02' }),
      baseEvent({ id: 'c', slug: 'c', start_date: '2026-06-03' }),
    ]
    expect(limitOccurrencesPerGroup(oneOffs, 1).map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns an empty list when cap is zero or negative', () => {
    expect(limitOccurrencesPerGroup(series, 0)).toEqual([])
    expect(limitOccurrencesPerGroup(series, -1)).toEqual([])
  })

  it('tie-breaks rows on the same date by start_time ascending', () => {
    const same = [
      baseEvent({ id: 'late', slug: 'svc-2026-09-06', recurrence_group_id: gid, start_date: '2026-09-06', start_time: '17:00' }),
      baseEvent({ id: 'early', slug: 'svc-2026-09-06b', recurrence_group_id: gid, start_date: '2026-09-06', start_time: '09:00' }),
    ]
    const out = limitOccurrencesPerGroup(same, 1)
    expect(out.map((e) => e.id)).toEqual(['early'])
  })

  it('groups legacy rows by slug stem when recurrence_group_id is missing', () => {
    const legacy = [
      baseEvent({ id: 'l1', slug: 'choir-2026-09-06', start_date: '2026-09-06' }),
      baseEvent({ id: 'l2', slug: 'choir-2026-09-13', start_date: '2026-09-13' }),
      baseEvent({ id: 'l3', slug: 'choir-2026-09-20', start_date: '2026-09-20' }),
    ]
    expect(limitOccurrencesPerGroup(legacy, 2).map((e) => e.id)).toEqual(['l1', 'l2'])
  })
})

describe('dedupeToNextOccurrenceOnly', () => {
  it('keeps only the soonest occurrence per group (equivalent to cap of 1)', () => {
    const gid = '00000000-0000-4000-8000-000000000077'
    const rows = [
      baseEvent({ id: 'b', slug: 'svc-2026-09-13', recurrence_group_id: gid, start_date: '2026-09-13' }),
      baseEvent({ id: 'a', slug: 'svc-2026-09-06', recurrence_group_id: gid, start_date: '2026-09-06' }),
      baseEvent({ id: 'one', slug: 'one-off', start_date: '2026-09-10' }),
    ]
    expect(dedupeToNextOccurrenceOnly(rows).map((e) => e.id)).toEqual(['a', 'one'])
  })
})
