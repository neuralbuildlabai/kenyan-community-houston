import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, HeartHandshake } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { KighLogo } from '@/components/KighLogo'
import {
  GOAL_REACHED_LABEL,
  formatCents,
  formatPercent,
  toCents,
} from '@/lib/fundraiserCollections'
import { fundraiserPath } from '@/lib/fundraiserShare'
import { fetchHomepageFeaturedFundraiser, type PublicFundraiser } from '@/lib/fundraisersPublic'
import { trackClick } from '@/lib/analytics'

/**
 * The fundraiser an admin pinned to the front page.
 *
 * Everything shown is read from the fundraiser row — title, summary, goal,
 * collected total, image, status — so featuring a different fundraiser is a
 * toggle in the admin table and nothing here changes. No fundraiser is
 * named in this file.
 *
 * Reaching the goal is not a reason to disappear: the card stays, says so,
 * and keeps linking to a page where donations are still open. Only an admin
 * unticking "Feature on homepage" (or unpublishing) removes it.
 */
export function HomeFeaturedFundraiser() {
  const [fundraiser, setFundraiser] = useState<PublicFundraiser | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchHomepageFeaturedFundraiser().then((row) => {
      if (!cancelled) setFundraiser(row)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!fundraiser) return null

  const href = fundraiserPath(fundraiser.slug)
  const collectedCents = toCents(fundraiser.raised_amount)
  const goalCents = fundraiser.goal_amount === null ? null : toCents(fundraiser.goal_amount)
  const hasGoal = goalCents !== null && goalCents > 0
  const percent = hasGoal ? (collectedCents / goalCents) * 100 : 0
  const goalReached = hasGoal && collectedCents >= goalCents

  return (
    <section
      className="px-4 pb-4 pt-10 sm:px-6 sm:pt-12 lg:px-8"
      aria-labelledby="home-featured-fundraiser-heading"
      data-testid="home-featured-fundraiser"
    >
      <div className="public-container mx-auto">
        <div className="flex flex-col gap-5 overflow-hidden rounded-2xl border border-kenyan-gold-200 bg-card shadow-sm sm:flex-row sm:items-stretch">
          <div className="relative h-36 shrink-0 bg-secondary/40 sm:h-auto sm:w-48">
            {fundraiser.image_url ? (
              <img
                src={fundraiser.image_url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-secondary/70 to-kenyan-gold-50 p-4">
                <HeartHandshake className="h-9 w-9 text-primary/70" aria-hidden />
                <KighLogo className="h-7 w-24 opacity-80" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 p-5 pt-0 sm:py-5 sm:pl-0 sm:pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                Community fundraiser
              </p>
              {goalReached ? (
                <Badge className="bg-green-600 text-[10px] text-white hover:bg-green-600">
                  {GOAL_REACHED_LABEL}
                </Badge>
              ) : null}
            </div>

            <h2
              id="home-featured-fundraiser-heading"
              className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              {fundraiser.title}
            </h2>

            {fundraiser.summary ? (
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {fundraiser.summary}
              </p>
            ) : null}

            {hasGoal ? (
              <div className="mt-3 space-y-1.5">
                <Progress
                  value={Math.min(100, percent)}
                  className="h-2"
                  aria-label={`${formatPercent(percent)} of the ${formatCents(goalCents)} goal collected`}
                />
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="home-featured-fundraiser-totals"
                >
                  <span className="font-semibold text-foreground">
                    {formatCents(collectedCents)}
                  </span>{' '}
                  collected of {formatCents(goalCents)} goal
                </p>
              </div>
            ) : null}

            <Button asChild size="sm" className="mt-4 w-full gap-1.5 sm:w-auto">
              <Link
                to={href}
                data-testid="home-featured-fundraiser-cta"
                onClick={() => void trackClick('home_featured_fundraiser', href)}
              >
                View &amp; Donate
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
