import type {
  Event,
  VendorCategory,
  VendorPaymentStatus,
  VendorSignupStatus,
} from '@/lib/types'

/**
 * Vendor signup helpers — mirrors `eventVolunteerSignup.ts` in
 * shape so admins and devs reason about the two flows the same
 * way. Vendor signup adds a fee dimension (food vs. other) and
 * an out-of-band payment workflow; the actual money lands via
 * CashApp / Venmo / PayPal handles displayed on the success
 * screen.
 */

export const VENDOR_CATEGORIES: VendorCategory[] = ['food', 'other']

const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  food: 'Food vendor',
  other: 'Other vendor (retail / services / nonprofit)',
}

export function vendorCategoryLabel(category: string): string {
  if (category in VENDOR_CATEGORY_LABELS) {
    return VENDOR_CATEGORY_LABELS[category as VendorCategory]
  }
  return category
}

export const VENDOR_SIGNUP_STATUSES: VendorSignupStatus[] = [
  'submitted',
  'confirmed',
  'waitlisted',
  'cancelled',
  'declined',
]

const VENDOR_STATUS_LABELS: Record<VendorSignupStatus, string> = {
  submitted: 'Submitted',
  confirmed: 'Confirmed',
  waitlisted: 'Waitlisted',
  cancelled: 'Cancelled',
  declined: 'Declined',
}

export function vendorSignupStatusLabel(status: string): string {
  if (status in VENDOR_STATUS_LABELS) {
    return VENDOR_STATUS_LABELS[status as VendorSignupStatus]
  }
  return status
}

export const VENDOR_PAYMENT_STATUSES: VendorPaymentStatus[] = [
  'unpaid',
  'paid',
  'waived',
  'refunded',
]

const VENDOR_PAYMENT_LABELS: Record<VendorPaymentStatus, string> = {
  unpaid: 'Awaiting payment',
  paid: 'Paid',
  waived: 'Waived',
  refunded: 'Refunded',
}

export function vendorPaymentStatusLabel(status: string): string {
  if (status in VENDOR_PAYMENT_LABELS) {
    return VENDOR_PAYMENT_LABELS[status as VendorPaymentStatus]
  }
  return status
}

/** Default fees in cents — used only as a fallback when an event
 *  row hasn't set a custom fee. The DB has the same defaults
 *  (migration 050) so they should always agree. */
export const VENDOR_FEE_DEFAULTS_CENTS: Record<VendorCategory, number> = {
  food: 10000,
  other: 5000,
}

/**
 * Resolves the fee in cents for a given event + category.
 * Falls back to community defaults if the event row omits the
 * column (e.g. older row pre-migration).
 */
export function resolveVendorFeeCents(
  event: Pick<Event, 'vendor_food_fee_cents' | 'vendor_other_fee_cents'> | null | undefined,
  category: VendorCategory
): number {
  if (category === 'food') {
    return event?.vendor_food_fee_cents ?? VENDOR_FEE_DEFAULTS_CENTS.food
  }
  return event?.vendor_other_fee_cents ?? VENDOR_FEE_DEFAULTS_CENTS.other
}

/** Format a cents amount as USD (no decimals when round; cents when partial). */
export function formatVendorFee(cents: number): string {
  const dollars = cents / 100
  const isRound = Math.round(dollars) === dollars
  return isRound
    ? `$${dollars.toLocaleString('en-US')}`
    : `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Path only; safe for router `to` prop. */
export function vendorSignupPath(eventSlug: string): string {
  return `/events/${encodeURIComponent(eventSlug)}/vendor`
}

/**
 * Absolute vendor signup URL for sharing.
 * Uses VITE_PUBLIC_SITE_URL or VITE_APP_URL when set; otherwise
 * returns path-only (matches the volunteer helper).
 */
export function buildVendorSignupUrl(eventSlug: string): string {
  const raw = (import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_APP_URL || '').trim()
  const base = raw.replace(/\/$/, '')
  const path = vendorSignupPath(eventSlug)
  if (!base) return path
  return `${base}${path}`
}

export function buildVendorShareMessage(eventName: string, vendorLink: string): string {
  return `Vendors wanted for ${eventName}.\n\nSign up here:\n${vendorLink}`
}

export function buildVendorWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

/**
 * Payment handles displayed on the signup success screen.
 *
 * These are intentionally hard-coded for Phase 1. Phase 2 will
 * surface them as admin-editable settings so the community can
 * rotate handles without a deploy. All three accounts belong to
 * the KIGH treasurer.
 */
export interface VendorPaymentHandle {
  network: 'cashapp' | 'venmo' | 'paypal'
  label: string
  handle: string
  /** Optional deep link — opens the app on mobile when available. */
  href?: string
}

export const VENDOR_PAYMENT_HANDLES: VendorPaymentHandle[] = [
  {
    network: 'cashapp',
    label: 'CashApp',
    handle: '$KighTreasurer',
    // Canonical cashtag URL — the "$" is part of the path. Opens
    // the CashApp profile on web and deep-links into the mobile app.
    href: 'https://cash.app/$KighTreasurer',
  },
  {
    network: 'venmo',
    label: 'Venmo',
    handle: '@KIGH_Treasurer',
    // Use the bare username path — venmo.com/<username> has been
    // the long-standing, mobile-deep-link-compatible format.
    // (`/u/<username>` is an A/B variant that doesn't always
    // resolve in the iOS app.) The handle has no leading "@" in
    // the URL.
    href: 'https://venmo.com/KIGH_Treasurer',
  },
  {
    network: 'paypal',
    label: 'PayPal',
    handle: '@KighTreasurer',
    // PayPal.me URL — `paypal.com/paypalme/<username>` is the
    // canonical form (paypal.me/<username> is the shortened
    // alias). Username has no leading "@" in the URL and is
    // case-insensitive for routing.
    href: 'https://www.paypal.com/paypalme/KighTreasurer',
  },
]
