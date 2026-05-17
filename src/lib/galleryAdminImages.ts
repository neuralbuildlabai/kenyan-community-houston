import type { SupabaseClient } from '@supabase/supabase-js'
import { formatAdminActionError } from '@/lib/adminActionErrors'

/** Admin gallery row shape (includes submitter PII — never expose on public routes). */
export type AdminGalleryImageRow = {
  id: string
  album_id: string | null
  caption: string | null
  alt_text: string | null
  image_url: string | null
  thumbnail_url: string | null
  status: string
  created_at: string
  submission_storage_bucket: string | null
  submission_storage_path: string | null
  submission_thumb_path: string | null
  is_homepage_featured: boolean
  sort_order: number
  submitted_by_name: string | null
  submitted_by_email: string | null
}

export async function fetchAdminGalleryImages(
  supabase: SupabaseClient
): Promise<{ data: AdminGalleryImageRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_list_gallery_images')
  if (error) return { data: [], error: formatAdminActionError(error) }
  if (!Array.isArray(data)) return { data: [], error: null }
  return { data: data as AdminGalleryImageRow[], error: null }
}
