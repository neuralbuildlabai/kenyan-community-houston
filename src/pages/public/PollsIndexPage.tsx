import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Lock, Pin } from 'lucide-react'

import { SEOHead } from '@/components/SEOHead'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/LoadingSpinner'
import { fetchActivePolls, type PollWithOptions } from '@/lib/pollsApi'
import { formatPollClosesAt, isPollClosed, partitionPublicPolls } from '@/lib/pollUtils'

export function PollsIndexPage() {
  const [polls, setPolls] = useState<PollWithOptions[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const rows = await fetchActivePolls()
      if (!cancelled) {
        setPolls(rows)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const { open, closed } = partitionPublicPolls(polls)

  return (
    <>
      <SEOHead
        title="Community Polls"
        description="Vote in community polls from Kenyans in Greater Houston — share your voice on topics that matter to our neighbors."
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            Your voice
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Community polls
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Help shape what matters to the KIGH community. Members get one vote per poll.
          </p>
        </header>

        {loading ? (
          <PageLoader />
        ) : polls.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-10 text-center text-muted-foreground">
            No active polls right now. Check back soon — new questions appear here when admins
            open them to the community.
          </p>
        ) : (
          <div className="space-y-12">
            {open.length > 0 ? (
              <PollListSection title="Open polls" polls={open} />
            ) : null}
            {closed.length > 0 ? (
              <PollListSection title="Closed polls" polls={closed} closedSection />
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}

function PollListSection({
  title,
  polls,
  closedSection = false,
}: {
  title: string
  polls: PollWithOptions[]
  closedSection?: boolean
}) {
  return (
    <section aria-labelledby={`polls-section-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <h2
        id={`polls-section-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {title}
      </h2>
      <ul className="space-y-3">
        {polls.map((p) => (
          <li key={p.id}>
            <PollIndexCard poll={p} dimmed={closedSection || isPollClosed(p)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function PollIndexCard({ poll, dimmed }: { poll: PollWithOptions; dimmed?: boolean }) {
  const closed = isPollClosed(poll)

  return (
    <Link
      to={`/polls/${poll.slug}`}
      data-testid="poll-index-card"
      className={`group block rounded-2xl border px-5 py-5 transition sm:px-6 sm:py-6 ${
        dimmed
          ? 'border-border/50 bg-muted/10 hover:border-border'
          : poll.is_featured
            ? 'border-l-4 border-l-kenyan-gold-500 bg-kenyan-gold-50/50 ring-1 ring-kenyan-gold-100 hover:bg-kenyan-gold-50/70'
            : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {poll.is_featured && !dimmed ? (
              <Badge variant="gold" className="gap-1 text-[10px]">
                <Pin className="h-3 w-3" aria-hidden />
                Featured
              </Badge>
            ) : null}
            {closed ? (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Lock className="h-3 w-3" aria-hidden />
                Closed
              </Badge>
            ) : null}
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground group-hover:text-primary">
            {poll.question}
          </h3>
          {poll.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{poll.description}</p>
          ) : null}
          {poll.closes_at ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {closed ? 'Closed' : 'Closes'} {formatPollClosesAt(poll.closes_at)}
            </p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
          {closed ? 'View results' : 'Vote now'}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  )
}
