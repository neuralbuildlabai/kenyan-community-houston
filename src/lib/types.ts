export type UserRole =
  // Non-elevated default for self-registered profiles. Must NOT
  // appear in ELEVATED_ADMIN_ROLES below. See migration 020.
  | 'member'
  // New spec roles (production-ready hierarchy)
  | 'super_admin'
  | 'platform_admin'
  | 'community_admin'
  | 'admin'
  | 'content_manager'
  | 'membership_manager'
  | 'treasurer'
  | 'media_moderator'
  | 'ads_manager'
  // Legacy roles preserved for backward compatibility — must stay in
  // sync with public.kigh_is_elevated_admin() in supabase/migrations.
  | 'business_admin'
  | 'support_admin'
  | 'moderator'
  | 'viewer'

/** Roles that grant elevated admin access — must match
 *  `public.kigh_is_elevated_admin()` in supabase/migrations/013. */
export const ELEVATED_ADMIN_ROLES: UserRole[] = [
  'super_admin',
  'platform_admin',
  'community_admin',
  'admin',
  'content_manager',
  'membership_manager',
  'treasurer',
  'media_moderator',
  'ads_manager',
  'business_admin',
  'support_admin',
  'moderator',
]

/** Roles that may manage community ads (sponsorship slots). */
export const ADS_MANAGER_ROLES: UserRole[] = [
  'super_admin',
  'community_admin',
  'admin',
  'ads_manager',
]

/** Roles that may manage memberships. */
export const MEMBERSHIP_MANAGER_ROLES: UserRole[] = [
  'super_admin',
  'community_admin',
  'admin',
  'membership_manager',
]

/** Roles that may approve gallery / media submissions. */
export const MEDIA_MODERATOR_ROLES: UserRole[] = [
  'super_admin',
  'community_admin',
  'admin',
  'content_manager',
  'media_moderator',
]

export function isElevatedAdminRole(role: string | null | undefined): boolean {
  if (!role) return false
  return (ELEVATED_ADMIN_ROLES as string[]).includes(role)
}

export type ContentStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'unpublished'
  | 'archived'
  | 'rejected'

export type BusinessTier = 'free' | 'verified' | 'featured' | 'sponsor'

export type FundraiserVerificationStatus =
  | 'unverified'
  | 'under_review'
  | 'verified'
  | 'flagged'

/** Row in `admin_user_profiles` (password policy / board metadata). */
export interface AdminUserSecurity {
  user_id: string
  must_change_password: boolean
  temporary_password_set_at: string | null
  password_changed_at: string | null
  display_name: string | null
  position_title: string | null
  created_at?: string
  updated_at?: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  phone: string | null
  bio: string | null
  created_at: string
  updated_at: string
  preferred_name?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  county_or_heritage?: string | null
  preferred_communication?: string | null
  occupation?: string | null
  business_or_profession?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  interests?: string[]
  willing_to_volunteer?: boolean
  willing_to_serve?: boolean
  volunteer_interests?: string[]
  service_notes?: string | null
  avatar_storage_bucket?: string | null
  avatar_storage_path?: string | null
  avatar_original_filename?: string | null
  avatar_mime_type?: string | null
  avatar_file_size?: number | null
  profile_visibility?: 'private' | 'members_only' | 'public'
}

