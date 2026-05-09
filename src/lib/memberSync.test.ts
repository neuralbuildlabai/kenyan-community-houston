import { describe, it, expect, vi } from 'vitest'
import { claimOrCreateMemberForAuthUser } from './memberSync'

describe('claimOrCreateMemberForAuthUser', () => {
  it('invokes the claim_or_create_member_for_auth_user RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: '00000000-0000-0000-0000-000000000001', error: null })
    const client = { rpc } as never
    const { error } = await claimOrCreateMemberForAuthUser(client)
    expect(error).toBeNull()
    expect(rpc).toHaveBeenCalledWith('claim_or_create_member_for_auth_user')
  })
})
