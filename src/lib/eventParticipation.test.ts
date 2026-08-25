import { describe, expect, it } from 'vitest'
import { BUSINESS_CATEGORIES, COMMUNITY_GROUP_CATEGORIES } from '@/lib/constants'
import { SUBMISSION_PURPOSE_OPTIONS, submissionPurposeBadge } from '@/lib/communityGroupSubmission'
import {
  PARTICIPATION_TYPES,
  UNPAID_PARTICIPATION_TYPE_IDS,
  acceptedParticipationTypesForEvent,
  acceptedUnpaidParticipationTypes,
  buildSignupRoleAndNote,
  customVolunteerRoleOptions,
  eventApplicationGate,
  eventApplicationReturnPath,
  isParticipationTypeToken,
  mergeParticipationTypesIntoRoleOptions,
  organizationDirectoryPath,
  organizationRegisterHref,
  organizationRegisterPath,
  participationTypeToken,
  publicParticipationOptionsForEvent,
  usesCommunityGroupDirectory,
} from '@/lib/eventParticipation'

const MONTH_NAME =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i

describe('event participation types', () => {
  it('has no month names in public labels, admin labels, or stored ids', () => {
    for (const t of PARTICIPATION_TYPES) {
      expect(t.id).not.toMatch(MONTH_NAME)
      expect(t.publicLabel).not.toMatch(MONTH_NAME)
      expect(t.adminLabel).not.toMatch(MONTH_NAME)
      expect(participationTypeToken(t.id)).not.toMatch(MONTH_NAME)
    }
  })

  it('does not mix unpaid applicants into the vendor payment flow', () => {
    for (const t of PARTICIPATION_TYPES) {
      if (
        t.id === 'individual_volunteer' ||
        t.id === 'speaker_panelist' ||
        t.id === 'support_group' ||
        t.id === 'community_nonprofit' ||
        t.id === 'business_professional' ||
        t.id === 'sponsor_partner'
      ) {
        expect(t.usesVendorPayment).toBe(false)
      }
    }
    expect(PARTICIPATION_TYPES.find((t) => t.id === 'vendor')?.usesVendorPayment).toBe(true)
  })

  it('keeps organization registration on the existing routes', () => {
    expect(organizationRegisterPath('business_professional')).toBe('/businesses/submit')
    expect(organizationRegisterPath('vendor')).toBe('/businesses/submit')
    expect(organizationRegisterPath('sponsor_partner')).toBe('/businesses/submit')
    expect(organizationRegisterPath('community_nonprofit')).toBe('/community-groups/submit')
    expect(organizationRegisterPath('support_group')).toBe('/community-groups/submit')
    expect(organizationDirectoryPath('business_professional')).toBe('/businesses')
    expect(organizationDirectoryPath('support_group')).toBe('/community-groups')
    expect(usesCommunityGroupDirectory('community_nonprofit')).toBe(true)
  })

  it('appends a safe event return path onto the existing registration route', () => {
    expect(organizationRegisterHref('business_professional', '/events/bereavement/volunteer')).toBe(
      '/businesses/submit?from=%2Fevents%2Fbereavement%2Fvolunteer'
    )
    expect(organizationRegisterHref('support_group', 'https://evil.example/phish')).toBe(
      '/community-groups/submit'
    )
    expect(eventApplicationReturnPath('/events/x/vendor')).toBe('/events/x/vendor')
    expect(eventApplicationReturnPath('https://example.com')).toBeNull()
  })
})

