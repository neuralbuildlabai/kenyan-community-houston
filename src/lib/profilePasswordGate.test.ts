import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { requiresProfilePasswordRefresh } from '@/lib/profilePasswordGate'

function userWithIdentities(identities: { provider: string }[]): User {
  return { identities } as unknown as User
}

function baseProfile(over: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    email: 'a@b.com',
    full_name: 'T',
    avatar_url: null,
    role: 'member',
    phone: null,
    bio: null,
    created_at: '',
    updated_at: '',
    ...over,
  } as Profile
}

describe('requiresProfilePasswordRefresh', () => {
  it('is false when no email identity (OAuth-only)', () => {
    const u = userWithIdentities([{ provider: 'google' }])
    const p = baseProfile({
      force_password_change: true,
      password_changed_at: undefined,
    })
    expect(requiresProfilePasswordRefresh(p, u)).toBe(false)
  })

  it('is true when force_password_change', () => {
    const u = userWithIdentities([{ provider: 'email' }])
    const p = baseProfile({
      force_password_change: true,
      password_changed_at: new Date().toISOString(),
      password_expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
    expect(requiresProfilePasswordRefresh(p, u)).toBe(true)
  })

  it('is true when password_expires_at is in the past', () => {
    const u = userWithIdentities([{ provider: 'email' }])
    const p = baseProfile({
      force_password_change: false,
      password_changed_at: '2020-01-01T00:00:00Z',
      password_expires_at: '2020-06-01T00:00:00Z',
    })
    expect(requiresProfilePasswordRefresh(p, u, new Date('2026-01-01T00:00:00Z'))).toBe(true)
  })

  it('is false when password_expires_at is in the future', () => {
    const u = userWithIdentities([{ provider: 'email' }])
    const p = baseProfile({
      password_changed_at: '2026-01-01T00:00:00Z',
      password_expires_at: '2027-01-01T00:00:00Z',
    })
    expect(requiresProfilePasswordRefresh(p, u, new Date('2026-06-01T00:00:00Z'))).toBe(false)
  })

  it('is true when password_changed_at is missing and no expires_at', () => {
    const u = userWithIdentities([{ provider: 'email' }])
    const p = baseProfile({
      password_changed_at: undefined,
      password_expires_at: undefined,
    })
    expect(requiresProfilePasswordRefresh(p, u)).toBe(true)
  })
})
