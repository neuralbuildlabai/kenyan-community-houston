/** Submission purpose — organization record is always required; event participation is optional add-on. */
export type CommunityGroupSubmissionPurpose =
  | 'directory_listing'
  | 'directory_and_july_participation'
  | 'update_existing'
  | 'update_existing_and_july_participation'

export type BestContactMethod = 'phone' | 'text_whatsapp' | 'email'

export type JulyInterest = 'yes' | 'maybe' | 'no_keep_informed'

export type JulyIntroInterest = 'yes' | 'no' | 'maybe'

export const SUBMISSION_PURPOSE_OPTIONS: {
  value: CommunityGroupSubmissionPurpose
  label: string
}[] = [
  {
    value: 'directory_listing',
    label: 'Add our organization to the community directory',
  },
  {
    value: 'directory_and_july_participation',
    label: 'Add our organization and participate in a community event',
  },
  {
    value: 'update_existing',
    label: 'Update an existing organization listing',
  },
  {
    value: 'update_existing_and_july_participation',
    label: 'Update our organization listing and participate in a community event',
  },
]

export const BEST_CONTACT_METHOD_OPTIONS: { value: BestContactMethod; label: string }[] = [
  { value: 'phone', label: 'Phone call' },
  { value: 'text_whatsapp', label: 'Text / WhatsApp' },
  { value: 'email', label: 'Email' },
]

export const JULY_INTEREST_OPTIONS: { value: JulyInterest; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no_keep_informed', label: 'No, but keep us informed' },
]

export const JULY_INTRO_OPTIONS: { value: JulyIntroInterest; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'maybe', label: 'Maybe' },
]

export function submissionPurposeIncludesJuly(
  purpose: CommunityGroupSubmissionPurpose | ''
): boolean {
  return (
    purpose === 'directory_and_july_participation' ||
    purpose === 'update_existing_and_july_participation'
  )
}

export function submissionPurposeLabel(purpose: string | null | undefined): string {
  return SUBMISSION_PURPOSE_OPTIONS.find((o) => o.value === purpose)?.label ?? purpose ?? '—'
}

export function submissionPurposeBadge(purpose: string | null | undefined): string {
  switch (purpose) {
    case 'directory_listing':
      return 'Directory Listing'
    case 'directory_and_july_participation':
      return 'Directory + Event'
    case 'update_existing':
      return 'Update Existing'
    case 'update_existing_and_july_participation':
      return 'Update + Event'
    default:
      return 'Directory Listing'
  }
}

export function bestContactMethodLabel(method: string | null | undefined): string {
  return BEST_CONTACT_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method ?? '—'
}

export function julyInterestLabel(interest: string | null | undefined): string {
  return JULY_INTEREST_OPTIONS.find((o) => o.value === interest)?.label ?? interest ?? '—'
}

export const COMMUNITY_SUBMIT_BG = '/images/community/commsignup.png'
