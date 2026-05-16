/** Private bucket: pending uploads (no public SELECT). */
export const GALLERY_SUBMISSIONS_BUCKET = 'gallery-submissions'

/** Public bucket: approved gallery assets. */
export const GALLERY_PUBLIC_BUCKET = 'gallery-public'

/** Aligned with migration 035 `file_size_limit` on both gallery buckets. */
export const GALLERY_MAX_INPUT_BYTES = 12 * 1024 * 1024

export const GALLERY_WEB_MAX_WIDTH = 1920
export const GALLERY_THUMB_MAX_WIDTH = 500

export function gallerySubmissionWebPath(
  owner: { kind: 'anon'; batchId: string } | { kind: 'user'; userId: string },
  fileId: string,
  ext: 'webp' | 'jpg'
): string {
  const prefix = owner.kind === 'anon' ? `pending/a/${owner.batchId}` : `pending/u/${owner.userId}`
  return `${prefix}/${fileId}-web.${ext}`
}

export function gallerySubmissionThumbPath(
  owner: { kind: 'anon'; batchId: string } | { kind: 'user'; userId: string },
  fileId: string,
  ext: 'webp' | 'jpg'
): string {
  const prefix = owner.kind === 'anon' ? `pending/a/${owner.batchId}` : `pending/u/${owner.userId}`
  return `${prefix}/${fileId}-thumb.${ext}`
}

export function galleryPublicObjectKeys(
  albumId: string,
  imageId: string,
  ext: 'webp' | 'jpg'
): { web: string; thumb: string } {
  return {
    web: `published/${albumId}/${imageId}-web.${ext}`,
    thumb: `published/${albumId}/${imageId}-thumb.${ext}`,
  }
}
