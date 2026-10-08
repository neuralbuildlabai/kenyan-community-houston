import { describe, expect, it } from 'vitest'
import {
  ARCHIVED_MEMORIAL_NOTICE,
  MEMORIAL_LIFECYCLE_STATUSES,
  isArchivedMemorial,
  memorialStatePatch,
  memorialStatusFor,
  memorialStatusLabel,
  memorialStatusMap,
  normalizeMemorialStatus,
  partitionMemorials,
} from './memorialLifecycle'
import { COLLINS_COLLO_NAMASWA_SLUG, MEMORIALS, type MemorialEntry } from './memorials'

const entry = (slug: string): MemorialEntry =>
  ({ ...MEMORIALS[0]!, slug }) as MemorialEntry

describe('memorial lifecycle status', () => {
  it('offers exactly active and archived', () => {
    expect(MEMORIAL_LIFECYCLE_STATUSES).toEqual(['active', 'archived'])
  })

  it('fails open — unknown or missing state is active, never hidden', () => {
    expect(normalizeMemorialStatus(undefined)).toBe('active')
    expect(normalizeMemorialStatus(null)).toBe('active')
    expect(normalizeMemorialStatus('')).toBe('active')
    expect(normalizeMemorialStatus('deleted')).toBe('active')
    expect(normalizeMemorialStatus('ARCHIVED')).toBe('active')
    expect(isArchivedMemorial(null)).toBe(false)
  })

  it('recognises an archived memorial', () => {
    expect(normalizeMemorialStatus('archived')).toBe('archived')
    expect(isArchivedMemorial('archived')).toBe(true)
  })

  it('labels the listing state for admins', () => {
    expect(memorialStatusLabel('archived')).toBe('Archived')
    expect(memorialStatusLabel('active')).toBe('Promoted')
    expect(memorialStatusLabel(null)).toBe('Promoted')
  })
})

describe('memorialStatusMap', () => {
  it('indexes rows by slug and normalises the value', () => {
    const map = memorialStatusMap([
      { slug: 'a', status: 'archived' },
      { slug: 'b', status: 'active' },
      { slug: 'c', status: null },
    ])
    expect(map).toEqual({ a: 'archived', b: 'active', c: 'active' })
  })

  it('tolerates empty, null, and malformed input', () => {
    expect(memorialStatusMap(null)).toEqual({})
    expect(memorialStatusMap(undefined)).toEqual({})
    expect(memorialStatusMap([{ slug: '', status: 'archived' }])).toEqual({})
  })

  it('treats a slug with no row as active', () => {
    expect(memorialStatusFor('never-stored', { a: 'archived' })).toBe('active')
    expect(memorialStatusFor('a', null)).toBe('active')
  })
})

describe('partitionMemorials', () => {
  const entries = [entry('one'), entry('two'), entry('three')]

  it('promotes everything when no state is stored', () => {
    const { promoted, archived } = partitionMemorials(entries, {})
    expect(promoted.map((e) => e.slug)).toEqual(['one', 'two', 'three'])
    expect(archived).toEqual([])
  })

  it('moves only archived memorials to the quiet list, preserving order', () => {
    const { promoted, archived } = partitionMemorials(entries, {
      two: 'archived',
      three: 'active',
    })
    expect(promoted.map((e) => e.slug)).toEqual(['one', 'three'])
    expect(archived.map((e) => e.slug)).toEqual(['two'])
  })

  it('never drops a memorial from both lists', () => {
    const { promoted, archived } = partitionMemorials(entries, {
      one: 'archived',
      two: 'archived',
      three: 'archived',
    })
    expect(promoted.length + archived.length).toBe(entries.length)
  })

  it('keeps the real registry intact', () => {
    const { promoted, archived } = partitionMemorials(MEMORIALS, {})
    expect(promoted.map((e) => e.slug)).toContain(COLLINS_COLLO_NAMASWA_SLUG)
    expect(archived).toEqual([])
  })
})

describe('memorialStatePatch', () => {
  const now = new Date('2026-10-08T12:00:00.000Z')

  it('stamps who archived it and when', () => {
    expect(
      memorialStatePatch({ slug: 'x', status: 'archived', adminId: 'admin-1', now })
    ).toEqual({
      slug: 'x',
      status: 'archived',
      archived_at: '2026-10-08T12:00:00.000Z',
      archived_by: 'admin-1',
    })
  })

  it('clears the archive stamp when restoring, satisfying the db constraint', () => {
    expect(
      memorialStatePatch({ slug: 'x', status: 'active', adminId: 'admin-1', now })
    ).toEqual({ slug: 'x', status: 'active', archived_at: null, archived_by: null })
  })

  it('handles a missing admin id', () => {
    const patch = memorialStatePatch({ slug: 'x', status: 'archived', now })
    expect(patch.archived_by).toBeNull()
    expect(patch.archived_at).toBe('2026-10-08T12:00:00.000Z')
  })
})

describe('archived memorial copy', () => {
  it('explains the page is still online, without presuming on the family', () => {
    expect(ARCHIVED_MEMORIAL_NOTICE).toContain('remains online in remembrance')
    expect(ARCHIVED_MEMORIAL_NOTICE).not.toMatch(/closed|expired|removed|deleted/i)
  })
})
