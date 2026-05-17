import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('galleryAdminImages', () => {
  it('admin gallery page loads images via admin_list_gallery_images RPC', () => {
    const adminGallery = readFileSync(
      resolve(process.cwd(), 'src/pages/admin/GalleryPage.tsx'),
      'utf8'
    )
    const helper = readFileSync(
      resolve(process.cwd(), 'src/lib/galleryAdminImages.ts'),
      'utf8'
    )
    expect(helper).toContain('admin_list_gallery_images')
    expect(adminGallery).toContain('fetchAdminGalleryImages')
    expect(adminGallery).not.toMatch(
      /\.from\(\s*['"]gallery_images['"]\s*\)\s*\.select\([\s\S]*submitted_by_email/
    )
  })
})
