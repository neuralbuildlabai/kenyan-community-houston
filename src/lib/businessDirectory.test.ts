import { describe, expect, it } from 'vitest'
import { partitionDirectoryListings, SPOTLIGHT_LIMIT } from '@/lib/businessDirectory'

type Row = { id: string; tier: string }

const row = (id: string, tier: string): Row => ({ id, tier })

describe('partitionDirectoryListings', () => {
  it('never drops a listing — every item lands in exactly one bucket', () => {
    const items = [
      row('a', 'sponsor'),
      row('b', 'featured'),
      row('c', 'verified'),
      row('d', 'verified'),
      row('e', 'verified'),
      row('f', 'basic'),
    ]
    const { featured, rest } = partitionDirectoryListings(items)
    expect(featured.length + rest.length).toBe(items.length)
    const seen = [...featured, ...rest].map((b) => b.id).sort()
    expect(seen).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('keeps verified listings beyond the spotlight cap in the directory list', () => {
    // Regression: the 4th+ verified listing (the Event Planning business) used
    // to vanish from the page because it was excluded from both buckets.
    const items = [
      row('a', 'verified'),
      row('b', 'verified'),
      row('c', 'verified'),
      row('spari', 'verified'),
    ]
    const { featured, rest } = partitionDirectoryListings(items)
    expect(featured).toHaveLength(SPOTLIGHT_LIMIT)
    expect(rest.map((b) => b.id)).toEqual(['spari'])
  })

  it('caps the spotlight at three listings', () => {
    const items = Array.from({ length: 9 }, (_, i) => row(`s${i}`, 'sponsor'))
    const { featured, rest } = partitionDirectoryListings(items)
    expect(featured).toHaveLength(3)
    expect(rest).toHaveLength(6)
  })

  it('puts every listing in the directory when none qualify for the spotlight', () => {
    const items = [row('a', 'basic'), row('b', 'free')]
    const { featured, rest } = partitionDirectoryListings(items)
    expect(featured).toEqual([])
    expect(rest).toHaveLength(2)
  })

  it('handles an empty directory', () => {
    expect(partitionDirectoryListings([])).toEqual({ featured: [], rest: [] })
  })
})
