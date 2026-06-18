import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Lock } from 'lucide-react'

import { SEOHead } from '@/components/SEOHead'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/LoadingSpinner'
import { PollShareSection } from '@/components/polls/PollShareSection'
import { PollVotePanel } from '@/components/polls/PollVotePanel'
import { useAuth } from '@/contexts/AuthContext'
import { fetchPollBySlug, type PollWithOptions } from '@/lib/pollsApi'
import { formatPollClosesAt, isPollClosed } from '@/lib/pollUtils'

export function PollDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { isAdmin } = useAuth()
  const [poll, setPoll] = useState<PollWithOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      const p = await fetchPollBySlug(slug!)
      if (cancelled) return
      if (!p) {
        setNotFound(true)
        setPoll(null)
      } else {
        setPoll(p)
        setNotFound(false)
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) return <PageLoader />

  if (notFound || !poll) {
    return (
      <>
        <SEOHead title="Poll Not Found" description="This community poll could not be found." />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="mb-3 text-2xl font-bold">Poll not found</h1>
          <p className="mb-6 text-muted-foreground">
            This poll may have ended, been removed, or the link may be incorrect.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/polls">Browse polls</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back home</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const pollClosed = isPollClosed(poll)
  const showInactiveBanner = !poll.is_active && isAdmin

  return (
    <>
      <SEOHead
        title={poll.question}
        description={
          poll.description?.trim() ||
          `Community poll from Kenyans in Greater Houston — ${poll.question}`
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1">
          <Link to="/polls">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All polls
          </Link>
        </Button>

        <article className="space-y-8">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold" className="text-[10px] uppercase tracking-wide">
                Community poll
              </Badge>
              {poll.is_featured ? <Badge variant="secondary">Featured</Badge> : null}
              {pollClosed ? (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" aria-hidden />
                  Closed
                </Badge>
              ) : null}
              {showInactiveBanner ? (
                <Badge variant="destructive">Inactive (admin preview)</Badge>
              ) : null}
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {poll.question}
            </h1>

            {poll.description ? (
              <p className="text-lg leading-relaxed text-muted-foreground">{poll.description}</p>
            ) : null}

            {poll.closes_at ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" aria-hidden />
                {pollClosed ? 'Closed on' : 'Closes'} {formatPollClosesAt(poll.closes_at)}
              </p>
            ) : null}
          </header>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
            <PollVotePanel poll={poll} />
          </div>

          <PollShareSection slug={poll.slug} />
        </article>
      </div>
    </>
  )
}
