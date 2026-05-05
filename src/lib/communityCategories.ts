/**
 * Unified, human-friendly categories for public event + announcement submissions.
 * Legacy string values in the DB are mapped to these buckets for display and filters.
 */
export const COMMUNITY_SUBMISSION_CATEGORIES = [
  'Cultural / Community',
  'Faith / Religious',
  'Sports & Youth',
  'Education / Career',
  'Business / Networking',
  'Health & Wellness',
  'Fundraiser / Support',
  'Family / Social',
  'Other',
] as const

export type CommunitySubmissionCategory = (typeof COMMUNITY_SUBMISSION_CATEGORIES)[number]

const CANONICAL_SET = new Set<string>(COMMUNITY_SUBMISSION_CATEGORIES as readonly string[])

/**
 * Maps historical `events.category` / `announcements.category` / filter labels
 * to a single canonical value for display, editing, and filters.
 */
const LEGACY_TO_CANONICAL: Record<string, CommunitySubmissionCategory> = {
  // Prior event submit list
  Cultural: 'Cultural / Community',
  Religious: 'Faith / Religious',
  Sports: 'Sports & Youth',
  Networking: 'Business / Networking',
  Education: 'Education / Career',
  'Music & Entertainment': 'Cultural / Community',
  'Food & Dining': 'Family / Social',
  'Community Meeting': 'Cultural / Community',
  Fundraiser: 'Fundraiser / Support',
  Youth: 'Sports & Youth',
  Family: 'Family / Social',
  'Health & Wellness': 'Health & Wellness',
  Other: 'Other',
  // Prior announcement list
  'Community News': 'Cultural / Community',
  'Government & Civic': 'Cultural / Community',
  'Health & Safety': 'Health & Wellness',
  'Events Notice': 'Cultural / Community',
  'Youth & Education': 'Education / Career',
  Memorial: 'Cultural / Community',
  Celebration: 'Family / Social',
  // Calendar filter / admin extras
  Community: 'Cultural / Community',
  Career: 'Education / Career',
  Volunteer: 'Cultural / Community',
  'Vendor/Business': 'Business / Networking',
  Meeting: 'Cultural / Community',
}

/** Normalize any stored category to the current canonical label. */
export function canonicalCategory(raw: string | null | undefined): CommunitySubmissionCategory {
  if (!raw?.trim()) return 'Other'
  const t = raw.trim()
  if (CANONICAL_SET.has(t)) return t as CommunitySubmissionCategory
  return LEGACY_TO_CANONICAL[t] ?? 'Other'
}

/** Public-facing label for badges and headings (stable for old + new rows). */
export function formatCategoryLabel(raw: string | null | undefined): string {
  return canonicalCategory(raw)
}

/** All raw DB values that should match a canonical filter bucket (for Supabase `.in()`). */
export function categoryValuesMatchingCanonical(selectedFilter: string): string[] {
  const canonical = canonicalCategory(selectedFilter)
  const out = new Set<string>([canonical])
  for (const [legacy, canon] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (canon === canonical) out.add(legacy)
  }
  return [...out]
}
