import type { SupabaseClient } from '@supabase/supabase-js'
import { GALLERY_PUBLIC_BUCKET, galleryPublicObjectKeys } from '@/lib/galleryConstants'

/** Minimum row shape required to approve a pending gallery submission. */
export type GalleryPendingApprovalRow = {
  id: string
  album_id: string | null
  submission_storage_bucket: string | null
  submission_storage_path: string | null
  submission_thumb_path: string | null
}

function extFromPath(path: string | null | undefined): 'webp' | 'jpg' {
  if (!path) return 'jpg'
  return path.endsWith('.webp') ? 'webp' : 'jpg'
}

function contentTypeForExt(ext: 'webp' | 'jpg'): string {
  return ext === 'webp' ? 'image/webp' : 'image/jpeg'
}

/**
 * Copies submission assets to the public bucket and marks the row published.
 * Used by admin single-approve and bulk-approve flows (same safety path).
 */
export async function approveGalleryPendingImage(
  supabase: SupabaseClient,
  row: GalleryPendingApprovalRow,
  targetAlbumId: string,
  approvedByUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const bucket = row.submission_storage_bucket
  const webPath = row.submission_storage_path
  const thumbPath = row.submission_thumb_path
  if (!targetAlbumId) {
    return { ok: false, error: 'Album is required' }
  }
  if (!bucket || !webPath || !thumbPath) {
    return { ok: false, error: 'Missing submission storage paths' }
  }

  const ext = extFromPath(webPath)
  const keys = galleryPublicObjectKeys(targetAlbumId, row.id, ext)
  const ct = contentTypeForExt(ext)

  const { data: webBlob, error: webErr } = await supabase.storage.from(bucket).download(webPath)
  if (webErr || !webBlob) {
    return { ok: false, error: webErr?.message ?? 'Download web image failed' }
  }

  const { data: thumbBlob, error: thumbErr } = await supabase.storage.from(bucket).download(thumbPath)
  if (thumbErr || !thumbBlob) {
    return { ok: false, error: thumbErr?.message ?? 'Download thumbnail failed' }
  }

  const { error: uploadWebErr } = await supabase.storage.from(GALLERY_PUBLIC_BUCKET).upload(keys.web, webBlob, {
    contentType: ct,
    upsert: true,
  })
  if (uploadWebErr) {
    return { ok: false, error: uploadWebErr.message }
  }

  const { error: uploadThumbErr } = await supabase.storage
    .from(GALLERY_PUBLIC_BUCKET)
    .upload(keys.thumb, thumbBlob, { contentType: ct, upsert: true })
  if (uploadThumbErr) {
    return { ok: false, error: uploadThumbErr.message }
  }

  const { data: pubWeb } = supabase.storage.from(GALLERY_PUBLIC_BUCKET).getPublicUrl(keys.web)
  const { data: pubTh } = supabase.storage.from(GALLERY_PUBLIC_BUCKET).getPublicUrl(keys.thumb)

  const { error: dbErr } = await supabase
    .from('gallery_images')
    .update({
      status: 'published',
      album_id: targetAlbumId,
      image_url: pubWeb.publicUrl,
      thumbnail_url: pubTh.publicUrl,
      approved_at: new Date().toISOString(),
      approved_by: approvedByUserId,
      submission_storage_bucket: null,
      submission_storage_path: null,
      submission_thumb_path: null,
    })
    .eq('id', row.id)

  if (dbErr) {
    return { ok: false, error: dbErr.message }
  }

  await supabase.storage.from(bucket).remove([webPath, thumbPath])

  return { ok: true }
}

export type BulkApproveResult = {
  succeeded: number
  failed: number
  errors: { id: string; error: string }[]
}

/** Approve multiple pending images sequentially (clear per-item errors). */
export async function approveGalleryPendingImagesBulk(
  supabase: SupabaseClient,
  rows: GalleryPendingApprovalRow[],
  targetAlbumId: string,
  approvedByUserId: string
): Promise<BulkApproveResult> {
  const errors: { id: string; error: string }[] = []
  let succeeded = 0

  for (const row of rows) {
    const result = await approveGalleryPendingImage(supabase, row, targetAlbumId, approvedByUserId)
    if (result.ok) {
      succeeded++
    } else {
      errors.push({ id: row.id, error: result.error })
    }
  }

  return { succeeded, failed: errors.length, errors }
}
