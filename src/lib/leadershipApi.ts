import { supabase } from '@/lib/supabase'
import type { LeadershipSeat } from '@/data/leadership'
import { LEADERSHIP_GROUP_LABEL, LEADERSHIP_GROUP_ORDER, LEADERSHIP_SEATS } from '@/data/leadership'

export type DbLeadershipSeat = {
  id: string
  slug: string
  name: string | null
  titles: string[]
  seat_group: LeadershipSeat['group']
  photo_url: string | null
  photo_storage_path: string | null
  blurb: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Convert a DB row to the shape the public page consumes. */
export function toPublicSeat(row: DbLeadershipSeat): LeadershipSeat {
  return {
    slug: row.slug,
    name: row.name,
    titles: row.titles,
    group: row.seat_group,
    photoSrc: row.photo_url,
    blurb: row.blurb ?? undefined,
  }
}

/**
 * Fetch active seats for the public page. Falls back to the hard-coded array
 * if the DB call fails OR returns zero rows. Always returns at least the
 * static roster so the page never renders empty.
 */
export async function fetchPublicLeadership(): Promise<{
  seats: ReadonlyArray<LeadershipSeat>
  source: 'db' | 'fallback'
}> {
  const { data, error } = await supabase
    .from('leadership_seats')
    .select('*')
    .eq('is_active', true)
    .order('seat_group')
    .order('display_order')
    .order('created_at')

  if (error || !data || data.length === 0) {
    return { seats: LEADERSHIP_SEATS, source: 'fallback' }
  }
  return { seats: data.map((r) => toPublicSeat(r as DbLeadershipSeat)), source: 'db' }
}

/** Group seats by `seat_group`, preserving LEADERSHIP_GROUP_ORDER. */
export function groupSeatsForDisplay(seats: ReadonlyArray<LeadershipSeat>) {
  return LEADERSHIP_GROUP_ORDER.map((group) => ({
    group,
    label: LEADERSHIP_GROUP_LABEL[group],
    seats: seats.filter((s) => s.group === group),
  })).filter((g) => g.seats.length > 0)
}

/** Admin-side: fetch ALL seats (including inactive) for management UI. */
export async function fetchAllLeadershipSeats(): Promise<DbLeadershipSeat[]> {
  const { data, error } = await supabase
    .from('leadership_seats')
    .select('*')
    .order('seat_group')
    .order('display_order')
    .order('created_at')

  if (error) throw error
  return (data ?? []) as DbLeadershipSeat[]
}
