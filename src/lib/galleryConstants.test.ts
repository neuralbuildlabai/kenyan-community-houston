import { describe, it, expect } from 'vitest'
import { galleryPublicObjectKeys, gallerySubmissionThumbPath, gallerySubmissionWebPath } from './galleryConstants'

describe('galleryConstants paths', () => {
  it('builds anon submission web path', () => {
    const batch = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const file = 'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj'
    expect(gallerySubmissionWebPath({ kind: 'anon', batchId: batch }, file, 'webp')).toBe(
      `pending/a/${batch}/${file}-web.webp`
    )
  })

  it('builds user submission thumb path', () => {
    const uid = '11111111-2222-3333-4444-555555555555'
    const file = '66666666-7777-8888-9999-aaaaaaaaaaaa'
    expect(gallerySubmissionThumbPath({ kind: 'user', userId: uid }, file, 'jpg')).toBe(
      `pending/u/${uid}/${file}-thumb.jpg`
    )
  })

  it('builds public object keys', () => {
    expect(galleryPublicObjectKeys('album-id', 'img-id', 'webp')).toEqual({
      web: 'published/album-id/img-id-web.webp',
      thumb: 'published/album-id/img-id-thumb.webp',
    })
  })
})
