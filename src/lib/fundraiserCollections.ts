/**
 * Fundraising totals, derived from the collection ledger (migration 085).
 *
 * Every number a visitor sees — collected, percentage, remaining, goal
 * status, the running total in the table — comes out of `summarizeFundraiserCollections`
 * so they cannot drift apart. Nothing here reads a stored total.
 *
 * Money is handled in cents. `numeric(12,2)` arrives from PostgREST as a
 * JavaScript number, and summing dollars as floats puts 0.1 + 0.2 kinds of
 * residue into a published total.
 *
 * Reaching the goal is a milestone, not an ending: `goalReached` says to
 * show "Goal reached", and nothing here closes donations or caps the real
 * numbers. Only `progressBarPercent` is clamped, because a bar wider than
 * its track is a rendering bug rather than information.
 */

import { houstonToday } from '@/lib/utils'
import type { LockedXlsxSheet, XlsxColumn } from '@/lib/lockedXlsx'

export const COLLECTION_ENTRY_TYPES = ['individual', 'batch'] as const

export type CollectionEntryType = (typeof COLLECTION_ENTRY_TYPES)[number]

/** Columns anon is granted on `fundraiser_collections`. */
export interface PublicCollectionRow {
  id: string
  fundraiser_id?: string
  received_on: string
  amount: number | string
  description: string
  entry_type?: string | null
  public_donor_name?: string | null
  created_at?: string
  updated_at?: string | null
}

/** Admin rows add the fields `kigh_admin_fundraiser_collections` returns. */
export interface AdminCollectionRow extends PublicCollectionRow {
  donor_name: string | null
  show_donor_name: boolean
  private_note: string | null
  created_by?: string | null
  updated_by?: string | null
}

export interface CollectionTableRow extends PublicCollectionRow {
  amountCents: number
  runningTotalCents: number
}

export interface FundraiserFundingSummary {
  collectedCents: number
  goalCents: number | null
  /** Actual share of the goal collected — can exceed 100. Null without a goal. */
  percentRaised: number | null
  /** Same figure clamped to 0–100 for the progress bar's width. */
  progressBarPercent: number
  remainingCents: number
  goalReached: boolean
  /** Collected above the goal, 0 when at or below it. */
  overageCents: number
  entryCount: number
  /** Ledger rows oldest-first with a running total, ready to render. */
  rows: CollectionTableRow[]
  /** Latest admin change to the ledger, or null when there are no records. */
  lastUpdated: string | null
}

export const COLLECTIONS_SOURCE_LABEL = 'Confirmed collections, updated manually by KIGH.'

export const NO_COLLECTIONS_MESSAGE =
  'No confirmed collections recorded yet. Totals appear here once KIGH confirms funds received.'

export const GOAL_REACHED_LABEL = 'Goal reached'

/**
 * Dollars to whole cents. Accepts the strings PostgREST sends for
 * `numeric` columns and the strings an admin types into a form.
 */
