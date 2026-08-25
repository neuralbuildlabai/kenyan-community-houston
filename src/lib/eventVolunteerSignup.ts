import type { Event, VolunteerSignupStatus } from '@/lib/types'
import { customVolunteerRoleOptions } from '@/lib/eventParticipation'

export const VOLUNTEER_SIGNUP_STATUSES: VolunteerSignupStatus[] = [
  'submitted',
  'confirmed',
  'waitlisted',
  'cancelled',
  'declined',
]

const STATUS_LABELS: Record<VolunteerSignupStatus, string> = {
  submitted: 'Submitted',
  confirmed: 'Confirmed',
  waitlisted: 'Waitlisted',
  cancelled: 'Cancelled',
  declined: 'Declined',
}

export function volunteerSignupStatusLabel(status: string): string {
  if (status in STATUS_LABELS) return STATUS_LABELS[status as VolunteerSignupStatus]
  return status
}

/** Path only; safe for router `to` prop. */
export function volunteerSignupPath(eventSlug: string): string {
  return `/events/${encodeURIComponent(eventSlug)}/volunteer`
}

/**
 * Absolute volunteer signup URL for sharing (WhatsApp, email).
 * Uses VITE_PUBLIC_SITE_URL or VITE_APP_URL when set; otherwise returns path-only.
 */
export function buildVolunteerSignupUrl(eventSlug: string): string {
  const raw = (import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_APP_URL || '').trim()
  const base = raw.replace(/\/$/, '')
  const path = volunteerSignupPath(eventSlug)
  if (!base) return path
  return `${base}${path}`
}

export function buildVolunteerShareMessage(eventName: string, volunteerLink: string): string {
  return `Volunteers needed for ${eventName}.\n\nSign up here:\n${volunteerLink}`
}

export function buildVolunteerWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

/**
 * Produces a DB-safe volunteer_signup_slug (lowercase kebab, letters/digits/hyphens only).
 */
export function generateVolunteerSignupSlug(input: {
  eventSlug: string
  eventTitle: string
  existing?: string | null
}): string {
  const existing = input.existing?.trim().toLowerCase()
  if (existing && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(existing)) return existing

  const fromSlug = input.eventSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  if (fromSlug.length >= 2) return fromSlug.slice(0, 120)

  const fromTitle = input.eventTitle
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (fromTitle.length >= 2) return fromTitle.slice(0, 120)

  return `volunteer-${Date.now().toString(36)}`
}

/**
 * 2026 dues waiver — sunset date.
 *
 * KIGH waived the $20 annual dues for 2026 (community decision). The
 * waiver messaging and the waived dues_status automatically end at
 * Dec 1, 2026 00:00 America/Chicago (CST = UTC-6): from that moment,
 * 2027 dues are in play and the form/DB switch to normal dues language
 * with NO deploy needed. Migration 074 encodes the same boundary
 * server-side in create_event_volunteer_signup — keep the two in sync
 * if this date ever changes.
 */
export const DUES_WAIVER_ENDS_AT = new Date('2026-12-01T06:00:00Z')

export function isDuesWaiverActive(now: Date = new Date()): boolean {
  return now < DUES_WAIVER_ENDS_AT
}

export type VolunteerRoleGroup = { heading: string; options: string[] }

/**
 * DEFAULT role options for the "Your role" dropdown on the public
 * volunteer/presenter signup form. Deliberately event-agnostic so the
 * same form serves every recurring KIGH event — back-to-school,
 * financial literacy (insurance, tax, investing), health sessions,
 * social groups, fun days — without per-event code changes.
 *
 * A specific event can override this entire list by setting
 * `events.volunteer_role_options` (migration 072); see
 * resolveVolunteerRoleGroups below.
 *
 * Values are stored as-is in `event_volunteer_signups.volunteer_role`
 * (free text, max 120 chars — migration 034) so admins filtering
 * `/admin/volunteers` see clean, consistent labels.
 */
export const VOLUNTEER_ROLE_GROUPS: VolunteerRoleGroup[] = [
  {
    heading: 'Presenting or sharing expertise',
    options: [
      'Guest Speaker / Presenter',
      'Educator / Teacher',
      'School or Career Counselor',
      'College / Scholarship Advisor',
      'Finance / Tax Professional',
      'Insurance Professional',
      'Health & Wellness Professional',
      'Legal / Immigration Professional',
      'Business / Entrepreneurship Mentor',
    ],
  },
  {
    heading: 'Helping with the event',
    options: [
      'Host / Moderator / MC',
      'Tech / Zoom support',
      'Registration / check-in',
      'Communications / social media',
      'Setup & logistics',
      'General helper',
    ],
  },
]

/** Sentinel value for the "Other — write in" option; never saved as-is. */
export const VOLUNTEER_ROLE_OTHER_VALUE = '__other__'

/**
 * Role groups for a given event: the event's own
 * `volunteer_role_options` when set (single "Roles for this event"
 * group), otherwise the default generic groups.
 */
export function resolveVolunteerRoleGroups(
  event: Pick<Event, 'volunteer_role_options'> | null | undefined
): VolunteerRoleGroup[] {
  const custom = customVolunteerRoleOptions(event?.volunteer_role_options)
  if (custom.length > 0) {
    return [{ heading: 'Roles for this event', options: custom }]
  }
  return VOLUNTEER_ROLE_GROUPS
}
