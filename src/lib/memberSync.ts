import type { SupabaseClient } from '@supabase/supabase-js'

/** Idempotent DB sync: links/creates `public.members` for the current session user. */
export async function claimOrCreateMemberForAuthUser(client: SupabaseClient): Promise<{ error: Error | null }> {
  const { error } = await client.rpc('claim_or_create_member_for_auth_user')
  return { error: error as Error | null }
}