export function toCents(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''))
  if (!Number.isFinite(numeric)) return 0
  return Math.round(numeric * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

/**
 * Currency for amounts that are rarely round. `formatCurrency` drops the
 * fractional part, which is right for a $2,000 goal and wrong for a
 * $37.50 receipt, so cents are shown only when there are any.
 */
export function formatCents(cents: number): string {
  const hasFraction = cents % 100 !== 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(fromCents(cents))
}

/** Trims a trailing `.0` so 75% reads as "75%" and 112.5% keeps its half. */
export function formatPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`
}

export function normalizeEntryType(value: unknown): CollectionEntryType {
  return value === 'batch' ? 'batch' : 'individual'
}

export function entryTypeLabel(value: unknown): string {
  return normalizeEntryType(value) === 'batch' ? 'Batch' : 'Individual'
}

/** Oldest first, so the running total column reads top to bottom. */
function byReceivedThenCreated(a: PublicCollectionRow, b: PublicCollectionRow): number {
  if (a.received_on !== b.received_on) return a.received_on < b.received_on ? -1 : 1
  return (a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1
}

export function summarizeFundraiserCollections(
  rows: readonly PublicCollectionRow[] | null | undefined,
  goalAmount: number | string | null | undefined
): FundraiserFundingSummary {
  const ordered = [...(rows ?? [])].sort(byReceivedThenCreated)

  let runningTotalCents = 0
  const tableRows: CollectionTableRow[] = ordered.map((row) => {
    const amountCents = toCents(row.amount)
    runningTotalCents += amountCents
    return { ...row, amountCents, runningTotalCents }
  })

  const collectedCents = runningTotalCents
  const goalCents = goalAmount === null || goalAmount === undefined ? null : toCents(goalAmount)
  const hasGoal = goalCents !== null && goalCents > 0

  const percentRaised = hasGoal ? (collectedCents / goalCents!) * 100 : null
  const goalReached = hasGoal ? collectedCents >= goalCents! : false

  const lastUpdated = ordered.reduce<string | null>((latest, row) => {
    const stamp = row.updated_at ?? row.created_at ?? null
    if (!stamp) return latest
    return latest === null || stamp > latest ? stamp : latest
  }, null)

  return {
    collectedCents,
    goalCents,
    percentRaised,
    progressBarPercent: percentRaised === null ? 0 : Math.min(100, Math.max(0, percentRaised)),
    remainingCents: hasGoal ? Math.max(0, goalCents! - collectedCents) : 0,
    goalReached,
    overageCents: hasGoal ? Math.max(0, collectedCents - goalCents!) : 0,
    entryCount: tableRows.length,
    rows: tableRows,
    lastUpdated,
  }
}

/**
 * Independent fundraisers (migration 090) have no KIGH ledger: the organizer
 * reports one running total through their manage link. Same summary shape,
 * so the progress panel renders it identically, with no ledger rows.
 */
export function summarizeReportedTotal(
  raisedAmount: number | string | null | undefined,
  goalAmount: number | string | null | undefined,
  reportedAt: string | null | undefined
): FundraiserFundingSummary {
  const base = summarizeFundraiserCollections([], goalAmount)
  const collectedCents = toCents(raisedAmount)
  const { goalCents } = base
  const hasGoal = goalCents !== null && goalCents > 0
  const percentRaised = hasGoal ? (collectedCents / goalCents!) * 100 : null
  return {
    ...base,
    collectedCents,
    percentRaised,
    progressBarPercent: percentRaised === null ? 0 : Math.min(100, Math.max(0, percentRaised)),
    remainingCents: hasGoal ? Math.max(0, goalCents! - collectedCents) : 0,
    goalReached: hasGoal ? collectedCents >= goalCents! : false,
    overageCents: hasGoal ? Math.max(0, collectedCents - goalCents!) : 0,
    lastUpdated: reportedAt ?? null,
  }
}

export interface CollectionDraft {
  received_on: string
  amount: string
  description: string
  entry_type: CollectionEntryType
  donor_name: string
  show_donor_name: boolean
  private_note: string
}

/**
 * The usual ways money reaches a fundraiser, offered as a dropdown so admins
 * are not retyping "Cash App" for every record. Anything else goes through
 * "Other" as free text — the stored description is still plain text.
 */
export const COLLECTION_SOURCES = [
  'Zelle',
  'PayPal',
  'Venmo',
  'Cash App',
  'Cash',
] as const

export function isPresetCollectionSource(description: string): boolean {
  return (COLLECTION_SOURCES as readonly string[]).includes(description.trim())
}

export function emptyCollectionDraft(today = new Date()): CollectionDraft {
  return {
    received_on: houstonToday(today),
    amount: '',
    description: '',
    entry_type: 'individual',
    donor_name: '',
    // Donors are credited by default; the admin unticks for anyone who
    // asked to stay anonymous. With no name entered the record is anonymous
    // regardless — see buildCollectionPayload.
    show_donor_name: true,
    private_note: '',
  }
}

export function collectionDraftFromRow(row: AdminCollectionRow): CollectionDraft {
  return {
    received_on: row.received_on,
    amount: fromCents(toCents(row.amount)).toFixed(2),
    description: row.description,
    entry_type: normalizeEntryType(row.entry_type),
    donor_name: row.donor_name ?? '',
    show_donor_name: Boolean(row.show_donor_name),
    private_note: row.private_note ?? '',
  }
}

/**
 * Mirrors the CHECK constraints in migration 085 so an admin gets a
 * sentence instead of a Postgres error. Returns null when submittable.
 */
export function validateCollectionDraft(draft: CollectionDraft): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.received_on)) {
    return 'Enter the date the funds were received.'
  }
  const cents = toCents(draft.amount)
  if (draft.amount.trim() === '' || cents <= 0) {
    return 'Enter an amount greater than zero.'
  }
  if (cents > 99_999_999_99) {
    return 'That amount is too large to record.'
  }
  const description = draft.description.trim()
  if (description.length < 2 || description.length > 160) {
    return 'Add a short public description between 2 and 160 characters.'
  }
  const donor = draft.donor_name.trim()
  if (donor && (donor.length < 2 || donor.length > 120)) {
    return 'A donor name must be between 2 and 120 characters.'
  }
  if (draft.private_note.length > 500) {
    return 'The private note must be 500 characters or fewer.'
  }
  return null
}

/**
 * Row payload. `donor_name` is kept whether or not it is displayed, so the
 * admin donor list stays complete; only `show_donor_name` decides whether
 * the generated `public_donor_name` column (the one anon can read) carries
 * it. `donor_name` itself is never granted to a client role.
 */
export function buildCollectionPayload(
  fundraiserId: string,
  draft: CollectionDraft
): {
  fundraiser_id: string
  received_on: string
  amount: number
  description: string
  entry_type: CollectionEntryType
  donor_name: string | null
  show_donor_name: boolean
  private_note: string | null
} {
  const donor = draft.donor_name.trim()
  return {
    fundraiser_id: fundraiserId,
    received_on: draft.received_on,
    amount: fromCents(toCents(draft.amount)),
    description: draft.description.trim(),
    entry_type: normalizeEntryType(draft.entry_type),
    donor_name: donor || null,
    show_donor_name: draft.show_donor_name && donor.length > 0,
    private_note: draft.private_note.trim() || null,
  }
}

/**
 * What the total becomes once a draft is saved, so the admin form can show
 * the recalculated figure before anything is written. Editing an existing
 * row swaps its contribution rather than adding to it.
 */
export function previewCollectedCents(
  rows: readonly PublicCollectionRow[] | null | undefined,
  draft: CollectionDraft,
  editingId?: string | null
): number {
  const existing = (rows ?? []).reduce(
    (sum, row) => (row.id === editingId ? sum : sum + toCents(row.amount)),
    0
  )
  return existing + Math.max(0, toCents(draft.amount))
}

/** Donor label for the public table; anonymous unless an admin opted in. */
export function publicDonorLabel(row: PublicCollectionRow): string | null {
  const name = row.public_donor_name?.trim()
  return name ? name : null
}

/**
 * Columns an admin can add to the donor list. Name, amount and running total
 * always come first and cannot be left out.
 */
export const DONOR_LIST_OPTIONAL_COLUMNS = [
  { key: 'received_on', header: 'Date received', width: 15, kind: 'date' },
  { key: 'source', header: 'Source', width: 24 },
  { key: 'entry_type', header: 'Record type', width: 12 },
  { key: 'shown_publicly', header: 'Shown publicly', width: 15 },
  { key: 'private_note', header: 'Private note', width: 40 },
] as const satisfies readonly (XlsxColumn & { key: string })[]

export type DonorListColumnKey = (typeof DONOR_LIST_OPTIONAL_COLUMNS)[number]['key']

export const DEFAULT_DONOR_LIST_COLUMNS: readonly DonorListColumnKey[] = ['received_on', 'source']

/**
 * The admin donor list as a locked workbook: who gave and how much side by
 * side, then the running total, then whichever details the admin picked.
 * Oldest first with the same running total the ledger shows, and a bold
 * total line at the bottom.
 *
 * Names are included whether or not they are shown publicly. Records with no
 * name export as "Anonymous". Records saved before 2026-10-12 dropped hidden
 * names, so those stay anonymous here.
 */
export function buildDonorListSheet(
  rows: readonly AdminCollectionRow[],
  include: readonly DonorListColumnKey[] = DEFAULT_DONOR_LIST_COLUMNS
): LockedXlsxSheet {
  const summary = summarizeFundraiserCollections(rows, null)
  const byId = new Map(rows.map((r) => [r.id, r]))
  const extras = DONOR_LIST_OPTIONAL_COLUMNS.filter((c) => include.includes(c.key))

  return {
    name: 'Donors',
    columns: [
      { header: 'Donor name', width: 28 },
      { header: 'Amount', width: 14, kind: 'money' },
      { header: 'Running total', width: 15, kind: 'money' },
      ...extras.map(({ header, width, ...rest }) => ({ header, width, kind: 'kind' in rest ? rest.kind : undefined })),
    ],
    rows: summary.rows.map((row) => {
      const admin = byId.get(row.id)
      const name = admin?.donor_name?.trim()
      const detail: Record<DonorListColumnKey, string> = {
        received_on: row.received_on,
        source: row.description,
        entry_type: entryTypeLabel(row.entry_type),
        shown_publicly: admin?.show_donor_name && name ? 'Yes' : 'No',
        private_note: admin?.private_note ?? '',
      }
      return [
        name || 'Anonymous',
        fromCents(row.amountCents),
        fromCents(row.runningTotalCents),
        ...extras.map((c) => detail[c.key]),
      ]
    }),
    footer: [
      `Total — ${summary.entryCount} ${summary.entryCount === 1 ? 'record' : 'records'}`,
      fromCents(summary.collectedCents),
    ],
  }
}

/** `kigh-donors-<fundraiser-slug>-2026-10-12.xlsx` (or `.pdf`) */
export function donorListFilename(
  fundraiserTitle: string,
  today = new Date(),
  extension: 'xlsx' | 'pdf' = 'xlsx'
): string {
  const slug =
    fundraiserTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'fundraiser'
  return `kigh-donors-${slug}-${houstonToday(today)}.${extension}`
}
