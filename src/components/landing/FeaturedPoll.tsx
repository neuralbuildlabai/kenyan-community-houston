import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import {
  castPollVote,
  fetchFeaturedPoll,
  fetchMyPollVote,
  fetchPollResults,
  type DbPollOption,
  type PollResultRow,
  type PollWithOptions,
} from '@/lib/pollsApi'
import { toast } from 'sonner'

/**
 * Landing page widget: shows the single featured + active poll.
 *
 * UX states:
 *   - Loading: nothing rendered (avoid layout shift; widget is optional).
 *   - No featured poll: renders nothing — admins explicitly opt a poll in.
 *   - Signed-out viewer: shows the question + options preview + "Sign in
 *     to vote" CTA. No vote can be cast.
 *   - Signed-in, hasn't voted: shows radio inputs + Submit.
 *   - After voting (or poll closed): shows per-option tallies and a check
 *     mark on the option the user picked.
 */
export function FeaturedPoll() {
  const { user, loading: authLoading } = useAuth()
  const [poll, setPoll] = useState<PollWithOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [myVoteOptionId, setMyVoteOptionId] = useState<string | null>(null)
  const [results, setResults] = useState<PollResultRow[] | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Initial fetch.
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

  // When the poll + auth resolve, see if this user has already voted.
  useEffect(() => {
    if (!poll || authLoading) return
    if (!user) {
      setMyVoteOptionId(null)
      return
    }
    let cancelled = false
    async function checkVote() {
      const optionId = await fetchMyPollVote(poll!.id)
      if (cancelled) return
      setMyVoteOptionId(optionId)
    }
    void checkVote()
    return () => {
      cancelled = true
    }
  }, [poll, user, authLoading])

  // Pull results whenever the viewer is eligible to see them (voted, or
  // the poll has closed). Admin view of results is admin-page territory.
  useEffect(() => {
    if (!poll) return
    const pollClosed =
      poll.closes_at !== null && new Date(poll.closes_at).getTime() <= Date.now()
    const canSeeResults = myVoteOptionId !== null || pollClosed
    if (!canSeeResults) {
      setResults(null)
      return
    }
    let cancelled = false
    async function loadResults() {
      try {
        const rows = await fetchPollResults(poll!.id)
        if (cancelled) return
        setResults(rows)
      } catch {
        // Caller isn't allowed yet — leave results null.
      }
    }
    void loadResults()
    return () => {
      cancelled = true
    }
  }, [poll, myVoteOptionId])

  if (loading || !poll) return null

  const pollClosed =
    poll.closes_at !== null && new Date(poll.closes_at).getTime() <= Date.now()
  const hasVoted = myVoteOptionId !== null
  const showResults = hasVoted || pollClosed
  const canVote = !!user && !hasVoted && !pollClosed

  async function handleSubmit() {
    if (!poll || !selectedOptionId) return
    setSubmitting(true)
    try {
      await castPollVote(poll.id, selectedOptionId)
      setMyVoteOptionId(selectedOptionId)
      toast.success('Thanks for voting!')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not record your vote. Try again.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      className="border-b border-border/40 bg-muted/15 py-16 sm:py-20"
      aria-labelledby="home-featured-poll-heading"
      data-testid="home-featured-poll"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
          Community poll
        </p>
        <h2
          id="home-featured-poll-heading"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          {poll.question}
        </h2>
        {poll.description ? (
          <p className="mt-3 text-base text-muted-foreground">{poll.description}</p>
        ) : null}

        <div className="mt-8 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm sm:p-8">
          {showResults ? (
            <PollResults
              options={poll.options}
              results={results}
              myVoteOptionId={myVoteOptionId}
              pollClosed={pollClosed}
            />
          ) : canVote ? (
            <PollBallot
              options={poll.options}
              selectedOptionId={selectedOptionId}
              onSelect={setSelectedOptionId}
              submitting={submitting}
              onSubmit={() => void handleSubmit()}
            />
          ) : (
            // Signed-out viewer.
            <SignedOutPreview options={poll.options} />
          )}
        </div>
      </div>
    </section>
  )
}

function PollBallot({
  options,
  selectedOptionId,
  onSelect,
  submitting,
  onSubmit,
}: {
  options: DbPollOption[]
  selectedOptionId: string | null
  onSelect: (id: string) => void
  submitting: boolean
  onSubmit: () => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <fieldset>
        <legend className="sr-only">Choose one</legend>
        <ul className="space-y-3">
          {options.map((o) => (
            <li key={o.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  selectedOptionId === o.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border/70 hover:border-primary/40 hover:bg-muted/40'
                }`}
              >
                <input
                  type="radio"
                  name="poll-option"
                  value={o.id}
                  checked={selectedOptionId === o.id}
                  onChange={() => onSelect(o.id)}
                  className="h-4 w-4 accent-primary"
                  data-testid="featured-poll-option"
                />
                <span className="text-base font-medium text-foreground">{o.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">One vote per member.</p>
        <Button
          type="submit"
          disabled={!selectedOptionId || submitting}
          data-testid="featured-poll-submit"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            'Submit vote'
          )}
        </Button>
      </div>
    </form>
  )
}

function PollResults({
  options,
  results,
  myVoteOptionId,
  pollClosed,
}: {
  options: DbPollOption[]
  results: PollResultRow[] | null
  myVoteOptionId: string | null
  pollClosed: boolean
}) {
  // Sort by display_order; fall through to options order if results haven't arrived.
  const rows = results ?? options.map((o) => ({
    option_id: o.id,
    label: o.label,
    display_order: o.display_order,
    vote_count: 0,
  }))
  const totalVotes = rows.reduce((sum, r) => sum + r.vote_count, 0)

  return (
    <div>
      <ul className="space-y-3">
        {rows.map((r) => {
          const pct = totalVotes > 0 ? Math.round((r.vote_count / totalVotes) * 100) : 0
          const mine = r.option_id === myVoteOptionId
          return (
            <li key={r.option_id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  {mine ? (
                    <Check
                      className="h-4 w-4 text-primary"
                      aria-label="Your vote"
                    />
                  ) : null}
                  {r.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {r.vote_count} · {pct}%
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="presentation"
              >
                <div
                  className={`h-full transition-all ${mine ? 'bg-primary' : 'bg-primary/40'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-5 text-sm text-muted-foreground">
        {totalVotes} vote{totalVotes === 1 ? '' : 's'}
        {pollClosed ? ' · Poll closed' : myVoteOptionId ? ' · Thanks for voting' : ''}
      </p>
    </div>
  )
}

function SignedOutPreview({ options }: { options: DbPollOption[] }) {
  return (
    <div>
      <ul className="space-y-2">
        {options.map((o) => (
          <li
            key={o.id}
            className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-base text-foreground"
          >
            {o.label}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Members get one vote each.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" data-testid="featured-poll-signin">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild data-testid="featured-poll-join">
            <Link to="/membership">Join the community</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
