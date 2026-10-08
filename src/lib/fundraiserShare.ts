/**
 * Permanent fundraiser URLs and the WhatsApp message built from them.
 *
 * Fundraisers get shared by being pasted into WhatsApp groups, so the link
 * has to be the one permanent public address — never the admin dashboard,
 * a Vercel preview, or `localhost`, all of which are what a naive
 * `window.location.origin` hands you depending on who is clicking.
 *
 * `PUBLIC_SITE_URL` is the site's existing share origin (used by the member
 * invite links); it falls back to the production host rather than to
 * whatever host the page happens to be served from, which is exactly the
 * behaviour a share button needs.
 */
import { PUBLIC_SITE_URL } from '@/lib/memberDemographics'
import { formatCents, toCents } from '@/lib/fundraiserCollections'

/** Listing route. Detail pages hang directly off it: /community-support/<slug>. */
export const COMMUNITY_SUPPORT_PATH = '/community-support'

export function fundraiserPath(slug: string): string {
  return `${COMMUNITY_SUPPORT_PATH}/${slug}`
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/** The address to print, share, and set as canonical. */
export function fundraiserPublicUrl(slug: string, origin: string = PUBLIC_SITE_URL): string {
  return `${trimTrailingSlash(origin)}${fundraiserPath(slug)}`
}

/**
 * "Support X. Our goal is $2,000. Read more and donate: <url>"
 *
 * The goal sentence is dropped rather than left blank when a fundraiser has
 * no target, so the message never reads "Our goal is $0".
 */
export function buildFundraiserShareMessage({
  title,
  goalAmount,
  url,
}: {
  title: string
  goalAmount?: number | string | null
  url: string
}): string {
  const goalCents = goalAmount === null || goalAmount === undefined ? 0 : toCents(goalAmount)
  const goalSentence = goalCents > 0 ? ` Our goal is ${formatCents(goalCents)}.` : ''
  return `Support ${title.trim()}.${goalSentence} Read more and donate: ${url}`
}

/**
 * wa.me with no phone number opens WhatsApp's contact picker — the app on a
 * phone, WhatsApp Web or Desktop otherwise. A `whatsapp://` scheme would
 * only work on mobile.
 */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

/**
 * The note donors are asked to add so the treasurer can tell receipts
 * apart. Uses the fundraiser's configured reference, falling back to its
 * title; nothing is hardcoded per fundraiser.
 */
export function paymentReferenceFor(fundraiser: {
  title: string
  payment_reference?: string | null
}): string {
  return fundraiser.payment_reference?.trim() || fundraiser.title.trim()
}

export function paymentNoteInstruction(fundraiser: {
  title: string
  payment_reference?: string | null
}): string {
  return `Include “${paymentReferenceFor(fundraiser)}” in your payment note.`
}
