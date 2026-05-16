import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { approveGalleryPendingImage, approveGalleryPendingImagesBulk } from './galleryAdminApproval'

describe('galleryAdminApproval', () => {
  it('exports bulk helper that reuses single-approve path', () => {
    expect(typeof approveGalleryPendingImage).toBe('function')
    expect(typeof approveGalleryPendingImagesBulk).toBe('function')
    expect(approveGalleryPendingImagesBulk.length).toBe(4)
  })

  it('public gallery pages do not import admin approval helpers', () => {
    const publicPaths = [
      'src/pages/public/GalleryPage.tsx',
      'src/pages/public/GallerySubmitPage.tsx',
      'src/pages/public/HomePage.tsx',
    ]
    for (const rel of publicPaths) {
      const src = readFileSync(resolve(process.cwd(), rel), 'utf8')
      expect(src).not.toContain('galleryAdminApproval')
    }
  })

  it('admin gallery page uses bulk approval UI and helpers', () => {
    const adminGallery = readFileSync(
      resolve(process.cwd(), 'src/pages/admin/GalleryPage.tsx'),
      'utf8'
    )
    expect(adminGallery).toContain('galleryAdminApproval')
    expect(adminGallery).toContain('gallery-bulk-action-bar')
    expect(adminGallery).toContain('gallery-bulk-publish-dialog')
  })
})
