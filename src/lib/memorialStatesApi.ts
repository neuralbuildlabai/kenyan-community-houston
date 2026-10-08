/**
 * Reads and writes for `public.memorial_states` (migration 084).
 *
 * Mirrors `leadershipApi` — a static registry in code, overlaid by the
 * database, with a fallback that keeps the page whole when the overlay is
 * unavailable. Here the fallback is an empty status map, which every reader
 * resolves to "active": a failed lookup shows all memorials rather than
 * hiding any.
 */
import { supabase } from '@/lib/supabase'
import {
  memorialStatePatch,
  memorialStatusMap,
  type MemorialLifecycleStatus,
  type MemorialStateRow,
  type MemorialStatusMap,
} from '@/lib/memorialLifecycle'

export async function fetchMemorialStatuses(): Promise<{
  statuses: MemorialStatusMap
  source: 'db' | 'fallback'
}> {
  const { data, error } = await supabase.from('memorial_states').select('slug, status')
  if (error || !data) return { statuses: {}, source: 'fallback' }
  return { statuses: memorialStatusMap(data as MemorialStateRow[]), source: 'db' }
}

/** Admin view also needs who archived a memorial and when. */
export async function fetchMemorialStateRows(): Promise<MemorialStateRow[]> {
  const { data, error } = await supabase
    .from('memorial_states')
    .select('slug, status, archived_at')
  if (error) throw error
  return (data ?? []) as MemorialStateRow[]
}

export async function setMemorialStatus({
  slug,
  status,
  adminId,
}: {
  slug: string
  status: MemorialLifecycleStatus
  adminId?: string | null
}): Promise<void> {
  const { error } = await supabase
    .from('memorial_states')
    .upsert(memorialStatePatch({ slug, status, adminId }), { onConflict: 'slug' })
  if (error) throw error
}
