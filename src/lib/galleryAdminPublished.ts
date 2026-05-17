import type { SupabaseClient } from '@supabase/supabase-js'
import { formatAdminActionError } from '@/lib/adminActionErrors'

export type GalleryAdminMutationResult =
  | { ok: true; storageWarning?: string }
  | { ok: false; error: string }

/** Unpublish moves published images back to the review queue. */
export const GALLERY_UNPUBLISH_STATUS = 'pending' as const

const GALLERY_ADMIN_SET_STATUS = {
  unpublish: GALLERY_UNPUBLISH_STATUS,
  archive: 'archived',
  reject: 'rejected',
} as const

export type GalleryBulkMutationResult = {
  succeeded: number
  failed: number
  errors: { id: string; error: string }[]
}

type GalleryStorageObjectRef = { bucket: string; paths: string[] }

type AdminDeleteGalleryImagePayload = {
  deleted?: boolean
  image_id?: string
  storage_objects?: GalleryStorageObjectRef[]
}

async function setGalleryStatus(
  supabase: SupabaseClient,
  id: string,
  status: (typeof GALLERY_ADMIN_SET_STATUS)[keyof typeof GALLERY_ADMIN_SET_STATUS]
): Promise<GalleryAdminMutationResult> {
  const { error } = await supabase.rpc('admin_set_gallery_image_status', {
    p_image_id: id,
    p_status: status,
  })
  if (error) return { ok: false, error: formatAdminActionError(error) }
  return { ok: true }
}

/** Removes image from public gallery; keeps row and public storage URLs. */
export async function unpublishGalleryImage(
  supabase: SupabaseClient,
  id: string
): Promise<GalleryAdminMutationResult> {
  return setGalleryStatus(supabase, id, GALLERY_ADMIN_SET_STATUS.unpublish)
}

export async function rejectGalleryImage(
  supabase: SupabaseClient,
  id: string
): Promise<GalleryAdminMutationResult> {
  return setGalleryStatus(supabase, id, GALLERY_ADMIN_SET_STATUS.reject)
}

/** Hides image from public gallery and default published list; keeps audit trail. */
export async function archiveGalleryImage(
  supabase: SupabaseClient,
  id: string
): Promise<GalleryAdminMutationResult> {
  return setGalleryStatus(supabase, id, GALLERY_ADMIN_SET_STATUS.archive)
}

/** Moves image back to the review queue without deleting files. */
export async function moveGalleryImageToReview(
  supabase: SupabaseClient,
  id: string
): Promise<GalleryAdminMutationResult> {
  return setGalleryStatus(supabase, id, 'pending')
}

async function removeGalleryStorageObjects(
  supabase: SupabaseClient,
  refs: GalleryStorageObjectRef[] | undefined
): Promise<string | null> {
  if (!refs?.length) return null
  for (const ref of refs) {
    const paths = (ref.paths ?? []).filter(Boolean)
    if (!ref.bucket || paths.length === 0) continue
    const { error } = await supabase.storage.from(ref.bucket).remove(paths)
    if (error) return error.message
  }
  return null
}

export async function deleteGalleryImagePermanently(
  supabase: SupabaseClient,
  id: string
): Promise<GalleryAdminMutationResult> {
  const { data, error } = await supabase.rpc('admin_delete_gallery_image', {
    p_image_id: id,
  })
  if (error) return { ok: false, error: formatAdminActionError(error) }

  const payload = data as AdminDeleteGalleryImagePayload | null
  const storageError = await removeGalleryStorageObjects(supabase, payload?.storage_objects)
  if (storageError) {
    return {
      ok: true,
      storageWarning: `Image record deleted; storage cleanup failed: ${storageError}`,
    }
  }
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
