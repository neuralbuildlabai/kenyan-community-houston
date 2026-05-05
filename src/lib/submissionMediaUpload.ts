import type { SupabaseClient } from '@/lib/supabase'

/** Public bucket for pending-review uploads; paths are unguessable UUID segments. */
export const KIGH_SUBMISSION_MEDIA_BUCKET = 'kigh-submission-media'

/** 10 MB — aligned with `023_kigh_submission_media_bucket.sql` `file_size_limit`. */
export const SUBMISSION_MEDIA_MAX_BYTES = 10 * 1024 * 1024

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

export const submissionMediaAcceptAttr = 'image/jpeg,image/png,image/webp,application/pdf'

export function validateSubmissionMediaFile(file: File): string | null {
  if (!file.size) return 'Please choose a non-empty file.'
  if (!MIME_EXT[file.type]) {
    return 'Use a JPEG, PNG, WebP, or PDF file (max 10 MB).'
  }
  if (file.size > SUBMISSION_MEDIA_MAX_BYTES) {
    return 'File is too large (maximum 10 MB).'
  }
  return null
}

function objectPathForUpload(file: File): { path: string; error?: string } {
  const err = validateSubmissionMediaFile(file)
  if (err) return { path: '', error: err }
  const ext = MIME_EXT[file.type]
  const folder = crypto.randomUUID()
  const name = `${crypto.randomUUID()}${ext}`
  return { path: `public-submissions/${folder}/${name}` }
}

export async function uploadSubmissionMedia(
  supabase: SupabaseClient,
  file: File
): Promise<{ publicUrl: string } | { error: string }> {
  const { path, error: pathErr } = objectPathForUpload(file)
  if (pathErr || !path) return { error: pathErr ?? 'Invalid file.' }

  const { error } = await supabase.storage.from(KIGH_SUBMISSION_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    return { error: error.message || 'Upload failed. Please try again.' }
  }

  const { data } = supabase.storage.from(KIGH_SUBMISSION_MEDIA_BUCKET).getPublicUrl(path)
  return { publicUrl: data.publicUrl }
}
