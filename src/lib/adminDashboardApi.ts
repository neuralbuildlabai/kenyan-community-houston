import { supabase } from '@/lib/supabase'

/**
 * Admin dashboard summary — wraps `kigh_admin_dashboard_summary()` from
 * migration 068. Elevated admins only; RLS bypass via SECURITY DEFINER.
 */

export type AdminDashboardMembersSummary = {
  total: number
  pending: number
  /** Active membership applications (membership_status = active). */
  approved: number
}

export type AdminDashboardProfilesSummary = {
  total: number
}

export type AdminDashboardEventsSummary = {
  published: number
  pending: number
  upcoming_published: number
}

export type AdminDashboardAnnouncementsSummary = {
  published: number
  pending: number
  expiring_soon: number
}

export type AdminDashboardContentSummary = {
  published: number
  pending: number
}

export type AdminDashboardFundraisersSummary = AdminDashboardContentSummary & {
  /** Published fundraisers with no deadline or deadline on/after today (Chicago). */
  live: number
}

export type AdminDashboardGallerySummary = {
  pending_images: number
  total_images: number
}

export type AdminDashboardMemberMediaSummary = {
  pending: number
  total: number
}

export type AdminDashboardContactMessagesSummary = {
  new: number
  total: number
}

export type AdminDashboardPublicSubmissionsSummary = {
  pending_total: number
}

export type AdminDashboardSignupsSummary = {
  total: number
  submitted: number
}

export type AdminDashboardPollsSummary = {
  active: number
  total_votes: number
  votes_7d: number
  votes_30d: number
}

export type AdminDashboardCommunitySummary = {
  open_chat_threads: number
  pending_community_groups: number
  pending_event_comments: number
  new_service_interests: number
  member_invites_total: number
  member_invites_opened: number
}

export type AdminDashboardSummary = {
  checked_at: string
  members: AdminDashboardMembersSummary
  profiles: AdminDashboardProfilesSummary
  events: AdminDashboardEventsSummary
  announcements: AdminDashboardAnnouncementsSummary
  businesses: AdminDashboardContentSummary
  fundraisers: AdminDashboardFundraisersSummary
  gallery: AdminDashboardGallerySummary
  member_media_submissions: AdminDashboardMemberMediaSummary
  contact_messages: AdminDashboardContactMessagesSummary
  public_submissions: AdminDashboardPublicSubmissionsSummary
  volunteers: AdminDashboardSignupsSummary
  vendors: AdminDashboardSignupsSummary
  polls: AdminDashboardPollsSummary
  community: AdminDashboardCommunitySummary
}

