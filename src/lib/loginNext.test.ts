import { describe, expect, it } from 'vitest'
import { buildLoginNextUrl, loginNextFromLocation } from '@/lib/loginNext'

describe('loginNext', () => {
  it('builds encoded login URL with hash', () => {
    expect(buildLoginNextUrl('/events/foo', '', '#comments')).toBe('/login?next=%2Fevents%2Ffoo%23comments')
  })

  it('uses location hash override', () => {
    expect(
      loginNextFromLocation({ pathname: '/community-feed', search: '', hash: '' }, { hash: '#community-feed-composer' })
    ).toContain('%23community-feed-composer')
  })
})
