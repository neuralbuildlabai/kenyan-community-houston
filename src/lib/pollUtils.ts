import type { DbPoll, PollWithOptions } from '@/lib/pollsApi'

/** True when `closes_at` is set and in the past. */
export function isPollClosed(poll: Pick<DbPoll, 'closes_at'>, now: Date = new Date()): boolean {
  if (!poll.closes_at) return false
  const t = new Date(poll.closes_at).getTime()
  return !Number.isNaN(t) && t <= now.getTime()
}

/** True when a poll is eligible for the homepage featured widget. */
export function isPollFeaturedPublicly(
  poll: Pick<DbPoll, 'is_active' | 'is_featured' | 'closes_at'>,
  now: Date = new Date()
): boolean {
  return poll.is_active && poll.is_featured && !isPollClosed(poll, now)
}

/** Friendly closing date for poll UI. */
export function formatPollClosesAt(closesAt: string): string {
  const d = new Date(closesAt)
  if (Number.isNaN(d.getTime())) return closesAt
  return d.toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export type PublicPollsList = {
  open: PollWithOptions[]
  closed: PollWithOptions[]
}

/**
 * Split active public polls into open vs closed buckets.
 * Featured polls sort first within each bucket.
 */
export function partitionPublicPolls(
  polls: PollWithOptions[],
  now: Date = new Date()
): PublicPollsList {
  const open: PollWithOptions[] = []
  const closed: PollWithOptions[] = []

  for (const p of polls) {
    if (isPollClosed(p, now)) closed.push(p)
    else open.push(p)
  }

  const sortFeaturedFirst = (a: PollWithOptions, b: PollWithOptions) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }

  open.sort(sortFeaturedFirst)
  closed.sort(sortFeaturedFirst)

  return { open, closed }
}
