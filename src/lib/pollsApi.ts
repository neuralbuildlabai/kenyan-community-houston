import { supabase } from '@/lib/supabase'
import { isPollFeaturedPublicly } from '@/lib/pollUtils'

/**
 * Polls API — thin wrappers around the `polls`, `poll_options`, `poll_votes`
 * tables and the `kigh_poll_results` / `kigh_my_poll_vote` RPCs introduced
 * in migration 046.
 *
 * Naming conventions match `leadershipApi.ts`. All admin-side mutations
 * assume the caller is `kigh_is_elevated_admin()` — RLS enforces this; the
 * functions just bubble the error up if not.
 */

export type DbPoll = {
  id: string
  slug: string
  question: string
  description: string | null
  is_active: boolean
  is_featured: boolean
  closes_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type DbPollOption = {
  id: string
  poll_id: string
  label: string
  display_order: number
  created_at: string
}

export type PollWithOptions = DbPoll & {
  options: DbPollOption[]
}

export type PollResultRow = {
  option_id: string
  label: string
  display_order: number
  vote_count: number
}

// ─── Public fetchers ──────────────────────────────────────

/**
 * Fetch the single featured + active poll for the landing page widget.
 * Returns null if no poll is currently featured or the query errors.
 *
 * "Featured" = `is_featured = true AND is_active = true`. If multiple
 * polls match, we pick the most recently created — admins can flip the
 * flag on a different poll to switch what shows on the landing page.
 */
/** Fetch a single poll by slug. Respects RLS (active only for public; admins see all). */
export async function fetchPollBySlug(slug: string): Promise<PollWithOptions | null> {
  const { data: poll, error } = await supabase
    .from('polls')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !poll) return null

  const { data: options, error: optErr } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', poll.id)
    .order('display_order')
    .order('created_at')

  if (optErr) return null
  return { ...(poll as DbPoll), options: (options ?? []) as DbPollOption[] }
}

/** All active polls for the public index page. */
export async function fetchActivePolls(): Promise<PollWithOptions[]> {
  const { data: polls, error } = await supabase
    .from('polls')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (error || !polls || polls.length === 0) return []

  const { data: options, error: optErr } = await supabase
    .from('poll_options')
    .select('*')
    .in(
      'poll_id',
      polls.map((p) => p.id),
    )
    .order('display_order')
    .order('created_at')

  if (optErr) return []

  const byPoll = new Map<string, DbPollOption[]>()
  for (const o of (options ?? []) as DbPollOption[]) {
    const arr = byPoll.get(o.poll_id) ?? []
    arr.push(o)
    byPoll.set(o.poll_id, arr)
  }

  return (polls as DbPoll[]).map((p) => ({ ...p, options: byPoll.get(p.id) ?? [] }))
}

export async function fetchFeaturedPoll(): Promise<PollWithOptions | null> {
  const { data: polls, error } = await supabase
    .from('polls')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error || !polls || polls.length === 0) return null

  const poll = (polls as DbPoll[]).find((p) => isPollFeaturedPublicly(p))
  if (!poll) return null

  const { data: options, error: optErr } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', poll.id)
    .order('display_order')
    .order('created_at')

  if (optErr) return null
  return { ...poll, options: (options ?? []) as DbPollOption[] }
}

/**
 * Returns the option_id the current user voted for in this poll, or null
 * if they haven't voted (or aren't signed in).
 */
export async function fetchMyPollVote(pollId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('kigh_my_poll_vote', {
    p_poll_id: pollId,
  })
  if (error) return null
  return (data as string | null) ?? null
}

/**
 * Fetch per-option vote counts. Throws if the user is not yet allowed to
 * see results — frontend should call `fetchMyPollVote` first and only
 * call this once a vote exists (or the poll has closed).
 */
export async function fetchPollResults(pollId: string): Promise<PollResultRow[]> {
  const { data, error } = await supabase.rpc('kigh_poll_results', {
    p_poll_id: pollId,
  })
  if (error) throw error
  return ((data ?? []) as PollResultRow[]).map((r) => ({
    ...r,
    vote_count: Number(r.vote_count), // bigint → number for the UI
  }))
}

/** Cast a vote. Will fail under RLS if the user isn't signed in,
 *  the poll isn't active, or they've already voted. */
