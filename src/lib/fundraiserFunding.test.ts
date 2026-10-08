import { describe, expect, it } from 'vitest'
import {
  FUNDRAISER_FUNDING_MODES,
  INTERNAL_FUNDRAISER_HELPER_TEXT,
  KIGH_ORGANIZED_LABEL,
  buildFundraiserFundingPayload,
  fundraiserFundingModeLabel,
  fundraiserFundingModePatch,
  isInternalFundraiser,
  normalizeFundraiserFundingMode,
  validateFundraiserFunding,
} from './fundraiserFunding'
import { activeKighSupportOptions, hasActiveKighSupportOptions } from './kighSupportOptions'

describe('fundraiser funding mode', () => {
  it('offers exactly external and internal', () => {
    expect(FUNDRAISER_FUNDING_MODES).toEqual(['external', 'internal'])
  })

  it('treats missing / legacy values as external', () => {
    expect(normalizeFundraiserFundingMode(undefined)).toBe('external')
    expect(normalizeFundraiserFundingMode(null)).toBe('external')
    expect(normalizeFundraiserFundingMode('')).toBe('external')
    expect(normalizeFundraiserFundingMode('something_else')).toBe('external')
    expect(isInternalFundraiser(null)).toBe(false)
  })

  it('recognises the internal selection', () => {
    expect(normalizeFundraiserFundingMode('internal')).toBe('internal')
    expect(isInternalFundraiser('internal')).toBe(true)
  })

  it('labels both modes for the admin picker', () => {
    expect(fundraiserFundingModeLabel('internal')).toBe('Internal (KIGH)')
    expect(fundraiserFundingModeLabel('external')).toBe('External link')
    expect(fundraiserFundingModeLabel(null)).toBe('External link')
  })
})

describe('buildFundraiserFundingPayload', () => {
  it('keeps the external link in external mode', () => {
    expect(
      buildFundraiserFundingPayload({
        fundingMode: 'external',
        donationUrl: ' https://gofundme.com/abc ',
      })
    ).toEqual({ funding_mode: 'external', donation_url: 'https://gofundme.com/abc' })
  })

  it('stores null when no external link was entered', () => {
    expect(buildFundraiserFundingPayload({ fundingMode: 'external', donationUrl: '   ' })).toEqual({
      funding_mode: 'external',
      donation_url: null,
    })
  })

  it('never submits a typed external link in internal mode', () => {
    expect(
      buildFundraiserFundingPayload({
        fundingMode: 'internal',
        donationUrl: 'https://gofundme.com/abc',
      })
    ).toEqual({ funding_mode: 'internal', donation_url: null })
  })
})

describe('fundraiserFundingModePatch', () => {
  it('clears the stored link when an admin switches a row to internal', () => {
    expect(fundraiserFundingModePatch('internal')).toEqual({
      funding_mode: 'internal',
      donation_url: null,
    })
  })

  it('leaves the stored link alone when switching back to external', () => {
    expect(fundraiserFundingModePatch('external')).toEqual({ funding_mode: 'external' })
    expect(fundraiserFundingModePatch(null)).toEqual({ funding_mode: 'external' })
  })
})

describe('validateFundraiserFunding', () => {
  it('accepts external submissions with or without a link', () => {
    expect(validateFundraiserFunding({ fundingMode: 'external' })).toBeNull()
    expect(
      validateFundraiserFunding({ fundingMode: 'external', supportMethodsAvailable: false })
    ).toBeNull()
  })

  it('accepts internal submissions while KIGH handles are configured', () => {
    expect(
      validateFundraiserFunding({ fundingMode: 'internal', supportMethodsAvailable: true })
    ).toBeNull()
  })

  it('blocks internal submissions when no payment method is configured', () => {
    const error = validateFundraiserFunding({
      fundingMode: 'internal',
      supportMethodsAvailable: false,
    })
    expect(error).toMatch(/not configured/i)
  })

  it('defaults to the live support configuration', () => {
    expect(validateFundraiserFunding({ fundingMode: 'internal' })).toBeNull()
    expect(hasActiveKighSupportOptions()).toBe(true)
  })
})

describe('shared KIGH support configuration', () => {
  it('exposes only active handles with a copy value and an absolute https link', () => {
    const options = activeKighSupportOptions()
    expect(options.length).toBeGreaterThan(0)
    for (const option of options) {
      expect(option.active).toBe(true)
      expect(option.copy.trim()).not.toBe('')
      expect(option.handle.trim()).not.toBe('')
      expect(option.href).toMatch(/^https:\/\//)
    }
  })

  it('keeps the attribution and helper copy in one place', () => {
    expect(KIGH_ORGANIZED_LABEL).toBe('Organized by KIGH')
    expect(INTERNAL_FUNDRAISER_HELPER_TEXT).toBe(
      'Donations go directly to KIGH using the payment options below.'
    )
  })
})
