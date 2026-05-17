import type { Profile } from '@/lib/types'
import { validatePhoneNumber } from '@/lib/phoneValidation'
import {
  isAllowedGeneralLocationArea,
  isAllowedProfessionalField,
} from '@/lib/memberDemographics'

export const LOCATION_PROFESSION_VALIDATION_MESSAGE =
  'Please choose a valid general location and professional field.'

export const GENERIC_PROFILE_SAVE_FAILURE =
  'We could not save your profile. Please check the highlighted fields and try again.'

export type LocationProfessionNormalizeResult =
  | {
      ok: true
      general_location_area: string
      professional_field: string | null
      professional_field_other: string | null
    }
  | { ok: false; kind: 'location' | 'profession'; message: string }

/**
 * Shared rules for `profiles` / `members` location + profession columns
 * (migrations 031 + 044). The `professional_field_other` parameter is
 * retained for back-compat but is always normalised to `null` — we no
 * longer collect or store a free-text description for "Other".
 */
export function normalizeLocationProfession(input: {
  general_location_area: string | null | undefined
  professional_field: string | null | undefined
  professional_field_other?: string | null | undefined
}): LocationProfessionNormalizeResult {
  const gla = (input.general_location_area ?? '').toString().trim()
  if (!gla || !isAllowedGeneralLocationArea(gla)) {
    return { ok: false, kind: 'location', message: LOCATION_PROFESSION_VALIDATION_MESSAGE }
  }

  const rawPf = (input.professional_field ?? '').toString().trim()
  const pf = rawPf === '' || rawPf === '__none__' ? null : rawPf
  if (pf !== null && !isAllowedProfessionalField(pf)) {
    return { ok: false, kind: 'profession', message: LOCATION_PROFESSION_VALIDATION_MESSAGE }
  }

  return { ok: true, general_location_area: gla, professional_field: pf, professional_field_other: null }
}

/** Columns a member may PATCH on `public.profiles` (self-service). Omits id, role, email, timestamps, avatar columns. */
export type ProfilesSelfServicePatch = {
  full_name: string | null
  preferred_name: string | null
  phone: string | null
  bio: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  county_or_heritage: string | null
  preferred_communication: string | null
  occupation: string | null
  business_or_profession: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  interests: string[]
  willing_to_volunteer: boolean
  willing_to_serve: boolean
  volunteer_interests: string[]
  service_notes: string | null
  profile_visibility: Profile['profile_visibility']
  general_location_area: string
  professional_field: string | null
  professional_field_other: string | null
}

export type ProfilePayloadResult =
  | { ok: true; patch: ProfilesSelfServicePatch }
  | { ok: false; kind: 'location' | 'profession' | 'phone'; message: string }

function toNullIfEmpty(s: string | null | undefined): string | null {
  const t = (s ?? '').trim()
  return t === '' ? null : t
}

/** Build a PostgREST-safe `profiles` update body from profile form state. */
export function buildProfilesSelfServicePatch(row: Partial<Profile>): ProfilePayloadResult {
  const loc = normalizeLocationProfession({
    general_location_area: row.general_location_area,
    professional_field: row.professional_field as string | undefined,
    professional_field_other: row.professional_field_other,
  })
  if (!loc.ok) {
    return { ok: false, kind: loc.kind, message: loc.message }
  }

  const phoneV = validatePhoneNumber(String(row.phone ?? ''))
  if (!phoneV.ok) {
    return { ok: false, kind: 'phone', message: phoneV.reason }
  }
  const emV = validatePhoneNumber(String(row.emergency_contact_phone ?? ''), { allowEmpty: true })
  if (!emV.ok) {
    return { ok: false, kind: 'phone', message: emV.reason }
  }

  const interests = [...new Set((row.interests ?? []).map((x) => String(x).trim()).filter(Boolean))]
  const volunteerInterests = [...new Set((row.volunteer_interests ?? []).map((x) => String(x).trim()).filter(Boolean))]

  const patch: ProfilesSelfServicePatch = {
    full_name: toNullIfEmpty(row.full_name ?? undefined),
    preferred_name: toNullIfEmpty(row.preferred_name ?? undefined),
    phone: phoneV.value,
    bio: toNullIfEmpty(row.bio ?? undefined),
    city: toNullIfEmpty(row.city ?? undefined),
    state: toNullIfEmpty(row.state ?? undefined),
    zip_code: toNullIfEmpty(row.zip_code ?? undefined),
    county_or_heritage: toNullIfEmpty(row.county_or_heritage ?? undefined),
    preferred_communication: toNullIfEmpty(row.preferred_communication ?? undefined),
    occupation: toNullIfEmpty(row.occupation ?? undefined),
    business_or_profession: toNullIfEmpty(row.business_or_profession ?? undefined),
    emergency_contact_name: toNullIfEmpty(row.emergency_contact_name ?? undefined),
    emergency_contact_phone: emV.value,
    interests,
    willing_to_volunteer: !!row.willing_to_volunteer,
    willing_to_serve: !!row.willing_to_serve,
    volunteer_interests: volunteerInterests,
    service_notes: toNullIfEmpty(row.service_notes ?? undefined),
    profile_visibility: (row.profile_visibility ?? 'private') as Profile['profile_visibility'],
    general_location_area: loc.general_location_area,
    professional_field: loc.professional_field,
    professional_field_other: loc.professional_field_other,
  }

  return { ok: true, patch }
}

export function logSupabaseErrorDebug(
  context: string,
  err: { code?: string; message?: string; details?: string | null; hint?: string | null }
) {
  const enabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG_SUPABASE_ERRORS === 'true'
  if (!enabled) return
  console.warn(`[supabase:${context}]`, {
    code: err.code,
    message: err.message,
    details: err.details,
    hint: err.hint,
  })
}

export function classifyProfileSaveSupabaseError(err: {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}): 'location_profession' | 'generic' {
  const parts = [err.code, err.message, err.details, err.hint].filter(Boolean).join(' ').toLowerCase()
  if (
    parts.includes('23514') ||
    parts.includes('check constraint') ||
    parts.includes('general_location') ||
    parts.includes('professional_field') ||
    parts.includes('kigh_is_valid') ||
    parts.includes('kigh_professional') ||
    parts.includes('profiles_general') ||
    parts.includes('profiles_professional') ||
    parts.includes('members_general') ||
    parts.includes('members_professional')
  ) {
    return 'location_profession'
  }
  return 'generic'
}