export async function castPollVote(pollId: string, optionId: string): Promise<void> {
  const { data: userResp } = await supabase.auth.getUser()
  const userId = userResp?.user?.id
  if (!userId) throw new Error('You must be signed in to vote.')

  const { error } = await supabase.from('poll_votes').insert({
    poll_id: pollId,
    option_id: optionId,
    user_id: userId,
  })
  if (error) throw error
}

// ─── Admin fetchers + mutators ────────────────────────────

/** Admin: every poll, with its options, newest first. */
export async function fetchAllPollsForAdmin(): Promise<PollWithOptions[]> {
  const { data: polls, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!polls || polls.length === 0) return []

  const { data: options, error: optErr } = await supabase
    .from('poll_options')
    .select('*')
    .in(
      'poll_id',
      polls.map((p) => p.id),
    )
    .order('display_order')
    .order('created_at')
  if (optErr) throw optErr

  const byPoll = new Map<string, DbPollOption[]>()
  for (const o of (options ?? []) as DbPollOption[]) {
    const arr = byPoll.get(o.poll_id) ?? []
    arr.push(o)
    byPoll.set(o.poll_id, arr)
  }

  return (polls as DbPoll[]).map((p) => ({ ...p, options: byPoll.get(p.id) ?? [] }))
}

export type CreatePollInput = {
  slug: string
  question: string
  description?: string | null
  options: { label: string }[] // 2+ options expected
  is_active?: boolean
  is_featured?: boolean
  closes_at?: string | null
}

/**
 * Create a poll + its options. Done as two sequential inserts because
 * we don't have a dedicated RPC. If the options insert fails, we delete
 * the just-created poll to avoid an orphan with zero options.
 */
export async function createPoll(input: CreatePollInput): Promise<PollWithOptions> {
  const { data: poll, error } = await supabase
    .from('polls')
    .insert({
      slug: input.slug,
      question: input.question,
      description: input.description ?? null,
      is_active: input.is_active ?? true,
      is_featured: input.is_featured ?? false,
      closes_at: input.closes_at ?? null,
    })
    .select('*')
    .single()
  if (error || !poll) throw error ?? new Error('Failed to create poll.')

  const optionRows = input.options.map((o, idx) => ({
    poll_id: (poll as DbPoll).id,
    label: o.label,
    display_order: (idx + 1) * 10,
  }))

  const { data: inserted, error: optErr } = await supabase
    .from('poll_options')
    .insert(optionRows)
    .select('*')

  if (optErr) {
    // Roll back the poll insert so we don't leave an orphan.
    await supabase.from('polls').delete().eq('id', (poll as DbPoll).id)
    throw optErr
  }

  return { ...(poll as DbPoll), options: (inserted ?? []) as DbPollOption[] }
}

export type UpdatePollInput = {
  id: string
  question?: string
  description?: string | null
  is_active?: boolean
  is_featured?: boolean
  closes_at?: string | null
}

export async function updatePoll(input: UpdatePollInput): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (input.question !== undefined) patch.question = input.question
  if (input.description !== undefined) patch.description = input.description
  if (input.is_active !== undefined) patch.is_active = input.is_active
  if (input.is_featured !== undefined) patch.is_featured = input.is_featured
  if (input.closes_at !== undefined) patch.closes_at = input.closes_at

  const { error } = await supabase.from('polls').update(patch).eq('id', input.id)
  if (error) throw error
}

export async function deletePoll(pollId: string): Promise<void> {
  // ON DELETE CASCADE on poll_options + poll_votes handles cleanup.
  const { error } = await supabase.from('polls').delete().eq('id', pollId)
  if (error) throw error
}

/**
 * Toggle the featured flag. When turning ON, also clears the flag on every
 * other poll so the "one featured at a time" invariant holds. Done as two
 * separate updates because we don't have a transactional RPC; under
 * concurrent toggles the worst case is briefly two featured rows, and the
 * landing-page fetcher would just pick the most recent.
 */
export async function setPollFeatured(pollId: string, featured: boolean): Promise<void> {
  if (featured) {
    const { error: clearErr } = await supabase
      .from('polls')
      .update({ is_featured: false })
      .eq('is_featured', true)
      .neq('id', pollId)
    if (clearErr) throw clearErr
  }
  const { error } = await supabase
    .from('polls')
    .update({ is_featured: featured })
    .eq('id', pollId)
  if (error) throw error
}

/** Generate a slug candidate from a poll question. Admin can override. */
export function suggestPollSlug(question: string): string {
  return question
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
