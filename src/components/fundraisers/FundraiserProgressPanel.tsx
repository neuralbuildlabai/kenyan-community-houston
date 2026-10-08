import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import {
  COLLECTIONS_SOURCE_LABEL,
  GOAL_REACHED_LABEL,
  formatCents,
  formatPercent,
  type FundraiserFundingSummary,
} from '@/lib/fundraiserCollections'

/**
 * The money summary that sits directly above the donation options.
 *
 * Every figure comes from one `summarizeFundraiserCollections` result, so
 * the headline total, the bar, the remaining balance and the table further
 * down the page are arithmetically the same thing shown four ways.
 *
 * Past the goal the panel keeps telling the truth — $2,250 of a $2,000 goal
 * reads as $2,250 at 112.5% with $250 above the goal — while the bar itself
 * stops at full, since a bar cannot usefully be 112% wide.
 *
 * The label is deliberate: these are receipts an admin has confirmed and
 * typed in, not a live payment feed, and the page should not imply otherwise.
 */
export function FundraiserProgressPanel({
  summary,
  headingId = 'fundraiser-progress-heading',
}: {
  summary: FundraiserFundingSummary
  headingId?: string
}) {
  const { collectedCents, goalCents, percentRaised, goalReached, overageCents } = summary
  const hasGoal = goalCents !== null && goalCents > 0

  return (
    <section
      aria-labelledby={headingId}
      data-testid="fundraiser-progress"
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id={headingId} className="text-sm font-semibold text-foreground">
          Fundraising progress
        </h2>
        {goalReached ? (
          <Badge
            data-testid="fundraiser-goal-reached"
            className="bg-green-600 text-white hover:bg-green-600"
          >
            {GOAL_REACHED_LABEL}
          </Badge>
        ) : null}
      </div>

      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          data-testid="fundraiser-collected"
          className="text-3xl font-semibold tracking-tight text-foreground"
        >
          {formatCents(collectedCents)}
        </span>
        <span className="text-sm text-muted-foreground">
          collected{hasGoal ? ` of ${formatCents(goalCents)} goal` : ''}
        </span>
      </p>

      {hasGoal ? (
        <>
          <Progress
            value={summary.progressBarPercent}
            className="mt-4 h-2.5"
            aria-label={`Fundraising progress: ${formatPercent(percentRaised ?? 0)} of the ${formatCents(goalCents)} goal`}
            getValueLabel={() => formatPercent(percentRaised ?? 0)}
          />
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Collected</dt>
              <dd className="font-medium text-foreground">{formatCents(collectedCents)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Goal</dt>
              <dd data-testid="fundraiser-goal" className="font-medium text-foreground">
                {formatCents(goalCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Raised</dt>
              <dd data-testid="fundraiser-percent" className="font-medium text-foreground">
                {formatPercent(percentRaised ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {overageCents > 0 ? 'Above goal' : 'Remaining'}
              </dt>
              <dd
                data-testid={overageCents > 0 ? 'fundraiser-overage' : 'fundraiser-remaining'}
                className="font-medium text-foreground"
              >
                {formatCents(overageCents > 0 ? overageCents : summary.remainingCents)}
              </dd>
            </div>
          </dl>
        </>
      ) : null}

      <p className="mt-4 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
        {COLLECTIONS_SOURCE_LABEL}
        {summary.lastUpdated ? (
          <>
            {' '}
            Last updated{' '}
            <time data-testid="fundraiser-last-updated" dateTime={summary.lastUpdated}>
              {formatDateTime(summary.lastUpdated)}
            </time>
            .
          </>
        ) : null}
      </p>
    </section>
  )
}
