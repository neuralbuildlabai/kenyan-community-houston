import { describe, expect, it } from 'vitest'
import {
  buildProfilesSelfServicePatch,
  LOCATION_PROFESSION_VALIDATION_MESSAGE,
  normalizeLocationProfession,
} from './profilePayload'
import type { Profile } from './types'

describe('normalizeLocationProfession', () => {
  it('nulls professional_field_other when professional_field is not other', () => {
    const r = normalizeLocationProfession({
      general_location_area: 'houston',
      professional_field: 'nursing',
      professional_field_other: 'ignored',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.professional_field_other).toBeNull()
  })

  it('maps __none__ professional field to null and clears other text', () => {
    const r = normalizeLocationProfession({
      general_location_area: 'katy',
      professional_field: '__none__',
      professional_field_other: 'x',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.professional_field).toBeNull()
      expect(r.professional_field_other).toBeNull()
    }
  })

  it('rejects invalid general_location_area', () => {
    const r = normalizeLocationProfession({
      general_location_area: 'Houston',
      professional_field: null,
      professional_field_other: null,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(LOCATION_PROFESSION_VALIDATION_MESSAGE)
  })

  it('accepts valid general_location_area', () => {
    const r = normalizeLocationProfession({
      general_location_area: 'houston',
      professional_field: null,
      professional_field_other: null,
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.general_location_area).toBe('houston')
  })

  it('accepts professional_field="other" as a stand-alone value (migration 044)', () => {
    // The follow-up free-text description is no longer collected. "Other"
    // is valid by itself, and any inbound value for professional_field_other
    // is normalised to null before reaching the database.
    const r = normalizeLocationProfession({
      general_location_area: 'sugar_land',
      professional_field: 'other',
      professional_field_other: null,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.professional_field).toBe('other')
      expect(r.professional_field_other).toBeNull()
    }
  })

  it('discards any legacy professional_field_other value passed alongside "other"', () => {
    const r = normalizeLocationProfession({
      general_location_area: 'houston',
      professional_field: 'other',
      professional_field_other: 'Custom role text the UI no longer collects',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.professional_field_other).toBeNull()
  })

  it('rejects invalid professional_field slug', () => {
    const r = normalizeLocationProfession({
      general_location_area: 'houston',
      professional_field: 'nurse',
      professional_field_other: null,
    })
    expect(r.ok).toBe(false)
  })
})

describe('buildProfilesSelfServicePatch', () => {
  it('converts empty optional strings to null and normalizes phone', () => {
    const r = buildProfilesSelfServicePatch({
      general_location_area: 'cypress',
      professional_field: null,
      professional_field_other: null,
      full_name: '  ',
      preferred_name: '',
      phone: '+1 (713) 555-0100',
      bio: '',
      interests: [],
      volunteer_interests: [],
      profile_visibility: 'private',
    } as Partial<Profile>)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.patch.full_name).toBeNull()
      expect(r.patch.preferred_name).toBeNull()
      expect(r.patch.phone).toBe('+17135550100')
      expect(r.patch.phone).toMatch(/^\+?[0-9]{7,15}$/)
      expect(r.patch.bio).toBeNull()
    }
  })

  it('rejects profile phone with letters', () => {
    const r = buildProfilesSelfServicePatch({
      general_location_area: 'cypress',
      professional_field: null,
      phone: 'abc7135550100',
      interests: [],
      volunteer_interests: [],
      profile_visibility: 'private',
    } as Partial<Profile>)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.kind).toBe('phone')
  })

  it('dedupes and trims interests', () => {
    const r = buildProfilesSelfServicePatch({
      general_location_area: 'pearland',
      professional_field: null,
      phone: '+17135550101',
      interests: [' A ', 'A', 'B'],
      volunteer_interests: [],
      profile_visibility: 'private',
    } as Partial<Profile>)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.patch.interests).toEqual(['A', 'B'])
  })
})
