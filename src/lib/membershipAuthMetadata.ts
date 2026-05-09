export type MembershipTypeForSignup = 'individual' | 'family_household' | 'associate'

export type MembershipSignupAuthMetadata = {
  full_name: string
  first_name: string
  last_name: string
  phone: string
  membership_type: MembershipTypeForSignup
  interests: string[]
  household_count: number
  preferred_communication: string
  /** Stored for ops visibility only; profiles.role is guarded separately in DB. */
  role: 'member'
}

export function buildMembershipSignupAuthMetadata(args: {
  first_name: string
  last_name: string
  phone: string
  membership_type: MembershipTypeForSignup
  interests: string[]
  household_count: number
  preferred_communication: string
}): MembershipSignupAuthMetadata {
  const first = args.first_name.trim()
  const last = args.last_name.trim()
  return {
    full_name: `${first} ${last}`.trim(),
    first_name: first,
    last_name: last,
    phone: args.phone.trim(),
    membership_type: args.membership_type,
    interests: [...args.interests],
    household_count: args.household_count,
    preferred_communication: args.preferred_communication.trim(),
    role: 'member',
  }
}
