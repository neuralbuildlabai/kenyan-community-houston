import { describe, expect, it } from 'vitest'
import {
  EMPTY_ADMIN_DASHBOARD_STATS,
  mapAdminDashboardSummary,
  mapSummaryToDashboardStats,
} from '@/lib/adminDashboardApi'

describe('mapAdminDashboardSummary', () => {
  it('returns null for invalid payloads', () => {
    expect(mapAdminDashboardSummary(null)).toBeNull()
    expect(mapAdminDashboardSummary([])).toBeNull()
    expect(mapAdminDashboardSummary('bad')).toBeNull()
  })

  it('maps nested counts with numeric coercion', () => {
    const mapped = mapAdminDashboardSummary({
      checked_at: '2026-06-26T12:00:00Z',
      members: { total: '12', pending: 2, approved: 10 },
      profiles: { total: 8 },
      events: { published: 5, pending: 1, upcoming_published: 3 },
      announcements: { published: 4, pending: 0, expiring_soon: 1 },
      businesses: { published: 6, pending: 2 },
      fundraisers: { published: 3, pending: 1, live: '2' },
      gallery: { pending_images: 7, total_images: 100 },
      member_media_submissions: { pending: 4, total: 9 },
      contact_messages: { new: 3, total: 20 },
      public_submissions: { pending_total: 4 },
      volunteers: { total: 11, submitted: 8 },
      vendors: { total: 5, submitted: 4 },
      polls: { active: 1, total_votes: 50, votes_7d: 10, votes_30d: 25 },
      community: {
        open_chat_threads: 2,
        pending_community_groups: 1,
        pending_event_comments: 6,
        new_service_interests: 3,
        member_invites_total: 15,
        member_invites_opened: 14,
      },
    })

    expect(mapped?.members.total).toBe(12)
    expect(mapped?.fundraisers.live).toBe(2)
    expect(mapped?.polls.votes_7d).toBe(10)
  })

  it('defaults missing sections to zero', () => {
    const mapped = mapAdminDashboardSummary({ checked_at: '2026-01-01T00:00:00Z' })
    expect(mapped?.members).toEqual({ total: 0, pending: 0, approved: 0 })
    expect(mapped?.community.pending_event_comments).toBe(0)
  })
})

describe('mapSummaryToDashboardStats', () => {
  it('maps fundraiser live count to fundraisers_active tile', () => {
    const summary = mapAdminDashboardSummary({
      checked_at: '2026-06-26T12:00:00Z',
      members: { total: 1, pending: 0, approved: 1 },
      profiles: { total: 1 },
      events: { published: 2, pending: 0, upcoming_published: 1 },
      announcements: { published: 1, pending: 0, expiring_soon: 0 },
      businesses: { published: 1, pending: 0 },
      fundraisers: { published: 3, pending: 0, live: 2 },
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
    })!

    expect(mapSummaryToDashboardStats(summary)).toEqual({
      ...EMPTY_ADMIN_DASHBOARD_STATS,
      members_total: 1,
      members_pending: 0,
      profiles_total: 1,
      events_published: 2,
      events_pending: 0,
      announcements_published: 1,
      announcements_pending: 0,
      businesses_published: 1,
      businesses_pending: 0,
      fundraisers_active: 2,
      fundraisers_pending: 0,
    })
  })
})
