import { describe, expect, it } from 'vitest'
import {
  formatPollClosesAt,
  isPollClosed,
  isPollFeaturedPublicly,
  partitionPublicPolls,
} from '@/lib/pollUtils'
import type { PollWithOptions } from '@/lib/pollsApi'

function basePoll(overrides: Partial<PollWithOptions> & { id: string }): PollWithOptions {
  const { id, ...rest } = overrides
  return {
    id,
    slug: 'test-poll',
    question: 'Test?',
    description: null,
    is_active: true,
    is_featured: false,
    closes_at: null,
    created_by: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    options: [],
    ...rest,
  }
}

describe('isPollClosed', () => {
  it('returns false when closes_at is null', () => {
    expect(isPollClosed({ closes_at: null })).toBe(false)
  })

  it('returns true when closes_at is in the past', () => {
    const now = new Date('2026-06-18T12:00:00Z')
    expect(
      isPollClosed({ closes_at: '2026-06-01T00:00:00Z' }, now)
    ).toBe(true)
  })

  it('returns false when closes_at is in the future', () => {
    const now = new Date('2026-06-01T00:00:00Z')
    expect(
      isPollClosed({ closes_at: '2026-06-18T12:00:00Z' }, now)
    ).toBe(false)
  })
})

describe('partitionPublicPolls', () => {
  const now = new Date('2026-06-18T12:00:00Z')

  it('splits open and closed polls; featured sorts first in each bucket', () => {
    const open = basePoll({ id: 'a', is_featured: false, created_at: '2026-06-10T00:00:00Z' })
    const openFeatured = basePoll({
      id: 'b',
      is_featured: true,
      created_at: '2026-06-01T00:00:00Z',
    })
    const closed = basePoll({
      id: 'c',
      closes_at: '2026-06-01T00:00:00Z',
      created_at: '2026-06-05T00:00:00Z',
    })

    const { open: openList, closed: closedList } = partitionPublicPolls(
      [open, openFeatured, closed],
      now
    )

    expect(openList.map((p) => p.id)).toEqual(['b', 'a'])
    expect(closedList.map((p) => p.id)).toEqual(['c'])
  })
})

describe('formatPollClosesAt', () => {
  it('returns a non-empty string for valid ISO dates', () => {
    const formatted = formatPollClosesAt('2026-06-30T18:00:00Z')
    expect(formatted.length).toBeGreaterThan(5)
    expect(formatted).not.toBe('2026-06-30T18:00:00Z')
  })
})

describe('isPollFeaturedPublicly', () => {
  it('requires active, featured, and not closed', () => {
    const now = new Date('2026-06-18T12:00:00Z')
    expect(
      isPollFeaturedPublicly(
        { is_active: true, is_featured: true, closes_at: '2026-07-01T00:00:00Z' },
        now
      )
    ).toBe(true)
    expect(
      isPollFeaturedPublicly(
        { is_active: true, is_featured: true, closes_at: '2026-06-01T00:00:00Z' },
        now
      )
    ).toBe(false)
  })
})

describe('fetchFeaturedPoll selection logic', () => {
  it('picks newest featured active open poll when multiple match', () => {
    const now = new Date('2026-06-18T12:00:00Z')
    const polls = [
      basePoll({
        id: 'closed',
        is_featured: true,
        closes_at: '2026-06-01T00:00:00Z',
        created_at: '2026-06-20T00:00:00Z',
      }),
      basePoll({ id: 'old', is_featured: true, created_at: '2026-06-01T00:00:00Z' }),
      basePoll({ id: 'new', is_featured: true, created_at: '2026-06-15T00:00:00Z' }),
      basePoll({ id: 'other', is_featured: false, created_at: '2026-06-20T00:00:00Z' }),
    ]
    const featured = polls
      .filter((p) => isPollFeaturedPublicly(p, now))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    expect(featured?.id).toBe('new')
  })
})
