import {
  COMMUNITY_SUBMISSION_CATEGORIES,
  canonicalCategory,
  formatCategoryLabel,
  categoryValuesMatchingCanonical,
} from './communityCategories'
import type { FeedPostType } from './types'

export { COMMUNITY_SUBMISSION_CATEGORIES, canonicalCategory, formatCategoryLabel, categoryValuesMatchingCanonical }

export const APP_NAME = 'Kenyan Community Houston'
export const APP_TAGLINE = 'Your trusted home away from home in Houston, Texas.'
export const APP_DESCRIPTION =
  'The trusted digital hub for Kenyans in Houston and surrounding areas. Discover events, businesses, community news, and more.'

/** Primary public inbox; set `VITE_CONTACT_EMAIL` per deployment. */
export const PUBLIC_CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() ||
  'info@kenyancommunityhouston.org'

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
  'benevolence_group',
  'welfare_group',
  'youth_family_group',
  'cultural_organization',
  'professional_networking_group',
  'other',
] as const

export const COMMUNITY_GROUP_CATEGORIES: { value: (typeof COMMUNITY_GROUP_CATEGORY_VALUES)[number]; label: string }[] = [
  { value: 'religious_institution', label: 'Religious Institution' },
  { value: 'benevolence_group', label: 'Benevolence Group' },
  { value: 'welfare_group', label: 'Welfare Group' },
  { value: 'youth_family_group', label: 'Youth / Family Group' },
  { value: 'cultural_organization', label: 'Cultural Organization' },
  { value: 'professional_networking_group', label: 'Professional / Networking Group' },
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
  'Real Estate',
  'Financial Services',
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

export const DISCLAIMER_TEXT = `Kenyan Community Houston is a community information platform. We do not
guarantee the accuracy, completeness, or reliability of any content published
here. Fundraiser listings do not constitute endorsement. Always verify
independently before donating. Business listings are provided for
informational purposes only.`

export const FUNDRAISER_DISCLAIMER = `Please verify the authenticity of any fundraiser before contributing.
Kenyan Community Houston reviews submissions but cannot guarantee every
claim. Contact us if you have concerns about a specific listing.`
