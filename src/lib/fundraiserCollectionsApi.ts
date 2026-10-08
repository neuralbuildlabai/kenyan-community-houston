/**
 * Admin reads and writes for the collection ledger (migration 085).
 *
 * Reads go through `kigh_admin_fundraiser_collections` because `donor_name`
 * and `private_note` are not granted to any client role — the function
 * checks `kigh_is_elevated_admin()` itself, so authorisation is decided by
 * the database rather than by whether this module got called from an
 * admin page.
 *
 * Writes go straight to the table and are gated by the admin RLS policy.
 * Triggers there stamp the acting admin, recompute the fundraiser total,
 * and append to `audit_logs`; nothing in this file is trusted to do any of
 * that correctly.
 */
import { supabase } from '@/lib/supabase'
import { buildCollectionPayload, type AdminCollectionRow, type CollectionDraft } from '@/lib/fundraiserCollections'

export async function fetchAdminCollections(fundraiserId: string): Promise<AdminCollectionRow[]> {
  const { data, error } = await supabase.rpc('kigh_admin_fundraiser_collections', {
    p_fundraiser_id: fundraiserId,
  })
  if (error) throw error
  return (data ?? []) as AdminCollectionRow[]
}

export async function createCollection(
  fundraiserId: string,
  draft: CollectionDraft
): Promise<void> {
  const { error } = await supabase
    .from('fundraiser_collections')
    .insert([buildCollectionPayload(fundraiserId, draft)])
  if (error) throw error
}

export async function updateCollection(
  id: string,
  fundraiserId: string,
  draft: CollectionDraft
): Promise<void> {
  // fundraiser_id is re-sent so the payload shape matches a create; the row
  // stays on the same fundraiser either way.
  const { error } = await supabase
    .from('fundraiser_collections')
    .update(buildCollectionPayload(fundraiserId, draft))
    .eq('id', id)
  if (error) throw error
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await supabase.from('fundraiser_collections').delete().eq('id', id)
  if (error) throw error
}
