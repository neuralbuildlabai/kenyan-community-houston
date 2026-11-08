import { describe, expect, it } from 'vitest'
import { resolvePostLoginPath, sanitizeNextParam } from '@/lib/authRedirect'

describe('sanitizeNextParam', () => {
  it('allows internal paths with hash fragments', () => {
    expect(sanitizeNextParam('/events/foo%23comments')).toBe('/events/foo#comments')
    expect(sanitizeNextParam('/community-feed#community-feed-composer')).toBe(
      '/community-feed#community-feed-composer'
    )
  })

  it('rejects external URLs', () => {
    expect(sanitizeNextParam('https://evil.example/phish')).toBeNull()
    expect(sanitizeNextParam('//evil.example')).toBeNull()
  })
})

describe('resolvePostLoginPath', () => {
  it('returns event comments hash for members', () => {
    expect(resolvePostLoginPath('/events/kigh-day#comments', 'member')).toBe('/events/kigh-day#comments')
  })

  it('blocks admin paths for non-admins', () => {
    expect(resolvePostLoginPath('/admin/members', 'member')).toBe('/profile')
  })
})

// GHSA-wrjc-x8rr-h8h6: React Router 6 can treat a backslash in <Link>/navigate()
// targets as a protocol-relative URL. Every untrusted target goes through
// sanitizeNextParam, so it must reject every backslash spelling.
describe('sanitizeNextParam backslash open-redirect guard', () => {
  it.each(['/\\evil.example', '\\\\evil.example', '/%5Cevil.example', '/%5C%5Cevil.example', '/%5c/evil.example', '/events/%5C%5Cevil'])(
    'rejects %s',
    (raw) => {
      expect(sanitizeNextParam(raw)).toBeNull()
    }
  )

  it('rejects protocol-relative and absolute targets', () => {
    expect(sanitizeNextParam('//evil.example')).toBeNull()
    expect(sanitizeNextParam('/%2F%2Fevil.example'.replace('/', ''))).toBeNull()
    expect(sanitizeNextParam('https://evil.example')).toBeNull()
  })
})
