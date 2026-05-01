/** Private bucket for avatars and member-owned media paths `{userId}/…`. */
export const KIGH_MEMBER_MEDIA_BUCKET = 'kigh-member-media'

/** Pending gallery/community submissions `{userId}/…`. */
export const KIGH_GALLERY_SUBMISSIONS_BUCKET = 'kigh-gallery-submissions'

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const MEMBER_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const MEMBER_VIDEO_MAX_BYTES = 50 * 1024 * 1024

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

export function isAllowedAvatarMime(mime: string): boolean {
  return IMAGE_TYPES.has(mime)
}

export function isAllowedSubmissionImageMime(mime: string): boolean {
  return IMAGE_TYPES.has(mime)
}

export function isAllowedSubmissionVideoMime(mime: string): boolean {
  return VIDEO_TYPES.has(mime)
}

export function submissionMediaType(mime: string): 'image' | 'video' | null {
  if (IMAGE_TYPES.has(mime)) return 'image'
  if (VIDEO_TYPES.has(mime)) return 'video'
  return null
}

export function maxBytesForSubmission(mime: string): number {
  if (VIDEO_TYPES.has(mime)) return MEMBER_VIDEO_MAX_BYTES
  return MEMBER_IMAGE_MAX_BYTES
}
