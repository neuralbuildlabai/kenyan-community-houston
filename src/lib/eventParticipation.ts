import { supabase } from '@/lib/supabase'
import { sanitizeNextParam } from '@/lib/authRedirect'
import type { Event } from '@/lib/types'
import { vendorSignupPath } from '@/lib/eventVendorSignup'

/**
 * Reusable event participation types. These describe how an applicant
 * wants to take part — not the event topic, month, or organization
 * category. Do not attach month names.
 */
export const PARTICIPATION_TYPE_IDS = [
  'individual_volunteer',
  'speaker_panelist',
  'business_professional',
  'community_nonprofit',
  'support_group',
  'vendor',
  'sponsor_partner',
] as const

export type ParticipationTypeId = (typeof PARTICIPATION_TYPE_IDS)[number]

/** Stored in `events.volunteer_role_options` so admin selection needs no new column. */
export const PARTICIPATION_TYPE_TOKEN_PREFIX = 'participate:'

export type OrgRegistrationStatus = 'yes' | 'no' | 'not_sure'

export type DirectoryMatch = {
  id: string
  name: string
  category: string
  kind: 'business' | 'community_group'
  slug: string
}

export const PARTICIPATION_TYPES: {
  id: ParticipationTypeId
  publicLabel: string
  adminLabel: string
  requiresOrganization: boolean
  usesVendorPayment: boolean
}[] = [
  {
    id: 'individual_volunteer',
    publicLabel: 'Individual volunteer',
    adminLabel: 'Individual volunteers',
    requiresOrganization: false,
    usesVendorPayment: false,
  },
  {
    id: 'speaker_panelist',
    publicLabel: 'Speaker or panelist',
    adminLabel: 'Speakers or panelists',
    requiresOrganization: false,
    usesVendorPayment: false,
  },
  {
    id: 'business_professional',
    publicLabel: 'Business or professional representative',
    adminLabel: 'Businesses and professionals',
    requiresOrganization: true,
    usesVendorPayment: false,
  },
  {
    id: 'community_nonprofit',
    publicLabel: 'Community or nonprofit organization',
    adminLabel: 'Community or nonprofit organizations',
    requiresOrganization: true,
    usesVendorPayment: false,
  },
  {
    id: 'support_group',
    publicLabel: 'Support group',
    adminLabel: 'Support groups',
    requiresOrganization: true,
    usesVendorPayment: false,
  },
  {
    id: 'vendor',
    publicLabel: 'Vendor',
    adminLabel: 'Vendors',
    requiresOrganization: true,
    usesVendorPayment: true,
  },
  {
    id: 'sponsor_partner',
    publicLabel: 'Sponsor or partner',
    adminLabel: 'Sponsors or partners',
    requiresOrganization: true,
    usesVendorPayment: false,
  },
]

export const UNPAID_PARTICIPATION_TYPE_IDS: ParticipationTypeId[] = PARTICIPATION_TYPES.filter(
  (t) => !t.usesVendorPayment
).map((t) => t.id)

export const ORG_REGISTRATION_STATUS_OPTIONS: { value: OrgRegistrationStatus; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'I’m not sure' },
]

export const ORGANIZATION_REGISTER_COPY =
  'Businesses, professional practices, nonprofits, support groups and community organizations participating in KIGH events should be registered with KIGH. Register your organization first, then return to complete this event application.'

export function participationTypeById(
  id: string | null | undefined
): (typeof PARTICIPATION_TYPES)[number] | undefined {
  return PARTICIPATION_TYPES.find((t) => t.id === id)
}

export function participationTypeToken(id: ParticipationTypeId): string {
  return `${PARTICIPATION_TYPE_TOKEN_PREFIX}${id}`
}

export function isParticipationTypeToken(value: string | null | undefined): boolean {
  const t = (value ?? '').trim()
  if (!t.startsWith(PARTICIPATION_TYPE_TOKEN_PREFIX)) return false
  const id = t.slice(PARTICIPATION_TYPE_TOKEN_PREFIX.length)
  return PARTICIPATION_TYPE_IDS.includes(id as ParticipationTypeId)
}

