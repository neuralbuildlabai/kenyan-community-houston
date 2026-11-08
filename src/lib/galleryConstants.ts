/** Private bucket: pending uploads (no public SELECT). */
export const GALLERY_SUBMISSIONS_BUCKET = 'gallery-submissions'

/**
 * Approved gallery assets. Despite the name, the bucket is private
 * (migration 092): files are shown through signed URLs, and storage
 * policy decides who may sign each one.
 */
export const GALLERY_PUBLIC_BUCKET = 'gallery-public'

const GALLERY_OBJECT_URL = new RegExp(
  `/storage/v1/object/(?:public|sign|authenticated)/${GALLERY_PUBLIC_BUCKET}/([^?#]+)`
)

/**
 * Object path inside the gallery bucket for a stored image URL, or null
 * when the URL is not a gallery storage URL (static files, other buckets).
 * Rows keep the public-style URL written at upload time.
 */
export function galleryObjectPath(url: string | null | undefined): string | null {
  if (!url) return null
  const match = GALLERY_OBJECT_URL.exec(url)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

/** Aligned with migration 035 `file_size_limit` on both gallery buckets. */
export const GALLERY_MAX_INPUT_BYTES = 12 * 1024 * 1024

export const GALLERY_WEB_MAX_WIDTH = 2400
export const GALLERY_THUMB_MAX_WIDTH = 800

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
