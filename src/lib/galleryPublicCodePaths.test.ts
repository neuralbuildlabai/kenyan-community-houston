import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Static guard — the public-facing gallery pages must never touch the
 * raw `gallery_images` table or reference submitter identity columns.
 * They must read from the `gallery_images_public` view (migration 036).
 */
describe('public gallery code paths — submitter PII guard', () => {
  const galleryPage = readFileSync(
    resolve(process.cwd(), 'src/pages/public/GalleryPage.tsx'),
    'utf8'
  )
  const homePage = readFileSync(
    resolve(process.cwd(), 'src/pages/public/HomePage.tsx'),
    'utf8'
  )
  const gallerySubmitPage = readFileSync(
    resolve(process.cwd(), 'src/pages/public/GallerySubmitPage.tsx'),
    'utf8'
  )

  it('GalleryPage reads from gallery_images_public, not gallery_images', () => {
    expect(galleryPage).toContain("from('gallery_images_public')")
    expect(galleryPage).not.toMatch(/from\(\s*['"]gallery_images['"]\s*\)/)
  })

  it('GalleryPage reads albums from gallery_albums_public, not gallery_albums', () => {
    expect(galleryPage).toContain("from('gallery_albums_public')")
    expect(galleryPage).not.toMatch(/from\(\s*['"]gallery_albums['"]\s*\)/)
  })

  it('GallerySubmitPage reads albums from gallery_albums_public', () => {
    expect(gallerySubmitPage).toContain("from('gallery_albums_public')")
    expect(gallerySubmitPage).not.toMatch(/from\(\s*['"]gallery_albums['"]\s*\)/)
  })

  it('signed-in members create albums through the member rpc, not the albums table', () => {
    expect(gallerySubmitPage).toContain("rpc('kigh_create_member_gallery_album'")
    expect(gallerySubmitPage).toContain("rpc('kigh_list_my_gallery_albums'")
    expect(gallerySubmitPage).toContain('gallery-submit-new-album-name')
    expect(gallerySubmitPage).toContain('gallery-submit-create-album-sign-in')
  })

  it('GallerySubmitPage file input allows multiple images', () => {
    expect(gallerySubmitPage).toMatch(/multiple[\s\S]*gallery-submit-file-input|gallery-submit-file-input[\s\S]*multiple/)
  })

  it('HomePage reads from gallery_images_public, not gallery_images', () => {
    expect(homePage).toContain("from('gallery_images_public')")
    expect(homePage).not.toMatch(/from\(\s*['"]gallery_images['"]\s*\)/)
  })

  it('shows one public cover per album and keeps the full album behind sign-in', () => {
    expect(galleryPage).toContain('useAuth()')
    expect(galleryPage).toContain('data-testid="gallery-members-only"')
    expect(galleryPage).toContain('data-testid="gallery-cover-grid"')
    expect(galleryPage).toContain('data-testid="gallery-cover-card"')
    expect(galleryPage).toContain('loginNextFromLocation(location)')
    expect(galleryPage).toContain('buildLoginNextUrl(')
    const signedOutBranch = galleryPage.slice(
      galleryPage.indexOf('if (!userId)'),
      galleryPage.indexOf("from('gallery_images_public')"),
    )
    expect(signedOutBranch).toContain('setImages([])')
    expect(signedOutBranch).not.toContain("from('gallery_images_public')")
  })

  it('GalleryPage does not select submitter PII columns', () => {
    expect(galleryPage).not.toMatch(/submitted_by_email/)
    expect(galleryPage).not.toMatch(/submitted_by_name/)
    expect(galleryPage).not.toMatch(/submitted_by_user_id/)
  })

  it('HomePage does not select submitter PII columns', () => {
    expect(homePage).not.toMatch(/submitted_by_email/)
    expect(homePage).not.toMatch(/submitted_by_name/)
    expect(homePage).not.toMatch(/submitted_by_user_id/)
  })
})
