import { describe, expect, it } from 'vitest'
import { buildLockedPdf } from './lockedPdf'
import { buildDonorListSheet, donorListFilename, type AdminCollectionRow } from './fundraiserCollections'

const rows: AdminCollectionRow[] = Array.from({ length: 60 }, (_, i) => ({
  id: `r${i}`,
  received_on: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
  amount: 25 + i,
  description: i % 2 ? 'Zelle' : 'Cash App',
  entry_type: 'individual',
  donor_name: i % 3 ? `Donor ${i}` : null,
  show_donor_name: i % 3 === 1,
  private_note: null,
  created_at: `2026-10-01T12:00:${String(i).padStart(2, '0')}Z`,
}))

describe('buildLockedPdf', () => {
  it('produces an encrypted, print-only PDF that pages long lists', async () => {
    const pdf = await buildLockedPdf(buildDonorListSheet(rows), { title: 'Professionals Mixer', subtitle: 'Donor list' })
    const raw = pdf.output()
    expect(raw.startsWith('%PDF-')).toBe(true)
    expect(raw).toContain('/Encrypt')
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1)
  })
})

describe('donorListFilename', () => {
  it('can name the PDF version', () => {
    expect(donorListFilename('Mixer', new Date('2026-10-12T15:00:00Z'), 'pdf')).toBe('kigh-donors-mixer-2026-10-12.pdf')
  })
})
