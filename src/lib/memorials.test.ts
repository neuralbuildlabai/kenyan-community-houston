import { describe, expect, it } from 'vitest'
import {
  COLLINS_COLLO_NAMASWA,
  COLLINS_COLLO_NAMASWA_SLUG,
  MEMORIALS,
  getMemorialBySlug,
  memorialPath,
} from './memorials'

describe('memorials registry', () => {
  it('registers Collins as the first memorial entry', () => {
    expect(MEMORIALS.length).toBeGreaterThanOrEqual(1)
    expect(MEMORIALS[0]?.slug).toBe(COLLINS_COLLO_NAMASWA_SLUG)
  })

  it('resolves Collins by slug with correct asset paths', () => {
    const entry = getMemorialBySlug(COLLINS_COLLO_NAMASWA_SLUG)
    expect(entry).toBeDefined()
    expect(entry?.fullName).toBe('Collins “Collo” Namaswa')
    expect(entry?.memorialHeading).toBe('Forever in Our Hearts')
    expect(entry?.parents).toContain('Judy Cheruto')
    expect(entry?.parents).toContain('Nixon Namaswa Wetende')
    expect(entry?.siblings).toBe('Trevor Kiplangat')
    expect(entry?.funeralProgramPath).toBe(
      '/memorials/collins-collo-namaswa/collins-collo-namaswa-funeral-program.pdf',
    )
    expect(entry?.qrPngPath).toBe(
      '/memorials/collins-collo-namaswa/collins-collo-namaswa-memorial-qr.png',
    )
    expect(entry?.qrPrintPngPath).toBe(
      '/memorials/collins-collo-namaswa/collins-collo-namaswa-memorial-qr-print.png',
    )
    expect(entry?.qrSvgPath).toBe(
      '/memorials/collins-collo-namaswa/collins-collo-namaswa-memorial-qr.svg',
    )
    expect(entry?.permanentUrl).toBe(
      'https://kenyansingreaterhouston.org/memorials/collins-collo-namaswa',
    )
  })

  it('builds the stable public path used by QR codes', () => {
    expect(memorialPath(COLLINS_COLLO_NAMASWA_SLUG)).toBe(
      '/memorials/collins-collo-namaswa',
    )
  })

  it('does not invent private contact fields on the memorial record', () => {
    const raw = JSON.stringify(COLLINS_COLLO_NAMASWA)
    expect(raw).not.toMatch(/Glow Berry/i)
    expect(raw).not.toMatch(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/)
    expect(raw).not.toMatch(/@gmail\.com/i)
  })
})
