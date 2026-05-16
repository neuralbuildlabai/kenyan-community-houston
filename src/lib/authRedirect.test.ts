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
