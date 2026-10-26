/**
 * Organizer manage link for independent fundraisers (migration 090).
 *
 * KIGH does not hold an independent fundraiser's money, so only the
 * organizer knows the real total. When the fundraiser is published they are
 * emailed `/community-support/manage#<token>`; the token sits in the URL
 * hash so it never reaches a server log or our page-view analytics, and the
 * database stores only its sha256.
 */
import { supabase } from '@/lib/supabase'

export const FUNDRAISER_MANAGE_PATH = '/community-support/manage'

export interface ManagedFundraiser {
  title: string
  slug: string
  status: string
  goal_amount: number | null
  raised_amount: number
  collections_updated_at: string | null
  donations_closed: boolean
  donation_url: string | null
  can_update: boolean
}

const TOKEN_RE = /^[0-9a-f]{64}$/

/** Pulls the token out of `#<token>` (or `#t=<token>`); null when malformed. */
export function manageTokenFromHash(hash: string): string | null {
  const raw = hash.replace(/^#/, '').replace(/^t=/, '').trim().toLowerCase()
  return TOKEN_RE.test(raw) ? raw : null
}

/**
 * Dollars typed by the organizer -> a number the database accepts, or null.
 * Accepts "1,250", "$1250.50"; refuses negatives and more than two decimals.
 */
export function parseReportedAmount(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) && value <= 10_000_000 ? value : null
}

export function manageErrorMessage(error: { message?: string | null } | null | undefined): string {
  const message = error?.message ?? ''
  if (message.includes('invalid_manage_link'))
    return 'This link is no longer valid. Reply to your KIGH email and we will send a new one.'
  if (message.includes('fundraiser_not_editable'))
    return 'This fundraiser can no longer be updated. Contact KIGH if something needs changing.'
  if (message.includes('invalid_amount')) return 'Enter the amount raised as a number, for example 1250.'
  return 'Could not save. Please try again.'
}

export async function fetchManagedFundraiser(token: string): Promise<ManagedFundraiser | null> {
  const { data, error } = await supabase.rpc('fundraiser_manage_get', { p_token: token })
  if (error) throw new Error(manageErrorMessage(error))
  return (data as ManagedFundraiser | null) ?? null
}

export async function updateManagedFundraiser(
  token: string,
  raisedAmount: number,
  donationsClosed: boolean
): Promise<ManagedFundraiser> {
  const { data, error } = await supabase.rpc('fundraiser_manage_update', {
    p_token: token,
    p_raised_amount: raisedAmount,
    p_donations_closed: donationsClosed,
  })
  if (error) throw new Error(manageErrorMessage(error))
  return data as ManagedFundraiser
}
