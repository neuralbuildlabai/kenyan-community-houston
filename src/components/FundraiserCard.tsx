import { Link } from 'react-router-dom'
import { ArrowRight, Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { VerificationBadge } from '@/components/StatusBadge'
import { timeAgo } from '@/lib/utils'
import {
  GOAL_REACHED_LABEL,
  formatCents,
  formatPercent,
  toCents,
} from '@/lib/fundraiserCollections'
import { fundraiserPath } from '@/lib/fundraiserShare'
import type { FundraiserVerificationStatus } from '@/lib/types'

/** The fields a listing card needs — satisfied by both `Fundraiser` and `PublicFundraiser`. */
interface FundraiserCardFundraiser {
  id: string
  slug: string
  title: string
  category: string
  summary: string | null
  image_url: string | null
  beneficiary_name: string
  goal_amount: number | null
  raised_amount: number
  verification_status: FundraiserVerificationStatus
  published_at: string | null
}

interface FundraiserCardProps {
  fundraiser: FundraiserCardFundraiser
}

/**
 * Listing card. The "View fundraiser" link is the card's only anchor and
 * covers the whole card via the stretched pseudo-element, so the
 * destination is spelled out for a screen reader and the card still behaves
 * like one big click target. Nesting a second `<a>` inside a wrapping one
 * would be invalid markup and announce the card twice.
 *
 * `raised_amount` is the trigger-maintained mirror of the collection ledger
 * (migration 085), so the figure here always matches the detail page total.
 */
export function FundraiserCard({ fundraiser }: FundraiserCardProps) {
  const collectedCents = toCents(fundraiser.raised_amount)
  const goalCents = fundraiser.goal_amount === null ? null : toCents(fundraiser.goal_amount)
  const hasGoal = goalCents !== null && goalCents > 0
  const percent = hasGoal ? (collectedCents / goalCents) * 100 : 0
  const goalReached = hasGoal && collectedCents >= goalCents

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative h-40 overflow-hidden bg-muted">
        {fundraiser.image_url ? (
          <img
            src={fundraiser.image_url}
            alt={fundraiser.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-kenyan-red-50 to-pink-50">
            <Heart className="h-12 w-12 text-kenyan-red-300" aria-hidden />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <VerificationBadge status={fundraiser.verification_status} />
        </div>
      </div>

      <CardContent className="p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {fundraiser.category}
          </Badge>
          {goalReached ? (
            <Badge className="bg-green-600 text-xs text-white hover:bg-green-600">
              {GOAL_REACHED_LABEL}
            </Badge>
          ) : null}
        </div>

        <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
          {fundraiser.title}
        </h3>

        {fundraiser.summary ? (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{fundraiser.summary}</p>
        ) : null}

        {hasGoal && (
          <div className="space-y-1.5">
            <Progress
              value={Math.min(100, percent)}
              className="h-2"
              aria-label={`${formatPercent(percent)} of the ${formatCents(goalCents)} goal collected`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatCents(collectedCents)} collected
              </span>
              <span>of {formatCents(goalCents)} goal</span>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>For: {fundraiser.beneficiary_name}</span>
          {fundraiser.published_at && <span>{timeAgo(fundraiser.published_at)}</span>}
        </div>

        <Link
          to={fundraiserPath(fundraiser.slug)}
          data-testid="fundraiser-card-link"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
        >
          View fundraiser
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  )
}
