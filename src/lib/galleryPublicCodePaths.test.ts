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

  it('GalleryPage reads from gallery_images_public, not gallery_images', () => {
    expect(galleryPage).toContain("from('gallery_images_public')")
    expect(galleryPage).not.toMatch(/from\(\s*['"]gallery_images['"]\s*\)/)
  })

  it('HomePage reads from gallery_images_public, not gallery_images', () => {
    expect(homePage).toContain("from('gallery_images_public')")
    expect(homePage).not.toMatch(/from\(\s*['"]gallery_images['"]\s*\)/)
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
