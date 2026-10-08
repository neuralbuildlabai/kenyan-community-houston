import { describe, expect, it } from 'vitest'
import {
  buildCollectionPayload,
  collectionDraftFromRow,
  emptyCollectionDraft,
  entryTypeLabel,
  formatCents,
  formatPercent,
  normalizeEntryType,
  previewCollectedCents,
  publicDonorLabel,
  summarizeFundraiserCollections,
  toCents,
  validateCollectionDraft,
  type AdminCollectionRow,
  type CollectionDraft,
  type PublicCollectionRow,
} from './fundraiserCollections'

const GOAL = 2000

function row(
  id: string,
  received_on: string,
  amount: number | string,
  extra: Partial<PublicCollectionRow> = {}
): PublicCollectionRow {
  return {
    id,
    received_on,
    amount,
    description: `Collection ${id}`,
    created_at: `${received_on}T12:00:00.000Z`,
    ...extra,
  }
}

describe('toCents', () => {
  it('reads the numbers and the strings PostgREST sends for numeric columns', () => {
    expect(toCents(1500)).toBe(150_000)
    expect(toCents('1500.00')).toBe(150_000)
    expect(toCents('37.5')).toBe(3_750)
  })

  it('tolerates typed currency formatting and rejects nonsense', () => {
    expect(toCents('$1,250.75')).toBe(125_075)
    expect(toCents('')).toBe(0)
    expect(toCents('abc')).toBe(0)
    expect(toCents(null)).toBe(0)
    expect(toCents(undefined)).toBe(0)
  })

  it('does not accumulate floating point residue across a ledger', () => {
    const summary = summarizeFundraiserCollections(
      [row('a', '2026-01-01', 0.1), row('b', '2026-01-02', 0.2)],
      null
    )
    expect(summary.collectedCents).toBe(30)
    expect(formatCents(summary.collectedCents)).toBe('$0.30')
  })
})

describe('formatCents', () => {
  it('omits cents on round amounts and keeps them otherwise', () => {
    expect(formatCents(200_000)).toBe('$2,000')
    expect(formatCents(0)).toBe('$0')
    expect(formatCents(3_750)).toBe('$37.50')
  })
})

describe('formatPercent', () => {
  it('keeps a half percent but not a trailing zero', () => {
    expect(formatPercent(75)).toBe('75%')
    expect(formatPercent(112.5)).toBe('112.5%')
    expect(formatPercent(0)).toBe('0%')
  })
})

