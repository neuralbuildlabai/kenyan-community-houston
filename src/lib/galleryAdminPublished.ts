import type { SupabaseClient } from '@supabase/supabase-js'

export type GalleryAdminMutationResult = { ok: true } | { ok: false; error: string }

export type GalleryBulkMutationResult = {
  succeeded: number
  failed: number
  errors: { id: string; error: string }[]
}

async function updateGalleryStatus(
  supabase: SupabaseClient,
  id: string,
  status: 'unpublished' | 'archived' | 'pending' | 'rejected'
): Promise<GalleryAdminMutationResult> {
  const { error } = await supabase.from('gallery_images').update({ status }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Removes image from public gallery; keeps row and public storage URLs. */
export async function unpublishGalleryImage(
  supabase: SupabaseClient,
  id: string
): Promise<GalleryAdminMutationResult> {
  return updateGalleryStatus(supabase, id, 'unpublished')
}

/** Hides image from public gallery and default published list; keeps audit trail. */
export async function archiveGalleryImage(
  supabase: SupabaseClient,
  id: string
): Promise<GalleryAdminMutationResult> {
  return updateGalleryStatus(supabase, id, 'archived')
}

/** Moves image back to the review queue without deleting files. */
export async function moveGalleryImageToReview(
  supabase: SupabaseClient,
  id: string
): Promise<GalleryAdminMutationResult> {
  return updateGalleryStatus(supabase, id, 'pending')
}

export async function deleteGalleryImagePermanently(
  supabase: SupabaseClient,
  id: string
): Promise<GalleryAdminMutationResult> {
  const { error } = await supabase.from('gallery_images').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

async function runBulk(
  ids: string[],
  fn: (id: string) => Promise<GalleryAdminMutationResult>
): Promise<GalleryBulkMutationResult> {
  const errors: { id: string; error: string }[] = []
  let succeeded = 0
  for (const id of ids) {
    const result = await fn(id)
    if (result.ok) succeeded++
    else errors.push({ id, error: result.error })
  }
  return { succeeded, failed: errors.length, errors }
}

export function unpublishGalleryImagesBulk(
  supabase: SupabaseClient,
  ids: string[]
): Promise<GalleryBulkMutationResult> {
  return runBulk(ids, (id) => unpublishGalleryImage(supabase, id))
}

export function archiveGalleryImagesBulk(
  supabase: SupabaseClient,
  ids: string[]
): Promise<GalleryBulkMutationResult> {
  return runBulk(ids, (id) => archiveGalleryImage(supabase, id))
}
