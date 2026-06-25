import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PollVotePanel } from '@/components/polls/PollVotePanel'
import { fetchFeaturedPoll, type PollWithOptions } from '@/lib/pollsApi'
import { formatPollClosesAt, isPollClosed } from '@/lib/pollUtils'

/**
 * Landing page featured poll — prominent community call-to-action.
 *
 * Renders nothing unless an admin has featured an active poll.
 * Placed high on the homepage (after hero) with a strong banner design
 * and a primary CTA to the standalone poll page.
 */
export function FeaturedPoll() {
  const [poll, setPoll] = useState<PollWithOptions | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const p = await fetchFeaturedPoll()
      if (cancelled) return
      setPoll(p)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !poll || isPollClosed(poll)) return null

  const pollHref = `/polls/${poll.slug}`
  const pollClosed = isPollClosed(poll)

  return (
    <section
      className="relative z-10 -mt-6 px-4 pb-4 sm:-mt-8 sm:px-6 sm:pb-6 lg:-mt-10 lg:px-8"
      aria-labelledby="home-featured-poll-heading"
      data-testid="home-featured-poll"
    >
      <div className="public-container mx-auto">
        <div className="overflow-hidden rounded-3xl border border-kenyan-gold-200/80 bg-gradient-to-br from-kenyan-gold-50 via-card to-amber-50/80 shadow-xl shadow-kenyan-gold-100/40 ring-1 ring-kenyan-gold-100/60">
          <div className="border-b border-kenyan-gold-100/80 bg-kenyan-gold-500/10 px-5 py-4 sm:px-8 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kenyan-gold-500 text-white shadow-sm"
                  aria-hidden
                >
                  <BarChart3 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-kenyan-gold-800">
                    Community poll
                  </p>
                  <h2
                    id="home-featured-poll-heading"
                    className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    {poll.question}
                  </h2>
                </div>
              </div>
              <Button
                asChild
                size="lg"
                className="shrink-0 gap-2 border-0 bg-kenyan-gold-600 px-6 font-semibold text-white shadow-md hover:bg-kenyan-gold-500"
                data-testid="featured-poll-cta"
              >
                <Link to={pollHref}>
                  {pollClosed ? 'View poll results' : 'Vote in the poll'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>

          <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
            {poll.description ? (
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                {poll.description}
              </p>
            ) : null}

            {poll.closes_at ? (
              <p className="text-sm font-medium text-kenyan-gold-900/80">
                {pollClosed ? 'This poll closed on' : 'Voting closes'}{' '}
                {formatPollClosesAt(poll.closes_at)}
              </p>
            ) : null}

            <div className="rounded-2xl border border-border/50 bg-card/90 p-5 shadow-sm sm:p-6">
              <PollVotePanel poll={poll} fullPollHref={pollHref} compact />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
