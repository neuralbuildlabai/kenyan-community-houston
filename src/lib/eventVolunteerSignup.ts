import type { VolunteerSignupStatus } from '@/lib/types'

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