export interface ProfileHouseholdMember {
  id: string
  user_id: string
  full_name: string
  relationship: string | null
  age_group: 'adult' | 'youth' | 'child' | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type MemberMediaSubmissionStatus = 'pending' | 'approved' | 'rejected' | 'archived'

export interface MemberMediaSubmission {
  id: string
  user_id: string
  title: string
  description: string | null
  media_type: 'image' | 'video'
  storage_bucket: string
  storage_path: string
  original_filename: string | null
  mime_type: string | null
  file_size: number | null
  event_id: string | null
  permission_to_use: boolean
  status: MemberMediaSubmissionStatus
  created_at: string
  updated_at: string
}

/** Matches `content_status` on `events` in Supabase (includes legacy + calendar). */
export type EventStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'unpublished'
  | 'archived'
  | 'cancelled'
  | 'rejected'

export interface Event {
  id: string
  title: string
  slug: string
  description: string | null
  body?: string | null
  location: string
  address: string | null
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  is_free: boolean
  ticket_price: number | null
  ticket_url: string | null
  registration_url?: string | null
  category: string
  tags: string[]
  flyer_url: string | null
  image_url?: string | null
  short_description?: string | null
  timezone?: string | null
  city?: string | null
  state?: string | null
  is_virtual?: boolean
  virtual_url?: string | null
  capacity?: number | null
  organizer_name: string | null
  organizer_email: string | null
  organizer_phone?: string | null
  organizer_contact?: string | null
  organizer_website?: string | null
  status: EventStatus
  is_featured: boolean
  submitted_by?: string | null
  approved_by?: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  /** Recurrence (022+): populated for generated series rows. */
  is_recurring?: boolean | null
  recurrence_group_id?: string | null
  recurrence_master_id?: string | null
  recurrence_frequency?: string | null
  recurrence_interval?: number | null
  recurrence_until?: string | null
  source_announcement_id?: string | null
  recurrence_position?: number | null
  community_id?: string | null
}

export type MembershipType = 'individual' | 'family_household' | 'associate'

export type DuesStatus = 'pending' | 'paid' | 'waived' | 'overdue'

export type MembershipRecordStatus = 'pending' | 'active' | 'inactive' | 'rejected'

export interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  /** When set, mirrors Supabase Auth email confirmation time (migration 028). */
  auth_email_confirmed_at?: string | null
  phone: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  kenyan_county_or_heritage: string | null
  preferred_communication: string | null
  membership_type: MembershipType
  interests: string[]
  agreed_to_constitution: boolean
  consent_to_communications: boolean
  dues_status: DuesStatus
  membership_status: MembershipRecordStatus
  willing_to_volunteer?: boolean
  willing_to_serve?: boolean
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface HouseholdMember {
  id: string
  member_id: string
  full_name: string
  relationship: string | null
  age_group: 'adult' | 'youth' | 'child' | null
  email: string | null
  phone: string | null
  created_at: string
}

export type ResourceAccessLevel = 'public' | 'members_only' | 'admin_only' | 'needs_review'

export type ResourceStatus = 'draft' | 'published' | 'archived'

export type CommunityGroupCategory =
  | 'religious_institution'
  | 'benevolence_group'
  | 'welfare_group'
  | 'youth_family_group'
  | 'cultural_organization'
  | 'professional_networking_group'
  | 'other'

export type CommunityGroupStatus = 'pending' | 'approved' | 'published' | 'rejected' | 'archived'

/** Public-safe row from `list_public_community_groups` (no submitter PII or internal notes). */
export interface CommunityGroupPublic {
  id: string
  organization_name: string
  slug: string
  category: CommunityGroupCategory
  description: string | null
  website_url: string | null
  public_email: string | null
  public_phone: string | null
  meeting_location: string | null
  service_area: string | null
  social_url: string | null
  contact_person: string | null
  status: CommunityGroupStatus
  is_verified: boolean
  created_at: string
  updated_at: string
}

/** Full row for admin (includes submitter fields and notes). */
export interface CommunityGroup extends CommunityGroupPublic {
  submitter_name: string
  submitter_email: string
  notes: string | null
}

export interface Resource {
  id: string
  title: string
  slug: string
  description: string | null
  category: string
  file_type: string | null
  file_url: string | null
  external_url: string | null
  access_level: ResourceAccessLevel
  status: ResourceStatus
  resource_date: string | null
  related_event_id: string | null
  /** Supabase Storage bucket when file is private (e.g. kigh-private-documents). */
  storage_bucket?: string | null
  /** Object path within bucket; admin-only; never show on public routes. */
  storage_path?: string | null
  original_filename?: string | null
  file_size?: number | null
  mime_type?: string | null
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  title: string
  slug: string
  summary: string
  body: string
  category: string
  tags: string[]
  image_url: string | null
  external_url?: string | null
  author_name: string
  author_id: string | null
  status: ContentStatus
  is_featured: boolean
  is_pinned: boolean
  submitted_by: string | null
  approved_by: string | null
  published_at: string | null
  /** When true, approval also publishes a calendar event (see calendar_* fields). */
  include_in_calendar?: boolean | null
  linked_event_id?: string | null
  calendar_start_date?: string | null
  calendar_end_date?: string | null
  calendar_start_time?: string | null
  calendar_end_time?: string | null
  calendar_location?: string | null
  calendar_address?: string | null
  calendar_flyer_url?: string | null
  calendar_registration_url?: string | null
  calendar_is_recurring?: boolean | null
  calendar_recurrence_frequency?: string | null
  calendar_recurrence_until?: string | null
  calendar_recurrence_count?: number | null
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  name: string
  slug: string
  description: string
  long_description: string | null
  services?: string | null
  category: string
  subcategory: string | null
  tags: string[]
  logo_url: string | null
  cover_url: string | null
  website: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string
  state: string
  zip: string | null
  hours: Record<string, string> | null
  social_links: Record<string, string> | null
  tier: BusinessTier
  status: ContentStatus
  is_featured: boolean
  owner_name: string
  owner_email: string
  submitted_by: string | null
  approved_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface Fundraiser {
  id: string
  title: string
  slug: string
  summary: string
  body: string
  category: string
  tags: string[]
  image_url: string | null
  donation_url?: string | null
  goal_amount: number | null
  raised_amount: number
  currency: string
  beneficiary_name: string
  beneficiary_relationship: string | null
  payment_info: string | null
  organizer_name: string
  organizer_email: string
  organizer_phone: string | null
  verification_status: FundraiserVerificationStatus
  verification_notes: string | null
  status: ContentStatus
  is_featured: boolean
  deadline: string | null
  submitted_by: string | null
  approved_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface SportsPost {
  id: string
  title: string
  slug: string
  summary: string
  body: string
  category: string
  tags: string[]
  image_url: string | null
  sport: string | null
  team_name: string | null
  age_group: string | null
  author_name: string
  author_id: string | null
  status: ContentStatus
  is_featured: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

/** Row shape for `public.gallery_albums` (see migration 001 + 014). */
export interface GalleryAlbum {
  id: string
  name: string
  slug: string
  description: string | null
  cover_url: string | null
  created_at: string
  community_id?: string | null
}

/** Row shape for `public.gallery_images` (see migration 001 + 019). */
export interface GalleryImage {
  id: string
  album_id: string | null
  image_url: string
  caption: string | null
  taken_at?: string | null
  status?: ContentStatus | string
  created_at: string
  community_id?: string | null
}

export interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  category: string
  status: 'new' | 'read' | 'replied' | 'archived'
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface PublicSubmission {
  id: string
  type: 'event' | 'business' | 'announcement' | 'fundraiser'
  title: string
  submitter_name: string
  submitter_email: string
  submitter_phone: string | null
  data: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface SiteSetting {
  id: string
  key: string
  value: string | null
  label: string
  description: string | null
  type: 'text' | 'textarea' | 'boolean' | 'number' | 'url' | 'email'
  updated_by: string | null
  updated_at: string
}

export interface AdminActivityLog {
  id: string
  admin_id: string
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  admin?: Profile
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ServiceInterestAvailability =
  | 'occasional'
  | 'monthly'
  | 'events_only'
  | 'committee_role'
  | 'leadership_role'

export type ServiceInterestStatus =
  | 'new'
  | 'contacted'
  | 'in_review'
  | 'matched'
  | 'archived'

export interface ServiceInterest {
  id: string
  full_name: string
  email: string
  phone: string | null
  area_of_interest: string | null
  how_to_help: string | null
  availability: ServiceInterestAvailability
  skills_experience: string | null
  open_to_leadership_contact: boolean
  notes: string | null
  status: ServiceInterestStatus
  created_at: string
  updated_at: string
}