export function customVolunteerRoleOptions(
  roleOptions: string[] | null | undefined
): string[] {
  return (roleOptions ?? [])
    .map((r) => (r ?? '').trim())
    .filter((r) => r.length >= 2 && r.length <= 120 && !isParticipationTypeToken(r))
}

export function storedUnpaidParticipationTypes(
  roleOptions: string[] | null | undefined
): ParticipationTypeId[] {
  const found: ParticipationTypeId[] = []
  for (const raw of roleOptions ?? []) {
    const t = (raw ?? '').trim()
    if (!isParticipationTypeToken(t)) continue
    const id = t.slice(PARTICIPATION_TYPE_TOKEN_PREFIX.length) as ParticipationTypeId
    if (id === 'vendor') continue
    if (!found.includes(id)) found.push(id)
  }
  return found
}

/**
 * Unpaid types accepted for an event.
 * Legacy events (volunteer signup on, no participate: tokens) accept every unpaid type.
 */
export function acceptedUnpaidParticipationTypes(
  event: Pick<Event, 'volunteer_signup_enabled' | 'volunteer_role_options'> | null | undefined
): ParticipationTypeId[] {
  if (!event?.volunteer_signup_enabled) return []
  const stored = storedUnpaidParticipationTypes(event.volunteer_role_options)
  return stored.length > 0 ? stored : [...UNPAID_PARTICIPATION_TYPE_IDS]
}

export function acceptedParticipationTypesForEvent(
  event: Pick<Event, 'volunteer_signup_enabled' | 'volunteer_role_options' | 'vendor_signup_enabled'> | null | undefined
): ParticipationTypeId[] {
  const unpaid = acceptedUnpaidParticipationTypes(event)
  if (event?.vendor_signup_enabled && !unpaid.includes('vendor')) {
    return [...unpaid, 'vendor']
  }
  return unpaid
}

export function publicParticipationOptionsForEvent(
  event: Pick<Event, 'volunteer_signup_enabled' | 'volunteer_role_options' | 'vendor_signup_enabled'> | null | undefined
): (typeof PARTICIPATION_TYPES)[number][] {
  const ids = acceptedParticipationTypesForEvent(event)
  return PARTICIPATION_TYPES.filter((t) => ids.includes(t.id))
}

export function mergeParticipationTypesIntoRoleOptions(
  customRoles: string[] | null | undefined,
  unpaidTypes: ParticipationTypeId[]
): string[] | null {
  const roles = customVolunteerRoleOptions(customRoles)
  const tokens = unpaidTypes
    .filter((id) => id !== 'vendor')
    .map(participationTypeToken)
  const merged = [...tokens, ...roles].slice(0, 30)
  return merged.length > 0 ? merged : null
}

export function usesCommunityGroupDirectory(type: ParticipationTypeId): boolean {
  return type === 'community_nonprofit' || type === 'support_group'
}

export function organizationRegisterPath(type: ParticipationTypeId): string {
  return usesCommunityGroupDirectory(type) ? '/community-groups/submit' : '/businesses/submit'
}

export function organizationDirectoryPath(type: ParticipationTypeId): string {
  return usesCommunityGroupDirectory(type) ? '/community-groups' : '/businesses'
}

export function eventApplicationReturnPath(raw: string | null | undefined): string | null {
  const safe = sanitizeNextParam(raw)
  if (!safe) return null
  if (!safe.startsWith('/events/')) return null
  return safe
}

export function organizationRegisterHref(type: ParticipationTypeId, returnPath: string): string {
  const path = organizationRegisterPath(type)
  const ret = eventApplicationReturnPath(returnPath)
  if (!ret) return path
  return `${path}?from=${encodeURIComponent(ret)}`
}

export function vendorSignupHref(eventSlug: string): string {
  return vendorSignupPath(eventSlug)
}

export type ApplicationGate = {
  canSubmit: boolean
  showOrgQuestion: boolean
  showOrgLookup: boolean
  showRegisterPrompt: boolean
  redirectToVendor: boolean
  reason: string | null
}

