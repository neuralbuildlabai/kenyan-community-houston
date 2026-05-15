import { describe, expect, it } from 'vitest'
import {
  isValidInternationalPhone,
  normalizePhoneNumber,
  phoneDigitsOnly,
  validatePhoneNumber,
} from './phoneValidation'

const E164ISH = /^\+?[0-9]{7,15}$/

describe('normalizePhoneNumber', () => {
  it('strips spaces, hyphens, parentheses, dots', () => {
    expect(normalizePhoneNumber('+1 713 555 1212')).toBe('+17135551212')
    expect(normalizePhoneNumber('713-555-1212')).toBe('7135551212')
    expect(normalizePhoneNumber('(713) 555-1212')).toBe('7135551212')
  })
})

describe('validatePhoneNumber', () => {
  it('accepts +254713936343', () => {
    const r = validatePhoneNumber('+254713936343')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toBe('+254713936343')
      expect(r.value).toMatch(E164ISH)
    }
  })

  it('accepts 254713936343', () => {
    const r = validatePhoneNumber('254713936343')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('254713936343')
  })

  it('accepts +17135551212', () => {
    const r = validatePhoneNumber('+17135551212')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toMatch(E164ISH)
  })

  it('rejects abc123', () => {
    expect(validatePhoneNumber('abc123').ok).toBe(false)
  })

  it('normalizes +1 713 555 1212 to +17135551212', () => {
    const r = validatePhoneNumber('+1 713 555 1212')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('+17135551212')
  })

  it('normalizes 713-555-1212 to 7135551212', () => {
    const r = validatePhoneNumber('713-555-1212')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('7135551212')
  })

  it('rejects ++17135551212', () => {
    expect(validatePhoneNumber('++17135551212').ok).toBe(false)
  })

  it('rejects +254ABC', () => {
    expect(validatePhoneNumber('+254ABC').ok).toBe(false)
  })

  it('rejects fewer than 7 digits', () => {
    expect(validatePhoneNumber('+12345').ok).toBe(false)
  })

  it('rejects more than 15 digits', () => {
    expect(validatePhoneNumber('+' + '1'.repeat(16)).ok).toBe(false)
  })

  it('allowEmpty returns null for blank', () => {
    const r = validatePhoneNumber('   ', { allowEmpty: true })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeNull()
  })
})

describe('phoneDigitsOnly', () => {
  it('strips plus for wa.me', () => {
    expect(phoneDigitsOnly('+17135550100')).toBe('17135550100')
  })
})

describe('isValidInternationalPhone', () => {
  it('matches canonical pattern only', () => {
    expect(isValidInternationalPhone('+447911123456')).toBe(true)
    expect(isValidInternationalPhone('abc')).toBe(false)
  })
})
