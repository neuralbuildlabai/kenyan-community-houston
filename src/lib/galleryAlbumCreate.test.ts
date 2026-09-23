import { describe, expect, it } from 'vitest'
import {
  createdGalleryAlbumFromRpc,
  galleryAlbumDescriptionError,
  galleryAlbumNameError,
  galleryAlbumOptionsFromRpc,
  galleryAlbumSlugBase,
  mergeGalleryAlbumOptions,
  uniqueGalleryAlbumSlug,
} from './galleryAlbumCreate'

describe('gallery album creation helpers', () => {
  it('builds a url slug from a name', () => {
    expect(galleryAlbumSlugBase('  June 13th 2026 Family Fun Day! ')).toBe('june-13th-2026-family-fun-day')
    expect(galleryAlbumSlugBase('***')).toBe('album')
  })

  it('appends a numeric suffix when the slug is taken', () => {
    expect(uniqueGalleryAlbumSlug('Picnic', ['picnic', 'picnic-2'])).toBe('picnic-3')
    expect(uniqueGalleryAlbumSlug('Picnic', [])).toBe('picnic')
  })

  it('rejects album names and descriptions outside the database limits', () => {
    expect(galleryAlbumNameError(' ')).toMatch(/at least 2/)
    expect(galleryAlbumNameError('A'.repeat(81))).toMatch(/80/)
    expect(galleryAlbumNameError('Family day')).toBeNull()
    expect(galleryAlbumDescriptionError('x'.repeat(501))).toMatch(/500/)
    expect(galleryAlbumDescriptionError('')).toBeNull()
  })

  it('reads the create-album rpc row', () => {
    expect(
      createdGalleryAlbumFromRpc([{ id: 'abc', name: 'Picnic', slug: 'picnic' }]),
    ).toEqual({ id: 'abc', name: 'Picnic', slug: 'picnic' })
    expect(createdGalleryAlbumFromRpc([])).toBeNull()
    expect(createdGalleryAlbumFromRpc(null)).toBeNull()
  })

  it('merges open albums with albums the member created', () => {
    const open = [{ id: '1', name: 'Open', slug: 'open' }]
    const mine = [
      { id: '1', name: 'Open duplicate', slug: 'open' },
      { id: '2', name: 'Mine', slug: 'mine' },
    ]
    expect(mergeGalleryAlbumOptions(open, mine)).toEqual([
      { id: '2', name: 'Mine', slug: 'mine' },
      { id: '1', name: 'Open', slug: 'open' },
    ])
    expect(galleryAlbumOptionsFromRpc(mine)).toEqual(mine)
  })
})