/** Flat KPI shape consumed by DashboardPage stat tiles. */
export type AdminDashboardStats = {
  members_total: number
  members_pending: number
  events_published: number
  events_pending: number
  announcements_published: number
  announcements_pending: number
  businesses_published: number
  businesses_pending: number
  fundraisers_active: number
  fundraisers_pending: number
  gallery_pending: number
  media_submissions_pending: number
  contacts_new: number
  profiles_total: number
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function section(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
}

function buildSection<T extends Record<string, number>>(
  raw: unknown,
  keys: (keyof T)[]
): T {
  const src = section(raw)
  const out = {} as T
  for (const key of keys) {
    out[key] = num(src[key as string]) as T[keyof T]
  }
  return out
}

export const EMPTY_ADMIN_DASHBOARD_SUMMARY: AdminDashboardSummary = {
  checked_at: '',
  members: { total: 0, pending: 0, approved: 0 },
  profiles: { total: 0 },
  events: { published: 0, pending: 0, upcoming_published: 0 },
  announcements: { published: 0, pending: 0, expiring_soon: 0 },
  businesses: { published: 0, pending: 0 },
  fundraisers: { published: 0, pending: 0, live: 0 },
  gallery: { pending_images: 0, total_images: 0 },
  member_media_submissions: { pending: 0, total: 0 },
  contact_messages: { new: 0, total: 0 },
  public_submissions: { pending_total: 0 },
  volunteers: { total: 0, submitted: 0 },
  vendors: { total: 0, submitted: 0 },
  polls: { active: 0, total_votes: 0, votes_7d: 0, votes_30d: 0 },
  community: {
    open_chat_threads: 0,
    pending_community_groups: 0,
    pending_event_comments: 0,
    new_service_interests: 0,
    member_invites_total: 0,
    member_invites_opened: 0,
  },
}

export const EMPTY_ADMIN_DASHBOARD_STATS: AdminDashboardStats = {
  members_total: 0,
  members_pending: 0,
  events_published: 0,
  events_pending: 0,
  announcements_published: 0,
  announcements_pending: 0,
  businesses_published: 0,
  businesses_pending: 0,
  fundraisers_active: 0,
  fundraisers_pending: 0,
  gallery_pending: 0,
  media_submissions_pending: 0,
  contacts_new: 0,
  profiles_total: 0,
}

export function mapAdminDashboardSummary(raw: unknown): AdminDashboardSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const root = raw as Record<string, unknown>

  return {
    checked_at: typeof root.checked_at === 'string' ? root.checked_at : '',
    members: buildSection<AdminDashboardMembersSummary>(root.members, ['total', 'pending', 'approved']),
    profiles: buildSection<AdminDashboardProfilesSummary>(root.profiles, ['total']),
    events: buildSection<AdminDashboardEventsSummary>(root.events, ['published', 'pending', 'upcoming_published']),
    announcements: buildSection<AdminDashboardAnnouncementsSummary>(root.announcements, [
      'published',
      'pending',
      'expiring_soon',
    ]),
    businesses: buildSection<AdminDashboardContentSummary>(root.businesses, ['published', 'pending']),
    fundraisers: buildSection<AdminDashboardFundraisersSummary>(root.fundraisers, [
      'published',
      'pending',
      'live',
    ]),
    gallery: buildSection<AdminDashboardGallerySummary>(root.gallery, ['pending_images', 'total_images']),
    member_media_submissions: buildSection<AdminDashboardMemberMediaSummary>(root.member_media_submissions, [
      'pending',
      'total',
    ]),
    contact_messages: buildSection<AdminDashboardContactMessagesSummary>(root.contact_messages, ['new', 'total']),
    public_submissions: buildSection<AdminDashboardPublicSubmissionsSummary>(root.public_submissions, [
      'pending_total',
    ]),
    volunteers: buildSection<AdminDashboardSignupsSummary>(root.volunteers, ['total', 'submitted']),
    vendors: buildSection<AdminDashboardSignupsSummary>(root.vendors, ['total', 'submitted']),
    polls: buildSection<AdminDashboardPollsSummary>(root.polls, ['active', 'total_votes', 'votes_7d', 'votes_30d']),
    community: buildSection<AdminDashboardCommunitySummary>(root.community, [
      'open_chat_threads',
      'pending_community_groups',
      'pending_event_comments',
      'new_service_interests',
      'member_invites_total',
      'member_invites_opened',
    ]),
  }
}

/** Maps the RPC summary into the flat stats shape used by dashboard tiles. */
export function mapSummaryToDashboardStats(summary: AdminDashboardSummary): AdminDashboardStats {
  return {
    members_total: summary.members.total,
    members_pending: summary.members.pending,
    events_published: summary.events.published,
    events_pending: summary.events.pending,
    announcements_published: summary.announcements.published,
    announcements_pending: summary.announcements.pending,
    businesses_published: summary.businesses.published,
    businesses_pending: summary.businesses.pending,
    fundraisers_active: summary.fundraisers.live,
    fundraisers_pending: summary.fundraisers.pending,
    gallery_pending: summary.gallery.pending_images,
    media_submissions_pending: summary.member_media_submissions.pending,
    contacts_new: summary.contact_messages.new,
    profiles_total: summary.profiles.total,
  }
}

export async function getAdminDashboardSummary(): Promise<{
  data: AdminDashboardSummary | null
  error: string | null
}> {
  const { data, error } = await supabase.rpc('kigh_admin_dashboard_summary')

  if (error) {
    return { data: null, error: error.message }
  }

  const mapped = mapAdminDashboardSummary(data)
  if (!mapped) {
    return { data: null, error: 'Unexpected dashboard summary response shape.' }
  }

  return { data: mapped, error: null }
}
