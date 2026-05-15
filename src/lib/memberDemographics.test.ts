import { describe, expect, it } from 'vitest'
import {
  buildInviteMessage,
  buildWhatsAppInviteUrl,
  isValidWhatsAppNormalizedDigits,
  normalizeWhatsAppPhone,
} from './memberDemographics'

describe('normalizeWhatsAppPhone', () => {
  it('strips formatting characters', () => {
    expect(normalizeWhatsAppPhone('+1 (713) 555-0100')).toBe('17135550100')
    expect(normalizeWhatsAppPhone('713-555-0100')).toBe('7135550100')
    expect(normalizeWhatsAppPhone('+254 712 345 678')).toBe('254712345678')
  })
})

describe('isValidWhatsAppNormalizedDigits', () => {
  it('accepts 7–15 digit strings', () => {
    expect(isValidWhatsAppNormalizedDigits('1234567')).toBe(true)
    expect(isValidWhatsAppNormalizedDigits('1'.repeat(15))).toBe(true)
    expect(isValidWhatsAppNormalizedDigits('123456')).toBe(false)
    expect(isValidWhatsAppNormalizedDigits('1'.repeat(16))).toBe(false)
  })
})

describe('buildWhatsAppInviteUrl', () => {
  it('uses https://wa.me/{digits}?text= encoding', () => {
    const url = buildWhatsAppInviteUrl('17135550100', 'Hello there')
    expect(url.startsWith('https://wa.me/17135550100?text=')).toBe(true)
    expect(url).toContain(encodeURIComponent('Hello there'))
  })
})

describe('buildInviteMessage', () => {
  it('includes site URL and optional name', () => {
    const m = buildInviteMessage({ recipientName: 'Alex', siteUrl: 'https://example.org' })
    expect(m).toContain('Hi Alex,')
    expect(m).toContain('https://example.org')
  })
  it('appends personal note when provided', () => {
    const m = buildInviteMessage({ personalNote: 'See you Sunday', siteUrl: 'https://example.org' })
    expect(m).toContain('Note from me: See you Sunday')
  })
})
