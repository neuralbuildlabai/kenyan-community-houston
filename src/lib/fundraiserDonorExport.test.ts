import { describe, expect, it } from 'vitest'
import { buildDonorListCsv, donorListFilename, type AdminCollectionRow } from './fundraiserCollections'

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

function lines(csv: string): string[] {
  return csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n')
}

describe('buildDonorListCsv', () => {
  it('lists records oldest first with a running total and a closing total row', () => {
    const csv = buildDonorListCsv([
      adminRow('b', '2026-10-05', '100.50', { donor_name: 'Wanjiru K', show_donor_name: true }),
      adminRow('a', '2026-10-01', 250),
      adminRow('c', '2026-10-07', 40, { donor_name: 'Otieno M', show_donor_name: false }),
    ])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(lines(csv)).toEqual([
      'Date received,Donor name,Name shown publicly,Source / description,Record type,Amount (USD),Running total (USD),Private note',
      '2026-10-01,Anonymous,No,Zelle,Individual,250.00,250.00,',
      '2026-10-05,Wanjiru K,Yes,Zelle,Individual,100.50,350.50,',
      '2026-10-07,Otieno M,No,Zelle,Individual,40.00,390.50,',
      'Total,,,3 records,,390.50,,',
    ])
  })

  it('quotes delimiters and neutralises formula-looking cells', () => {
    const csv = buildDonorListCsv([
      adminRow('a', '2026-10-01', 20, {
        donor_name: '=HYPERLINK("x")',
        show_donor_name: true,
        description: 'Cash, at the mixer',
        entry_type: 'batch',
        private_note: 'Line one\nline two',
      }),
    ])
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(csv).toContain('"Cash, at the mixer",Batch')
    expect(csv).toContain('"Line one\nline two"')
  })

  it('still produces a header and zero total with no records', () => {
    expect(lines(buildDonorListCsv([]))).toHaveLength(2)
    expect(lines(buildDonorListCsv([]))[1]).toBe('Total,,,0 records,,0.00,,')
  })
})

describe('donorListFilename', () => {
  it('slugs the fundraiser title and dates the file', () => {
    expect(donorListFilename('Professionals Mixer — Oct 24!', new Date('2026-10-12T15:00:00Z'))).toBe(
      'kigh-donors-professionals-mixer-oct-24-2026-10-12.csv'
    )
    expect(donorListFilename('***', new Date('2026-10-12T15:00:00Z'))).toBe('kigh-donors-fundraiser-2026-10-12.csv')
  })
})