describe('eventApplicationGate', () => {
  it('requires a participation type', () => {
    const g = eventApplicationGate({ participationType: '', orgStatus: '', organizationName: '' })
    expect(g.canSubmit).toBe(false)
    expect(g.reason).toMatch(/how you would like to participate/i)
  })

  it('lets individual volunteers and speakers continue without directory registration', () => {
    for (const id of ['individual_volunteer', 'speaker_panelist'] as const) {
      const g = eventApplicationGate({ participationType: id, orgStatus: '', organizationName: '' })
      expect(g.canSubmit).toBe(true)
      expect(g.showOrgQuestion).toBe(false)
      expect(g.redirectToVendor).toBe(false)
    }
  })

  it('sends vendors to the paid vendor workflow instead of volunteer submit', () => {
    const g = eventApplicationGate({
      participationType: 'vendor',
      orgStatus: 'yes',
      organizationName: 'Acme Catering',
    })
    expect(g.canSubmit).toBe(false)
    expect(g.redirectToVendor).toBe(true)
  })

  it('on the vendor form, still requires directory registration and never bills speakers', () => {
    const unpaid = eventApplicationGate({
      participationType: 'speaker_panelist',
      orgStatus: '',
      organizationName: '',
      forVendorForm: true,
    })
    expect(unpaid.redirectToVendor).toBe(false)
    expect(unpaid.canSubmit).toBe(true)

    const vendorNo = eventApplicationGate({
      participationType: 'vendor',
      orgStatus: 'no',
      organizationName: '',
      forVendorForm: true,
    })
    expect(vendorNo.redirectToVendor).toBe(false)
    expect(vendorNo.canSubmit).toBe(false)
    expect(vendorNo.showRegisterPrompt).toBe(true)

    const vendorYes = eventApplicationGate({
      participationType: 'vendor',
      orgStatus: 'yes',
      organizationName: 'Acme Catering',
      forVendorForm: true,
    })
    expect(vendorYes.canSubmit).toBe(true)
    expect(vendorYes.redirectToVendor).toBe(false)
  })

  it('asks organization applicants whether they are already registered', () => {
    for (const id of [
      'business_professional',
      'community_nonprofit',
      'support_group',
      'sponsor_partner',
    ] as const) {
      const g = eventApplicationGate({ participationType: id, orgStatus: '', organizationName: '' })
      expect(g.showOrgQuestion).toBe(true)
      expect(g.canSubmit).toBe(false)
    }
  })

  it('Yes without an identified organization cannot submit', () => {
    const g = eventApplicationGate({
      participationType: 'business_professional',
      orgStatus: 'yes',
      organizationName: '',
    })
    expect(g.canSubmit).toBe(false)
    expect(g.showOrgLookup).toBe(true)
    expect(g.showRegisterPrompt).toBe(false)
  })

  it('Yes with an identified organization can submit', () => {
    const g = eventApplicationGate({
      participationType: 'business_professional',
      orgStatus: 'yes',
      organizationName: 'Hope Funeral Services',
    })
    expect(g.canSubmit).toBe(true)
    expect(g.showOrgLookup).toBe(true)
  })

  it('No blocks submit and shows the existing registration prompt', () => {
    const g = eventApplicationGate({
      participationType: 'support_group',
      orgStatus: 'no',
      organizationName: '',
    })
    expect(g.canSubmit).toBe(false)
    expect(g.showRegisterPrompt).toBe(true)
    expect(g.showOrgLookup).toBe(false)
  })

  it('I’m not sure offers lookup and registration, and continues after they identify an organization', () => {
    const unanswered = eventApplicationGate({
      participationType: 'community_nonprofit',
      orgStatus: 'not_sure',
      organizationName: '',
    })
    expect(unanswered.canSubmit).toBe(false)
    expect(unanswered.showOrgLookup).toBe(true)
    expect(unanswered.showRegisterPrompt).toBe(true)

    const identified = eventApplicationGate({
      participationType: 'community_nonprofit',
      orgStatus: 'not_sure',
      organizationName: 'Benevolence Circle',
    })
    expect(identified.canSubmit).toBe(true)
  })
})

