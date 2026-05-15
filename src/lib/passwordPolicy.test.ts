import { describe, expect, it } from 'vitest'
import {
  PASSWORD_EXPIRY_DAYS,
  getPasswordExpiryDate,
  isPasswordExpired,
  validatePasswordPolicy,
} from '@/lib/passwordPolicy'

describe('validatePasswordPolicy', () => {
  it('accepts Kigh26!, Kenya1!, Maseno9@', () => {
    expect(validatePasswordPolicy('Kigh26!').ok).toBe(true)
    expect(validatePasswordPolicy('Kenya1!').ok).toBe(true)
    expect(validatePasswordPolicy('Maseno9@').ok).toBe(true)
  })

  it('rejects abc123! (no uppercase)', () => {
    const r = validatePasswordPolicy('abc123!')
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('Password must include an uppercase letter.')
  })

  it('rejects ABC123! (no lowercase)', () => {
    const r = validatePasswordPolicy('ABC123!')
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('Password must include a lowercase letter.')
  })

  it('rejects Abcdef! (no number)', () => {
    const r = validatePasswordPolicy('Abcdef!')
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('Password must include a number.')
  })

  it('rejects Abc1234 (no special)', () => {
    const r = validatePasswordPolicy('Abc1234')
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('Password must include a special character.')
  })

  it('rejects Abc 123! (spaces)', () => {
    const r = validatePasswordPolicy('Abc 123!')
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('Password cannot contain spaces.')
  })

  it('rejects Ab1! (too short)', () => {
    const r = validatePasswordPolicy('Ab1!')
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('Password must be at least 6 characters.')
  })

  it('rejects VeryLongPassword123! (over 16)', () => {
    const r = validatePasswordPolicy('VeryLongPassword123!')
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('Password must be 16 characters or less.')
  })
})

describe('isPasswordExpired', () => {
  it('returns false before 180 days', () => {
    const now = new Date('2026-05-15T12:00:00Z')
    const changed = new Date('2026-01-15T12:00:00Z').toISOString()
    expect(isPasswordExpired(changed, now)).toBe(false)
  })

  it('returns true after 180 days', () => {
    const now = new Date('2026-07-20T12:00:00Z')
    const changed = new Date('2026-01-15T12:00:00Z').toISOString()
    expect(isPasswordExpired(changed, now)).toBe(true)
  })

  it('treats null passwordChangedAt as expired', () => {
    expect(isPasswordExpired(null)).toBe(true)
    expect(isPasswordExpired(undefined)).toBe(true)
  })
})

describe('getPasswordExpiryDate', () => {
  it('returns null when changedAt is missing', () => {
    expect(getPasswordExpiryDate(null)).toBeNull()
  })

  it('returns changed + 180 days', () => {
    const changed = '2026-01-01T00:00:00.000Z'
    const d = getPasswordExpiryDate(changed)
    expect(d).not.toBeNull()
    const expectedMs = new Date(changed).getTime() + PASSWORD_EXPIRY_DAYS * 86_400_000
    expect(d!.getTime()).toBe(expectedMs)
  })
})
