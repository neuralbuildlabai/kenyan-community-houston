import { describe, expect, it } from 'vitest'
import { MIN_FILL_MS, isRateLimitedError, looksAutomated } from './formBotGuard'

describe('looksAutomated', () => {
  const startedAt = 1_000_000

  it('flags a filled trap field even after a normal fill time', () => {
    expect(looksAutomated('https://spam.example', startedAt, startedAt + 60_000)).toBe(true)
  })

  it('flags a submit faster than the minimum fill time', () => {
    expect(looksAutomated('', startedAt, startedAt + MIN_FILL_MS - 1)).toBe(true)
  })

  it('passes an empty trap submitted at a human pace', () => {
    expect(looksAutomated('', startedAt, startedAt + MIN_FILL_MS)).toBe(false)
    expect(looksAutomated('   ', startedAt, startedAt + 30_000)).toBe(false)
  })
})

describe('isRateLimitedError', () => {
  it('detects the database throttle error', () => {
    expect(isRateLimitedError({ message: 'rate_limited' })).toBe(true)
    expect(isRateLimitedError({ message: 'ERROR: rate_limited (P0001)' })).toBe(true)
  })

  it('ignores other errors and missing values', () => {
    expect(isRateLimitedError({ message: 'duplicate_signup' })).toBe(false)
    expect(isRateLimitedError({ message: null })).toBe(false)
    expect(isRateLimitedError({})).toBe(false)
    expect(isRateLimitedError(null)).toBe(false)
    expect(isRateLimitedError(undefined)).toBe(false)
  })
})
