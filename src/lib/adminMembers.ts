import type { SupabaseClient } from '@supabase/supabase-js'
import type { DuesStatus, MembershipRecordStatus } from '@/lib/types'
import { formatAdminActionError } from '@/lib/adminActionErrors'

export type AdminMemberStatusPatch = {
  membership_status?: MembershipRecordStatus
  dues_status?: DuesStatus
  good_standing?: boolean
}

export type AdminMemberStatusResult =
  | { ok: true; member: Record<string, unknown> }
  | { ok: false; error: string }

export async function adminUpdateMemberStatus(
  supabase: SupabaseClient,
  memberId: string,
  patch: AdminMemberStatusPatch
): Promise<AdminMemberStatusResult> {
  const { data, error } = await supabase.rpc('admin_update_member_status', {
    p_member_id: memberId,
    p_membership_status: patch.membership_status ?? null,
    p_dues_status: patch.dues_status ?? null,
    p_good_standing: patch.good_standing ?? null,
  })

  if (error) return { ok: false, error: formatAdminActionError(error) }
  return { ok: true, member: (data as Record<string, unknown>) ?? {} }
}
