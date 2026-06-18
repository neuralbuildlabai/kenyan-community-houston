import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ExternalLink, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import {
  castPollVote,
  fetchMyPollVote,
  fetchPollResults,
  type DbPollOption,
  type PollResultRow,
  type PollWithOptions,
} from '@/lib/pollsApi'
import { isPollClosed } from '@/lib/pollUtils'
import { toast } from 'sonner'

type PollVotePanelProps = {
  poll: PollWithOptions
  /** When set, show a link to the standalone poll page. */
  fullPollHref?: string
  /** Tighter spacing for homepage embed. */
  compact?: boolean
}

/**
 * Shared voting UI: ballot, results, or signed-out preview.
 * Used on the homepage widget and standalone poll page.
 */
export function PollVotePanel({ poll, fullPollHref, compact = false }: PollVotePanelProps) {
  const { user, loading: authLoading } = useAuth()
  const [myVoteOptionId, setMyVoteOptionId] = useState<string | null>(null)
  const [results, setResults] = useState<PollResultRow[] | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [voteChecked, setVoteChecked] = useState(false)

  const pollClosed = isPollClosed(poll)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setMyVoteOptionId(null)
      setVoteChecked(true)
      return
    }
    let cancelled = false
    async function checkVote() {
      const optionId = await fetchMyPollVote(poll.id)
      if (cancelled) return
      setMyVoteOptionId(optionId)
      setVoteChecked(true)
    }
    void checkVote()
    return () => {
      cancelled = true
    }
  }, [poll.id, user, authLoading])

  useEffect(() => {
    const canSeeResults = myVoteOptionId !== null || pollClosed
    if (!canSeeResults || !voteChecked) {
      setResults(null)
      return
    }
    let cancelled = false
    async function loadResults() {
      try {
        const rows = await fetchPollResults(poll.id)
        if (cancelled) return
        setResults(rows)
      } catch {
        // Not eligible yet.
      }
    }
    void loadResults()
    return () => {
      cancelled = true
    }
  }, [poll.id, myVoteOptionId, pollClosed, voteChecked])

  const hasVoted = myVoteOptionId !== null
  const showResults = hasVoted || pollClosed
  const canVote = !!user && !hasVoted && !pollClosed

  async function handleSubmit() {
    if (!selectedOptionId) return
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

  if (!voteChecked && user) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="poll-vote-loading">
        Loading…
      </p>
    )
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {showResults ? (
        <PollResultsView
          options={poll.options}
          results={results}
          myVoteOptionId={myVoteOptionId}
          pollClosed={pollClosed}
        />
      ) : canVote ? (
        <PollBallotView
          options={poll.options}
          selectedOptionId={selectedOptionId}
          onSelect={setSelectedOptionId}
          submitting={submitting}
          onSubmit={() => void handleSubmit()}
          compact={compact}
        />
      ) : (
        <SignedOutPreview options={poll.options} compact={compact} />
      )}

      {fullPollHref ? (
        <div className="flex justify-end border-t border-border/50 pt-4">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-primary">
            <Link to={fullPollHref} data-testid="poll-open-full">
              Open full poll
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function PollBallotView({
  options,
  selectedOptionId,
  onSelect,
  submitting,
  onSubmit,
  compact,
}: {
  options: DbPollOption[]
  selectedOptionId: string | null
  onSelect: (id: string) => void
  submitting: boolean
  onSubmit: () => void
  compact?: boolean
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
        <ul className={compact ? 'space-y-2' : 'space-y-3'}>
          {options.map((o) => (
            <li key={o.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 transition ${
                  compact ? 'py-2.5' : 'py-3'
                } ${
                  selectedOptionId === o.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
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
                  data-testid="poll-option"
                />
                <span className="text-base font-medium text-foreground">{o.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
          compact ? 'mt-4' : 'mt-6'
        }`}
      >
        <p className="text-sm text-muted-foreground">One vote per member.</p>
        <Button
          type="submit"
          disabled={!selectedOptionId || submitting}
          data-testid="poll-submit"
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

function PollResultsView({
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
  const rows =
    results ??
    options.map((o) => ({
      option_id: o.id,
      label: o.label,
      display_order: o.display_order,
      vote_count: 0,
    }))
  const totalVotes = rows.reduce((sum, r) => sum + r.vote_count, 0)

  return (
    <div data-testid="poll-results">
      <ul className="space-y-3">
        {rows.map((r) => {
          const pct = totalVotes > 0 ? Math.round((r.vote_count / totalVotes) * 100) : 0
          const mine = r.option_id === myVoteOptionId
          return (
            <li key={r.option_id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  {mine ? (
                    <Check className="h-4 w-4 text-primary" aria-label="Your vote" />
                  ) : null}
                  {r.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {r.vote_count} · {pct}%
                </span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
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

function SignedOutPreview({
  options,
  compact,
}: {
  options: DbPollOption[]
  compact?: boolean
}) {
  return (
    <div>
      <ul className={compact ? 'space-y-2' : 'space-y-2'}>
        {options.map((o) => (
          <li
            key={o.id}
            className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-base text-foreground"
          >
            {o.label}
          </li>
        ))}
      </ul>
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
          compact ? 'mt-4' : 'mt-6'
        }`}
      >
        <p className="text-sm text-muted-foreground">Sign in to cast your vote.</p>
        <div className="flex gap-2">
          <Button asChild variant="outline" data-testid="poll-signin">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild data-testid="poll-join">
            <Link to="/membership">Join the community</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