describe('summarizeFundraiserCollections', () => {
  it('starts at $0 with no confirmed records', () => {
    const summary = summarizeFundraiserCollections([], GOAL)
    expect(summary.collectedCents).toBe(0)
    expect(summary.percentRaised).toBe(0)
    expect(summary.progressBarPercent).toBe(0)
    expect(summary.remainingCents).toBe(200_000)
    expect(summary.goalReached).toBe(false)
    expect(summary.rows).toEqual([])
    expect(summary.lastUpdated).toBeNull()
  })

  it('treats a missing ledger the same as an empty one', () => {
    expect(summarizeFundraiserCollections(null, GOAL).collectedCents).toBe(0)
    expect(summarizeFundraiserCollections(undefined, GOAL).collectedCents).toBe(0)
  })

  // The three scenarios the feature is specified against.
  it('reports 75% raised and $500 remaining at $1,500 of a $2,000 goal', () => {
    const summary = summarizeFundraiserCollections(
      [row('a', '2026-01-01', 1000), row('b', '2026-01-05', 500)],
      GOAL
    )
    expect(formatCents(summary.collectedCents)).toBe('$1,500')
    expect(summary.percentRaised).toBe(75)
    expect(summary.progressBarPercent).toBe(75)
    expect(formatCents(summary.remainingCents)).toBe('$500')
    expect(summary.goalReached).toBe(false)
    expect(summary.overageCents).toBe(0)
  })

  it('reaches the goal with nothing remaining at exactly $2,000', () => {
    const summary = summarizeFundraiserCollections([row('a', '2026-01-01', 2000)], GOAL)
    expect(summary.goalReached).toBe(true)
    expect(summary.percentRaised).toBe(100)
    expect(summary.remainingCents).toBe(0)
    expect(formatCents(summary.remainingCents)).toBe('$0')
    expect(summary.overageCents).toBe(0)
  })

  it('keeps reporting the real figures past the goal, with the bar capped', () => {
    const summary = summarizeFundraiserCollections(
      [row('a', '2026-01-01', 2000), row('b', '2026-01-02', 250)],
      GOAL
    )
    expect(formatCents(summary.collectedCents)).toBe('$2,250')
    expect(summary.percentRaised).toBe(112.5)
    expect(formatPercent(summary.percentRaised!)).toBe('112.5%')
    expect(summary.progressBarPercent).toBe(100)
    expect(formatCents(summary.overageCents)).toBe('$250')
    expect(summary.remainingCents).toBe(0)
    expect(summary.goalReached).toBe(true)
  })

  it('runs the table total forward in date order regardless of fetch order', () => {
    const summary = summarizeFundraiserCollections(
      [row('c', '2026-03-01', 25), row('a', '2026-01-01', 100), row('b', '2026-02-01', 50)],
      null
    )
    expect(summary.rows.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(summary.rows.map((r) => r.runningTotalCents)).toEqual([10_000, 15_000, 17_500])
    expect(summary.rows[summary.rows.length - 1].runningTotalCents).toBe(summary.collectedCents)
  })

  it('breaks a same-day tie on insertion order so the running total is stable', () => {
    const summary = summarizeFundraiserCollections(
      [
        row('second', '2026-01-01', 10, { created_at: '2026-01-01T18:00:00.000Z' }),
        row('first', '2026-01-01', 90, { created_at: '2026-01-01T09:00:00.000Z' }),
      ],
      null
    )
    expect(summary.rows.map((r) => r.id)).toEqual(['first', 'second'])
  })

  it('omits percentage and remaining when no goal is set', () => {
    const summary = summarizeFundraiserCollections([row('a', '2026-01-01', 100)], null)
    expect(summary.percentRaised).toBeNull()
    expect(summary.goalReached).toBe(false)
    expect(summary.remainingCents).toBe(0)
  })

  it('reports the most recent admin edit as the last update', () => {
    const summary = summarizeFundraiserCollections(
      [
        row('a', '2026-01-01', 100, { updated_at: '2026-01-02T10:00:00.000Z' }),
        row('b', '2026-01-05', 100, { updated_at: '2026-01-06T08:00:00.000Z' }),
      ],
      GOAL
    )
    expect(summary.lastUpdated).toBe('2026-01-06T08:00:00.000Z')
  })
})

describe('publicDonorLabel', () => {
  it('names a donor only where an admin published the name', () => {
    expect(publicDonorLabel(row('a', '2026-01-01', 10))).toBeNull()
    expect(publicDonorLabel(row('b', '2026-01-01', 10, { public_donor_name: null }))).toBeNull()
    expect(publicDonorLabel(row('c', '2026-01-01', 10, { public_donor_name: '  ' }))).toBeNull()
    expect(publicDonorLabel(row('d', '2026-01-01', 10, { public_donor_name: 'Jane W.' }))).toBe(
      'Jane W.'
    )
  })
})

describe('entry types', () => {
  it('defaults to an individual donation and labels a batch clearly', () => {
    expect(normalizeEntryType(undefined)).toBe('individual')
    expect(normalizeEntryType('nonsense')).toBe('individual')
    expect(normalizeEntryType('batch')).toBe('batch')
    expect(entryTypeLabel('batch')).toBe('Batch')
    expect(entryTypeLabel(null)).toBe('Individual')
  })
})

describe('validateCollectionDraft', () => {
  const valid: CollectionDraft = {
    ...emptyCollectionDraft(new Date('2026-02-01T00:00:00.000Z')),
    amount: '250',
    description: 'Cash App collections',
  }

  it('accepts a complete draft', () => {
    expect(validateCollectionDraft(valid)).toBeNull()
  })

  it('refuses zero, negative and missing amounts', () => {
    expect(validateCollectionDraft({ ...valid, amount: '' })).toMatch(/greater than zero/)
    expect(validateCollectionDraft({ ...valid, amount: '0' })).toMatch(/greater than zero/)
    expect(validateCollectionDraft({ ...valid, amount: '-50' })).toMatch(/greater than zero/)
  })

  it('requires a date and a public description', () => {
    expect(validateCollectionDraft({ ...valid, received_on: '' })).toMatch(/date/)
    expect(validateCollectionDraft({ ...valid, description: 'x' })).toMatch(/description/)
    expect(validateCollectionDraft({ ...valid, description: 'x'.repeat(161) })).toMatch(
      /description/
    )
  })

  it('will not publish a donor name that was never entered', () => {
    expect(validateCollectionDraft({ ...valid, show_donor_name: true })).toMatch(/donor name/)
    expect(
      validateCollectionDraft({ ...valid, show_donor_name: true, donor_name: 'Jane W.' })
    ).toBeNull()
  })

  it('caps the private note at the length the database accepts', () => {
    expect(validateCollectionDraft({ ...valid, private_note: 'n'.repeat(501) })).toMatch(/500/)
  })
})

describe('buildCollectionPayload', () => {
  const base: CollectionDraft = {
    received_on: '2026-02-01',
    amount: '1,250.75',
    description: '  Business contribution  ',
    entry_type: 'batch',
    donor_name: ' Jane W. ',
    show_donor_name: false,
    private_note: '  ',
  }

  it('drops a donor name that is not being displayed', () => {
    const payload = buildCollectionPayload('f1', base)
    expect(payload.donor_name).toBeNull()
    expect(payload.show_donor_name).toBe(false)
  })

  it('keeps a donor name the admin chose to display', () => {
    const payload = buildCollectionPayload('f1', { ...base, show_donor_name: true })
    expect(payload.donor_name).toBe('Jane W.')
    expect(payload.show_donor_name).toBe(true)
  })

  it('normalises the money, text and empty private note', () => {
    const payload = buildCollectionPayload('f1', base)
    expect(payload.fundraiser_id).toBe('f1')
    expect(payload.amount).toBe(1250.75)
    expect(payload.description).toBe('Business contribution')
    expect(payload.entry_type).toBe('batch')
    expect(payload.private_note).toBeNull()
  })

  it('round-trips an existing row back into an editable draft', () => {
    const stored: AdminCollectionRow = {
      id: 'c1',
      received_on: '2026-02-01',
      amount: '1250.75',
      description: 'Business contribution',
      entry_type: 'batch',
      donor_name: 'Jane W.',
      show_donor_name: true,
      private_note: 'Deposited 2026-02-03',
    }
    const draft = collectionDraftFromRow(stored)
    expect(draft.amount).toBe('1250.75')
    expect(buildCollectionPayload('f1', draft).amount).toBe(1250.75)
    expect(draft.show_donor_name).toBe(true)
  })
})

describe('previewCollectedCents', () => {
  const ledger = [row('a', '2026-01-01', 1000), row('b', '2026-01-05', 500)]

  it('shows what adding a record makes the total', () => {
    const draft = { ...emptyCollectionDraft(), amount: '250' }
    expect(formatCents(previewCollectedCents(ledger, draft))).toBe('$1,750')
  })

  it('swaps rather than doubles the row being edited', () => {
    const draft = { ...emptyCollectionDraft(), amount: '750' }
    expect(formatCents(previewCollectedCents(ledger, draft, 'b'))).toBe('$1,750')
  })

  it('leaves the total alone while the amount field is empty', () => {
    const draft = emptyCollectionDraft()
    expect(formatCents(previewCollectedCents(ledger, draft))).toBe('$1,500')
  })
})
