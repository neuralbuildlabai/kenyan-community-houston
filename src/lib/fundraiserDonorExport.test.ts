import { describe, expect, it } from 'vitest'
import { buildDonorListSheet, donorListFilename, type AdminCollectionRow } from './fundraiserCollections'

function adminRow(id: string, received_on: string, amount: number | string, extra: Partial<AdminCollectionRow> = {}): AdminCollectionRow {
  return {
    id,
    received_on,
    amount,
    description: 'Zelle',
    entry_type: 'individual',
    donor_name: null,
    show_donor_name: false,
    private_note: null,
    created_at: `${received_on}T12:00:00Z`,
    ...extra,
  }
}

describe('buildDonorListSheet', () => {
  it('leads with name, amount and running total, oldest first, with a total line', () => {
    const sheet = buildDonorListSheet([
      adminRow('b', '2026-10-05', '100.50', { donor_name: 'Wanjiru K', show_donor_name: true }),
      adminRow('a', '2026-10-01', 250),
      adminRow('c', '2026-10-07', 40, { donor_name: 'Otieno M', show_donor_name: false, private_note: 'ref 12' }),
    ], ['received_on', 'source', 'entry_type', 'shown_publicly', 'private_note'])
    expect(sheet.columns.slice(0, 3).map((c) => c.header)).toEqual(['Donor name', 'Amount', 'Running total'])
    expect(sheet.rows).toEqual([
      ['Anonymous', 250, 250, '2026-10-01', 'Zelle', 'Individual', 'No', ''],
      ['Wanjiru K', 100.5, 350.5, '2026-10-05', 'Zelle', 'Individual', 'Yes', ''],
      ['Otieno M', 40, 390.5, '2026-10-07', 'Zelle', 'Individual', 'No', 'ref 12'],
    ])
    expect(sheet.footer?.slice(0, 2)).toEqual(['Total — 3 records', 390.5])
  })

  it('totals to zero with no records', () => {
    const sheet = buildDonorListSheet([])
    expect(sheet.rows).toEqual([])
    expect(sheet.footer?.slice(0, 2)).toEqual(['Total — 0 records', 0])
  })
})

describe('buildDonorListSheet column choice', () => {
  const rows = [adminRow('a', '2026-10-01', 250, { donor_name: 'Amani', show_donor_name: false, private_note: 'ref 9' })]

  it('defaults to name, amount, total, date and source', () => {
    const sheet = buildDonorListSheet(rows)
    expect(sheet.columns.map((c) => c.header)).toEqual(['Donor name', 'Amount', 'Running total', 'Date received', 'Source'])
    expect(sheet.rows[0]).toEqual(['Amani', 250, 250, '2026-10-01', 'Zelle'])
  })

  it('can be cut down to the three core columns', () => {
    const sheet = buildDonorListSheet(rows, [])
    expect(sheet.columns.map((c) => c.header)).toEqual(['Donor name', 'Amount', 'Running total'])
    expect(sheet.rows[0]).toEqual(['Amani', 250, 250])
  })

  it('keeps picked columns in a fixed order whatever order they were ticked', () => {
    const sheet = buildDonorListSheet(rows, ['private_note', 'received_on'])
    expect(sheet.columns.map((c) => c.header).slice(3)).toEqual(['Date received', 'Private note'])
    expect(sheet.columns[3].kind).toBe('date')
  })
})

describe('donorListFilename', () => {
  it('slugs the fundraiser title and dates the file in Houston time', () => {
    expect(donorListFilename('Professionals Mixer — Oct 24!', new Date('2026-10-12T15:00:00Z'))).toBe(
      'kigh-donors-professionals-mixer-oct-24-2026-10-12.xlsx'
    )
    // 8:15 pm Houston, already the 13th in UTC.
    expect(donorListFilename('***', new Date('2026-10-13T01:15:00Z'))).toBe('kigh-donors-fundraiser-2026-10-12.xlsx')
  })
})
