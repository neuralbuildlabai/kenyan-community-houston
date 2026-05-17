import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  archiveGalleryImage,
  unpublishGalleryImage,
  unpublishGalleryImagesBulk,
} from './galleryAdminPublished'

describe('galleryAdminPublished', () => {
  it('exports admin publish-management helpers', () => {
    expect(typeof unpublishGalleryImage).toBe('function')
    expect(typeof archiveGalleryImage).toBe('function')
    expect(typeof unpublishGalleryImagesBulk).toBe('function')
  })

  it('public gallery pages do not import admin published helpers', () => {
    const publicPaths = [
      'src/pages/public/GalleryPage.tsx',
      'src/pages/public/GallerySubmitPage.tsx',
      'src/pages/public/HomePage.tsx',
    ]
    for (const rel of publicPaths) {
      const src = readFileSync(resolve(process.cwd(), rel), 'utf8')
      expect(src).not.toContain('galleryAdminPublished')
    }
  })

  it('admin gallery page wires published management UI', () => {
    const adminGallery = readFileSync(
      resolve(process.cwd(), 'src/pages/admin/GalleryPage.tsx'),
      'utf8'
    )
    expect(adminGallery).toContain('galleryAdminPublished')
    const publishedLib = readFileSync(
      resolve(process.cwd(), 'src/lib/galleryAdminPublished.ts'),
      'utf8'
    )
    expect(publishedLib).toContain('admin_delete_gallery_image')
    expect(adminGallery).toContain('gallery-published-unpublish')
    expect(adminGallery).toContain('gallery-published-archive')
    expect(adminGallery).toContain('data-testid="gallery-published-grid"')
    expect(adminGallery).toContain("'published'")
    expect(adminGallery).toContain('onValueChange')
    expect(adminGallery).toContain('Unpublish image?')
  })
})