describe('accepted participation types (existing event columns)', () => {
  it('shows no unpaid types when volunteer signup is off', () => {
    expect(
      acceptedUnpaidParticipationTypes({ volunteer_signup_enabled: false, volunteer_role_options: null })
    ).toEqual([])
  })

  it('defaults to every unpaid type for legacy events with volunteer signup on', () => {
    expect(
      acceptedUnpaidParticipationTypes({
        volunteer_signup_enabled: true,
        volunteer_role_options: ['Insurance Professional'],
      })
    ).toEqual(UNPAID_PARTICIPATION_TYPE_IDS)
  })

  it('filters public options to selected unpaid types plus vendor when vendor signup is on', () => {
    const options = publicParticipationOptionsForEvent({
      volunteer_signup_enabled: true,
      vendor_signup_enabled: true,
      volunteer_role_options: [
        participationTypeToken('speaker_panelist'),
        participationTypeToken('business_professional'),
        'Tax Preparer',
      ],
    })
    expect(options.map((o) => o.id)).toEqual([
      'speaker_panelist',
      'business_professional',
      'vendor',
    ])
  })

  it('does not add vendor unless vendor signup is enabled', () => {
    const ids = acceptedParticipationTypesForEvent({
      volunteer_signup_enabled: true,
      vendor_signup_enabled: false,
      volunteer_role_options: [participationTypeToken('individual_volunteer')],
    })
    expect(ids).toEqual(['individual_volunteer'])
  })

  it('merges participate tokens without dropping custom role options', () => {
    const merged = mergeParticipationTypesIntoRoleOptions(
      ['Insurance Professional', participationTypeToken('vendor')],
      ['speaker_panelist', 'vendor']
    )
    expect(merged).toEqual([participationTypeToken('speaker_panelist'), 'Insurance Professional'])
    expect(customVolunteerRoleOptions(merged)).toEqual(['Insurance Professional'])
    expect(isParticipationTypeToken(participationTypeToken('speaker_panelist'))).toBe(true)
    expect(isParticipationTypeToken('Insurance Professional')).toBe(false)
  })
})

describe('buildSignupRoleAndNote', () => {
  it('stores the reusable participation label, not an event month', () => {
    const { volunteer_role, availability_note } = buildSignupRoleAndNote({
      participationType: 'business_professional',
      volunteerRole: 'Legal / Immigration Professional',
      organizationName: 'Hope Funeral Services',
      note: 'Available for the panel',
    })
    expect(volunteer_role).toBe(
      'Business or professional representative — Legal / Immigration Professional'
    )
    expect(volunteer_role).not.toMatch(MONTH_NAME)
    expect(availability_note).toBe('Organization: Hope Funeral Services\nAvailable for the panel')
    expect(availability_note).not.toMatch(MONTH_NAME)
  })

  it('stays within volunteer_role and availability_note length limits', () => {
    const { volunteer_role, availability_note } = buildSignupRoleAndNote({
      participationType: 'community_nonprofit',
      volunteerRole: 'x'.repeat(200),
      organizationName: 'y'.repeat(400),
      note: 'z'.repeat(400),
    })
    expect((volunteer_role ?? '').length).toBeLessThanOrEqual(120)
    expect((availability_note ?? '').length).toBeLessThanOrEqual(500)
  })
})

describe('directory categories stay month-free', () => {
  it('extends business categories without month names or a second category system', () => {
    expect(BUSINESS_CATEGORIES).toContain('Legal Services')
    expect(BUSINESS_CATEGORIES).toContain('Bereavement and Benevolence Support')
    expect(BUSINESS_CATEGORIES).toContain('Youth Counseling and Support')
    expect(BUSINESS_CATEGORIES).toContain('Family Counseling')
    expect(BUSINESS_CATEGORIES).toContain('Insurance Services')
    expect(BUSINESS_CATEGORIES).toContain('Tax and Accounting Services')
    expect(BUSINESS_CATEGORIES).toContain('Other')
    for (const c of BUSINESS_CATEGORIES) {
      expect(c).not.toMatch(MONTH_NAME)
    }
  })

  it('reuses community-group categories that already cover nonprofits and benevolence', () => {
    const values = COMMUNITY_GROUP_CATEGORIES.map((c) => c.value)
    expect(values).toContain('benevolence_group')
    expect(values).toContain('nonprofit')
    expect(values).toContain('religious_institution')
    for (const c of COMMUNITY_GROUP_CATEGORIES) {
      expect(c.value).not.toMatch(MONTH_NAME)
      expect(c.label).not.toMatch(MONTH_NAME)
    }
  })

  it('does not show month names on community-group submission purpose labels', () => {
    for (const o of SUBMISSION_PURPOSE_OPTIONS) {
      expect(o.label).not.toMatch(MONTH_NAME)
    }
    expect(submissionPurposeBadge('update_existing_and_july_participation')).not.toMatch(MONTH_NAME)
  })
})
