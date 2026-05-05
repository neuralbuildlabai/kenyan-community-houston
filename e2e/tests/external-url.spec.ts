import { test, expect } from '@playwright/test'
import {
  normalizeExternalUrl,
  safeExternalHref,
  prettyExternalLabel,
} from '../../src/lib/externalUrl'

/**
 * Pure-logic tests for the user-supplied external URL helpers used
 * by the Community Groups submit form, the admin edit dialog, and
 * the public listing card. These are the tests that defend the
 * actual symptom the operator reported — "users should be able to
 * click through to the external website" — by guaranteeing that
 * bare hostnames are coerced to absolute URLs and that obviously
 * unsafe protocols are rejected.
 */
test.describe('normalizeExternalUrl', () => {
  test('returns null for empty / whitespace input', () => {
    expect(normalizeExternalUrl('')).toBeNull()
    expect(normalizeExternalUrl('   ')).toBeNull()
    expect(normalizeExternalUrl(null)).toBeNull()
    expect(normalizeExternalUrl(undefined)).toBeNull()
  })

  test('prepends https:// to bare hostnames', () => {
    expect(normalizeExternalUrl('kighsacc.org')).toBe('https://kighsacc.org/')
    expect(normalizeExternalUrl('www.example.com')).toBe(
      'https://www.example.com/'
    )
    expect(normalizeExternalUrl('example.com/path?x=1')).toBe(
      'https://example.com/path?x=1'
    )
  })

  test('preserves valid http(s) URLs', () => {
    expect(normalizeExternalUrl('https://example.com')).toBe(
      'https://example.com/'
    )
    expect(normalizeExternalUrl('http://example.com/')).toBe(
      'http://example.com/'
    )
  })

  test('rejects unsafe protocols', () => {
    expect(normalizeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeExternalUrl('JAVASCRIPT:alert(1)')).toBeNull()
    expect(normalizeExternalUrl('data:text/html,evil')).toBeNull()
    expect(normalizeExternalUrl('vbscript:msgbox(1)')).toBeNull()
    expect(normalizeExternalUrl('file:///etc/passwd')).toBeNull()
  })

  test('rejects values that cannot be parsed as a URL', () => {
    expect(normalizeExternalUrl('not a url')).toBeNull()
    expect(normalizeExternalUrl('plain-string-no-dot')).toBeNull()
  })

  test('allows mailto: and tel: passthrough', () => {
    expect(normalizeExternalUrl('mailto:hello@example.com')).toBe(
      'mailto:hello@example.com'
    )
    expect(normalizeExternalUrl('tel:+15551234')).toBe('tel:+15551234')
  })

  test('safeExternalHref mirrors normalizeExternalUrl', () => {
    expect(safeExternalHref('example.org')).toBe('https://example.org/')
    expect(safeExternalHref('javascript:alert(1)')).toBeNull()
    expect(safeExternalHref('')).toBeNull()
  })
})

test.describe('prettyExternalLabel', () => {
  test('strips protocol and www', () => {
    expect(prettyExternalLabel('https://www.kighsacc.org/about')).toBe(
      'kighsacc.org/about'
    )
    expect(prettyExternalLabel('http://example.com/')).toBe('example.com')
  })

  test('handles bare hostnames', () => {
    expect(prettyExternalLabel('example.org')).toBe('example.org')
  })

  test('falls back gracefully for unparseable input', () => {
    expect(prettyExternalLabel('  ')).toBe('')
    expect(prettyExternalLabel(null)).toBe('')
  })
})
