import { describe, it, expect } from 'vitest'
import { buildMembershipSignupAuthMetadata } from './membershipAuthMetadata'

describe('buildMembershipSignupAuthMetadata', () => {
  it('returns member role and form fields for Supabase auth metadata', () => {
    const m = buildMembershipSignupAuthMetadata({
      first_name: 'Amina',
      last_name: 'Omondi',
      phone: '7135550100',
      membership_type: 'family_household',
      interests: ['Events', 'Youth programs'],
      household_count: 3,
      preferred_communication: 'email',
    })
    expect(m.role).toBe('member')
    expect(m.full_name).toBe('Amina Omondi')
    expect(m.first_name).toBe('Amina')
    expect(m.last_name).toBe('Omondi')
    expect(m.membership_type).toBe('family_household')
    expect(m.interests).toEqual(['Events', 'Youth programs'])
    expect(m.household_count).toBe(3)
    expect(m.preferred_communication).toBe('email')
  })
})
