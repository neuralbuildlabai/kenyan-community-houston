import { describe, it, expect } from 'vitest'
import {
  CERTIFICATE_TEMPLATES,
  formatCertificateReference,
  getCertificateEventProgramDisplay,
  LEGACY_CERTIFICATE_EVENT_PREFIX,
} from './certificateTemplates'

describe('getCertificateEventProgramDisplay', () => {
  it('returns null when event/program is empty', () => {
    expect(getCertificateEventProgramDisplay('', 'volunteer-appreciation')).toBeNull()
    expect(getCertificateEventProgramDisplay('   ', 'volunteer-appreciation')).toBeNull()
  })

  it('returns label and trimmed event name when provided', () => {
    const display = getCertificateEventProgramDisplay(
      '  Family Fun Day June 13th 2026  ',
      'volunteer-appreciation',
    )
    expect(display).toEqual({
      label: 'Service / Program',
      name: 'Family Fun Day June 13th 2026',
    })
  })

  it('does not use the legacy "In recognition of:" prefix', () => {
    const display = getCertificateEventProgramDisplay('Family Fun Day', 'volunteer-appreciation')
    expect(display?.name).toBe('Family Fun Day')
    expect(display?.name).not.toContain(LEGACY_CERTIFICATE_EVENT_PREFIX)
    expect(JSON.stringify(display)).not.toContain(LEGACY_CERTIFICATE_EVENT_PREFIX)
  })
})

describe('formatCertificateReference', () => {
  it('formats a UUID into a short KIGH reference code', () => {
    expect(formatCertificateReference('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('KIGH-A1B2C3D4')
  })

  it('returns empty string for invalid input', () => {
    expect(formatCertificateReference('')).toBe('')
  })
})

describe('certificate template copy', () => {
  it('defines a program highlight label for every template', () => {
    for (const template of CERTIFICATE_TEMPLATES) {
      expect(template.programHighlightLabel.trim().length).toBeGreaterThan(0)
    }
  })

  it('avoids duplicate "In recognition of" wording in body copy', () => {
    for (const template of CERTIFICATE_TEMPLATES) {
      const firstParagraph = template.bodyText.split('\n\n')[0]
      expect(firstParagraph).not.toMatch(/^In recognition of\b/i)
      expect(firstParagraph).not.toMatch(/^In sincere recognition of\b/i)
      expect(firstParagraph).not.toMatch(/^In grateful recognition of\b/i)
    }
  })

  it('uses appreciation-oriented language for appreciation certificates', () => {
    const volunteer = CERTIFICATE_TEMPLATES.find((t) => t.id === 'volunteer-appreciation')
    expect(volunteer?.bodyText).toMatch(/^In sincere appreciation of\b/)
    expect(volunteer?.bodyText).not.toMatch(/In sincere recognition of/)

    const donor = CERTIFICATE_TEMPLATES.find((t) => t.id === 'donor-sponsor')
    expect(donor?.bodyText).toMatch(/^In grateful appreciation of\b/)
  })
})
