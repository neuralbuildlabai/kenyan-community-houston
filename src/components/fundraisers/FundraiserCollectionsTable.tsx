import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateShort } from '@/lib/utils'
import {
  COLLECTIONS_SOURCE_LABEL,
  NO_COLLECTIONS_MESSAGE,
  formatCents,
  normalizeEntryType,
  publicDonorLabel,
  type FundraiserFundingSummary,
} from '@/lib/fundraiserCollections'

/**
 * The public transparency table: what came in, when, and what it added up
 * to. Same rows the totals above are computed from, in the same order.
 *
 * Donors are anonymous unless an admin published a name, so most rows show
 * only the description an admin wrote ("Cash App collections"). Private
 * reconciliation notes are not fetched here at all — anon has no grant on
 * that column (migration 085).
 *
 * The table scrolls sideways on a narrow screen rather than wrapping into
 * unreadable columns, and the scroll container is focusable so that is
 * reachable from the keyboard too.
 */
export function FundraiserCollectionsTable({
  summary,
  headingId = 'fundraiser-collections-heading',
}: {
  summary: FundraiserFundingSummary
  headingId?: string
}) {
  const { rows, collectedCents } = summary

  return (
    <section aria-labelledby={headingId} data-testid="fundraiser-collections">
      <h2 id={headingId} className="text-lg font-semibold tracking-tight text-foreground">
        Collections
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {COLLECTIONS_SOURCE_LABEL}
      </p>

      {rows.length === 0 ? (
        <p
          data-testid="fundraiser-collections-empty"
          className="mt-4 rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground"
        >
          {NO_COLLECTIONS_MESSAGE}
        </p>
      ) : (
        <div
          role="region"
          aria-labelledby={headingId}
          tabIndex={0}
          className="mt-4 overflow-x-auto rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          <Table className="min-w-[32rem]">
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="whitespace-nowrap">
                  Date received
                </TableHead>
                <TableHead scope="col">Source / description</TableHead>
                <TableHead scope="col" className="text-right whitespace-nowrap">
                  Amount
                </TableHead>
                <TableHead scope="col" className="text-right whitespace-nowrap">
                  Running total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const donor = publicDonorLabel(row)
                return (
                  <TableRow key={row.id} data-testid="fundraiser-collection-row">
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateShort(row.received_on)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium text-foreground">{row.description}</span>
                      {donor ? (
                        <span className="block text-xs text-muted-foreground">{donor}</span>
                      ) : null}
                      {normalizeEntryType(row.entry_type) === 'batch' ? (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          Batch of confirmed receipts
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">
                      {formatCents(row.amountCents)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums text-muted-foreground">
                      {formatCents(row.runningTotalCents)}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={3} className="text-sm font-semibold">
                  Total confirmed
                </TableCell>
                <TableCell
                  data-testid="fundraiser-collections-total"
                  className="whitespace-nowrap text-right text-sm font-semibold tabular-nums"
                >
                  {formatCents(collectedCents)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
