export type UserRole =
  | 'super_admin'
  | 'community_admin'
  | 'business_admin'
  | 'support_admin'
  | 'moderator'
  | 'viewer'

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
}

export type MembershipType = 'individual' | 'family_household' | 'associate'

export type DuesStatus = 'pending' | 'paid' | 'waived' | 'overdue'

export type MembershipRecordStatus = 'pending' | 'active' | 'inactive' | 'rejected'

export interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
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

export interface GalleryAlbum {
  id: string
  title: string
  slug: string
  description: string | null
  cover_url: string | null
  event_date: string | null
  category: string
  status: ContentStatus
  is_featured: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  image_count?: number
}

export interface GalleryImage {
  id: string
  album_id: string
  title: string | null
  caption: string | null
  url: string
  thumbnail_url: string | null
  width: number | null
  height: number | null
  sort_order: number
  uploaded_by: string | null
  created_at: string
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
