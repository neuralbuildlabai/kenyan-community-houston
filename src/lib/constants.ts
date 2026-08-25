import {
  COMMUNITY_SUBMISSION_CATEGORIES,
  canonicalCategory,
  formatCategoryLabel,
  categoryValuesMatchingCanonical,
} from './communityCategories'
import type { FeedPostType } from './types'

export { COMMUNITY_SUBMISSION_CATEGORIES, canonicalCategory, formatCategoryLabel, categoryValuesMatchingCanonical }

export const APP_NAME = 'Kenyans in Greater Houston'
/** Standard nonprofit credibility line for footer, hero, and key public surfaces. */
export const KIGH_NONPROFIT_CREDIBILITY_STATEMENT =
  'Kenyans in Greater Houston is a registered 501(c)(3) nonprofit organization serving Kenyans and friends of Kenya across the Houston area.'
export const APP_TAGLINE = 'Your trusted home away from home in Houston, Texas.'
export const APP_DESCRIPTION =
  'The trusted digital hub for Kenyans in Houston and surrounding areas. Discover events, businesses, community news, and more.'

/** Primary public inbox; set `VITE_CONTACT_EMAIL` per deployment.
 *  The fallback is the Gmail inbox the team actively monitors. Once
 *  MX/forwarding is configured for kenyansingreaterhouston.org, the
 *  deployment env var should be set to `info@kenyansingreaterhouston.org`
 *  and forwarding will land mail in the same Gmail inbox. */
export const PUBLIC_CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() ||
  'kenyansinhouston@gmail.com'

/** @deprecated prefer COMMUNITY_SUBMISSION_CATEGORIES — same reference */
export const EVENT_CATEGORIES = COMMUNITY_SUBMISSION_CATEGORIES

/** Public calendar + admin event category pickers (aligned with submissions). */
export const CALENDAR_FILTER_CATEGORIES = COMMUNITY_SUBMISSION_CATEGORIES

/** @deprecated prefer COMMUNITY_SUBMISSION_CATEGORIES — same reference */
export const ANNOUNCEMENT_CATEGORIES = COMMUNITY_SUBMISSION_CATEGORIES

export const MEMBERSHIP_INTEREST_OPTIONS = [
  'Events',
  'Culture',
  'Youth programs',
  'Sports',
  'Welfare / community support',
  'Business networking',
  'Education & career development',
  'Volunteering',
  'Newcomer support',
] as const

/** DB `community_groups.category` values (non-commercial directory). */
export const COMMUNITY_GROUP_CATEGORY_VALUES = [
  'religious_institution',
  'welfare_group',
  'cultural_organization',
  'youth_family_group',
  'women_group',
  'mens_group',
  'professional_networking_group',
  'alumni_group',
  'nonprofit',
  'community_institution',
  'sports_recreation_group',
  'benevolence_group',
  'other',
] as const

export const COMMUNITY_GROUP_CATEGORIES: { value: (typeof COMMUNITY_GROUP_CATEGORY_VALUES)[number]; label: string }[] = [
  { value: 'religious_institution', label: 'Church / Faith Community' },
  { value: 'welfare_group', label: 'Welfare Association' },
  { value: 'cultural_organization', label: 'Cultural Group' },
  { value: 'youth_family_group', label: 'Youth Group' },
  { value: 'women_group', label: "Women's Group" },
  { value: 'mens_group', label: "Men's Group" },
  { value: 'professional_networking_group', label: 'Professional Association' },
  { value: 'alumni_group', label: 'Alumni Group' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'community_institution', label: 'Community Institution' },
  { value: 'sports_recreation_group', label: 'Sports / Recreation Group' },
  { value: 'benevolence_group', label: 'Benevolence / Mutual Aid Group' },
  { value: 'other', label: 'Other' },
]

export const RESOURCE_LIBRARY_CATEGORIES = [
  'Governance',
  'Membership',
  'Events',
  'Youth Programs',
  'Finance & Transparency',
  'Volunteer Resources',
  'Vendor Resources',
  'Presentations',
  'Meeting Minutes',
  'Community Forms',
  'Media & Branding',
] as const

export const BUSINESS_CATEGORIES = [
  'Food & Catering',
  'Salon & Beauty',
  'Fashion & Clothing',
  'Legal Services',
  'Healthcare',
  'Health & Wellness',
  'Real Estate',
  'Financial Services',
  'Insurance Services',
  'Tax and Accounting Services',
  'Bereavement and Benevolence Support',
  'Youth Counseling and Support',
  'Family Counseling',
  'Transport & Logistics',
  'Technology',
  'Education & Tutoring',
  'Religious & Spiritual',
  'Home Services',
  'Photography & Media',
  'Event Planning',
  'Retail & Grocery',
  'Travel & Tourism',
  'Auto Services',
  'Other',
] as const

export const FUNDRAISER_CATEGORIES = [
  'Medical Emergency',
  'Bereavement',
  'Education',
  'Disaster Relief',
  'Community Project',
  'Youth Support',
  'Other',
] as const

export const SPORTS_CATEGORIES = [
  'Soccer',
  'Basketball',
  'Track & Field',
  'Volleyball',
  'Youth League',
  'Tournament',
  'Community',
  'Other',
] as const

/** `public.feed_posts.post_type` (migration 032). */
export const FEED_POST_TYPES: FeedPostType[] = [
  'general',
  'question',
  'resource',
  'celebration',
  'reminder',
  'referral',
]

export const FEED_POST_STATUSES = ['approved', 'hidden', 'removed'] as const

export const FEED_COMMENT_STATUSES = ['approved', 'hidden', 'removed'] as const

export const feedPostTypeLabel: Record<FeedPostType, string> = {
  general: 'General',
  question: 'Question',
  resource: 'Resource',
  celebration: 'Celebration',
  reminder: 'Reminder',
  referral: 'Referral',
}

export const feedStatusLabel: Record<(typeof FEED_POST_STATUSES)[number], string> = {
  approved: 'Published',
  hidden: 'Hidden',
  removed: 'Removed',
}

export const FEED_MODERATION_REASON_PRESETS = [
  { value: 'inappropriate_language', label: 'Inappropriate language' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'private_information', label: 'Private information' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
] as const

export const CONTACT_CATEGORIES = [
  'General Inquiry',
  'Report an Issue',
  'Advertise / Sponsor',
  'Partnership',
  'Media Inquiry',
  'Submit Correction',
  'Other',
] as const

export const USER_ROLES = [
  'super_admin',
  'platform_admin',
  'community_admin',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
] as const

export const CONTENT_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'published',
  'unpublished',
  'archived',
  'rejected',
] as const

export const BUSINESS_TIERS = ['free', 'verified', 'featured', 'sponsor'] as const

export const DISCLAIMER_TEXT = `Kenyans in Greater Houston is a community information platform. We do not
guarantee the accuracy, completeness, or reliability of any content published
here. Fundraiser listings do not constitute endorsement. Always verify
independently before donating. Business listings are provided for
informational purposes only.`

export const FUNDRAISER_DISCLAIMER = `Please verify the authenticity of any fundraiser before contributing.
Kenyans in Greater Houston reviews submissions but cannot guarantee every
claim. Contact us if you have concerns about a specific listing.`