export function eventApplicationGate(input: {
  participationType: ParticipationTypeId | ''
  orgStatus: OrgRegistrationStatus | ''
  organizationName: string
  /** When true, vendor stays on the paid vendor form instead of redirecting. */
  forVendorForm?: boolean
}): ApplicationGate {
  const type = participationTypeById(input.participationType)
  if (!type) {
    return {
      canSubmit: false,
      showOrgQuestion: false,
      showOrgLookup: false,
      showRegisterPrompt: false,
      redirectToVendor: false,
      reason: 'Please choose how you would like to participate.',
    }
  }
  if (type.usesVendorPayment && !input.forVendorForm) {
    return {
      canSubmit: false,
      showOrgQuestion: false,
      showOrgLookup: false,
      showRegisterPrompt: false,
      redirectToVendor: true,
      reason: null,
    }
  }
  if (!type.requiresOrganization) {
    return {
      canSubmit: true,
      showOrgQuestion: false,
      showOrgLookup: false,
      showRegisterPrompt: false,
      redirectToVendor: false,
      reason: null,
    }
  }

  const name = input.organizationName.trim()
  const status = input.orgStatus

  if (!status) {
    return {
      canSubmit: false,
      showOrgQuestion: true,
      showOrgLookup: false,
      showRegisterPrompt: false,
      redirectToVendor: false,
      reason: 'Please tell us whether your business or organization is already registered with KIGH.',
    }
  }

  if (status === 'no') {
    return {
      canSubmit: false,
      showOrgQuestion: true,
      showOrgLookup: false,
      showRegisterPrompt: true,
      redirectToVendor: false,
      reason: 'Register your organization first, then return to complete this event application.',
    }
  }

  if (status === 'yes') {
    return {
      canSubmit: name.length >= 2,
      showOrgQuestion: true,
      showOrgLookup: true,
      showRegisterPrompt: false,
      redirectToVendor: false,
      reason: name.length >= 2 ? null : 'Please identify your registered business or organization.',
    }
  }

  // not_sure — lookup or register; continue only once they identify an organization
  return {
    canSubmit: name.length >= 2,
    showOrgQuestion: true,
    showOrgLookup: true,
    showRegisterPrompt: true,
    redirectToVendor: false,
    reason:
      name.length >= 2
        ? null
        : 'Search the directory to confirm your listing, or register your organization first.',
  }
}

const ROLE_MAX = 120
const NOTE_MAX = 500

export function buildSignupRoleAndNote(input: {
  participationType: ParticipationTypeId
  volunteerRole: string | null | undefined
  organizationName: string | null | undefined
  note: string | null | undefined
}): { volunteer_role: string | null; availability_note: string | null } {
  const type = participationTypeById(input.participationType)
  const label = type?.publicLabel ?? ''
  const role = (input.volunteerRole ?? '').trim()
  let volunteer_role: string | null = null
  if (label && role) {
    const combined = `${label} — ${role}`
    volunteer_role = (combined.length <= ROLE_MAX ? combined : label).slice(0, ROLE_MAX)
  } else if (label) {
    volunteer_role = label.slice(0, ROLE_MAX)
  } else if (role) {
    volunteer_role = role.slice(0, ROLE_MAX)
  }

  const parts: string[] = []
  const org = (input.organizationName ?? '').trim()
  if (org) parts.push(`Organization: ${org}`)
  const note = (input.note ?? '').trim()
  if (note) parts.push(note)
  const availability_note = parts.length > 0 ? parts.join('\n').slice(0, NOTE_MAX) : null

  return { volunteer_role, availability_note }
}

export async function searchRegisteredOrganizations(query: string): Promise<DirectoryMatch[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const [biz, groups] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, category, slug')
      .eq('status', 'published')
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(8),
    supabase.rpc('list_public_community_groups', {
      p_category: null,
      p_search: q,
    }),
  ])

  const matches: DirectoryMatch[] = []
  for (const row of biz.data ?? []) {
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    if (!name) continue
    matches.push({
      id: String(row.id),
      name,
      category: typeof row.category === 'string' ? row.category : '',
      kind: 'business',
      slug: typeof row.slug === 'string' ? row.slug : '',
    })
  }
  for (const row of (groups.data as { id?: string; organization_name?: string; category?: string; slug?: string }[] | null) ?? []) {
    const name = (row.organization_name ?? '').trim()
    if (!name) continue
    matches.push({
      id: String(row.id ?? name),
      name,
      category: row.category ?? '',
      kind: 'community_group',
      slug: row.slug ?? '',
    })
  }
  return matches.slice(0, 12)
}
