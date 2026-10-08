/**
 * `fundraisers.funding_mode` (migration 083) — how a listing collects money.
 *
 *  - `external` (default): the submitter's own GoFundMe/Givebutter link.
 *  - `internal`: an "Internal KIGH fundraiser". Donations go to the official
 *    KIGH handles, so the row stores NO payment details at all — the handles
 *    are resolved from `kighSupportOptions` at render time.
 *
 * Legacy rows written before the migration have no selection; every reader
 * funnels through `normalizeFundraiserFundingMode` so those count as
 * external. The matching CHECK constraints in migration 083 enforce the same
 * two rules server-side (valid value, and no `donation_url` when internal).
 */
import { hasActiveKighSupportOptions } from '@/lib/kighSupportOptions'

export const FUNDRAISER_FUNDING_MODES = ['external', 'internal'] as const

export type FundraiserFundingMode = (typeof FUNDRAISER_FUNDING_MODES)[number]

export const INTERNAL_FUNDRAISER_LABEL = 'Internal KIGH fundraiser'

export const INTERNAL_FUNDRAISER_HELPER_TEXT =
  'Donations go directly to KIGH using the payment options below.'

/** Attribution shown wherever internal donation details appear. */
export const KIGH_ORGANIZED_LABEL = 'Organized by KIGH'

export const KIGH_SUPPORT_UNAVAILABLE_MESSAGE =
  'KIGH payment options are not configured yet. Add them under Ways to Support, or submit this fundraiser with an external donation link.'

export function normalizeFundraiserFundingMode(value: unknown): FundraiserFundingMode {
  return value === 'internal' ? 'internal' : 'external'
}

export function isInternalFundraiser(value: unknown): boolean {
  return normalizeFundraiserFundingMode(value) === 'internal'
}

export function fundraiserFundingModeLabel(value: unknown): string {
  return isInternalFundraiser(value) ? 'Internal (KIGH)' : 'External link'
}

/**
 * Columns to write for a submission. Internal mode drops the external link
 * entirely — the form keeps whatever the user typed in local state so an
 * accidental toggle is recoverable, but it is never submitted or published.
 */
export function buildFundraiserFundingPayload({
  fundingMode,
  donationUrl,
}: {
  fundingMode: FundraiserFundingMode
  donationUrl: string
}): { funding_mode: FundraiserFundingMode; donation_url: string | null } {
  const mode = normalizeFundraiserFundingMode(fundingMode)
  return {
    funding_mode: mode,
    donation_url: mode === 'internal' ? null : donationUrl.trim() || null,
  }
}

/**
 * Admin-side mode change. Switching a row to internal must clear the stored
 * link in the same patch or the CHECK constraint rejects the update.
 */
export function fundraiserFundingModePatch(
  value: unknown
): { funding_mode: FundraiserFundingMode; donation_url?: null } {
  const mode = normalizeFundraiserFundingMode(value)
  return mode === 'internal' ? { funding_mode: mode, donation_url: null } : { funding_mode: mode }
}

/**
 * Form-side guard mirroring the database constraints. Returns a message to
 * show the submitter, or `null` when the selection is submittable.
 */
export function validateFundraiserFunding({
  fundingMode,
  supportMethodsAvailable = hasActiveKighSupportOptions(),
}: {
  fundingMode: FundraiserFundingMode
  supportMethodsAvailable?: boolean
}): string | null {
  if (normalizeFundraiserFundingMode(fundingMode) !== 'internal') return null
  if (!supportMethodsAvailable) return KIGH_SUPPORT_UNAVAILABLE_MESSAGE
  return null
}
