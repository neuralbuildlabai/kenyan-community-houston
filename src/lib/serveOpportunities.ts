import type { ServiceInterestAvailability, ServiceInterestStatus } from '@/lib/types'

export const SERVICE_AVAILABILITY_OPTIONS: { value: ServiceInterestAvailability; label: string }[] = [
  { value: 'occasional', label: 'Occasional (when I can)' },
  { value: 'monthly', label: 'About monthly' },
  { value: 'events_only', label: 'Events only' },
  { value: 'committee_role', label: 'Committee role' },
  { value: 'leadership_role', label: 'Leadership role' },
]

export const SERVICE_STATUS_OPTIONS: { value: ServiceInterestStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'in_review', label: 'In review' },
  { value: 'matched', label: 'Matched' },
  { value: 'archived', label: 'Archived' },
]

/** Role and committee areas featured on the Call to Serve page. */
export const SERVE_OPPORTUNITY_CARDS: { title: string; hint?: string }[] = [
  { title: 'Chairperson / President support', hint: 'Strategic support alongside elected leadership' },
  { title: 'Vice Chairperson support' },
  { title: 'Secretary / records' },
  { title: 'Assistant Secretary' },
  { title: 'Treasurer / finance support' },
  { title: 'Assistant Treasurer' },
  { title: 'Facilitator / Operations support' },
  { title: 'Assistant Facilitator / Operations support' },
  { title: 'Youth Representative / youth programs' },
  { title: 'Welfare / community support' },
  { title: 'Assistant Welfare support' },
  { title: 'Events committee' },
  { title: 'Membership committee' },
  { title: 'Communications / social media' },
  { title: 'Business and vendor outreach' },
  { title: 'Cultural programs' },
  { title: 'Education and career programs' },
  { title: 'Health and wellness programs' },
  { title: 'Volunteer coordination' },
  { title: 'General community helpers' },
]
