/**
 * Public reads for fundraisers and their collection ledger.
 *
 * Every query here names its columns. `select('*')` on `fundraisers` also
 * ships `organizer_contact` — a private detail the submit form collects and
 * no public surface renders — to every visitor's browser, so the public
 * column list below is the one place that decides what leaves the database.
 *
 * Publication is the only gate: `status = 'published'`. Draft, pending,
 * rejected and archived fundraisers are unreachable here, which is also
 * what the RLS policies enforce server-side.
 */
import { supabase } from '@/lib/supabase'
import type { PublicCollectionRow } from '@/lib/fundraiserCollections'
import type { FundraiserVerificationStatus } from '@/lib/types'

/** Columns safe to send to an anonymous visitor. */
export const FUNDRAISER_PUBLIC_COLUMNS = [
  'id',
  'slug',
  'title',
  'category',
  'summary',
  'body',
  'image_url',
  'beneficiary_name',
  'organizer_name',
  'goal_amount',
  'raised_amount',
  'donation_url',
  'funding_mode',
  'donations_closed',
  'is_homepage_featured',
  'payment_reference',
  'collections_updated_at',
  'deadline',
  'verification_status',
  'status',
  'published_at',
].join(', ')

/** Columns anon is granted on `fundraiser_collections` (migration 085). */
export const COLLECTION_PUBLIC_COLUMNS =
  'id, fundraiser_id, received_on, amount, description, entry_type, public_donor_name, created_at, updated_at'

export interface PublicFundraiser {
  id: string
  slug: string
  title: string
  category: string
  summary: string | null
  body: string | null
  image_url: string | null
  beneficiary_name: string
  organizer_name: string | null
  goal_amount: number | null
  raised_amount: number
  donation_url: string | null
  funding_mode: string | null
  donations_closed: boolean | null
  is_homepage_featured: boolean | null
  payment_reference: string | null
  collections_updated_at: string | null
  deadline: string | null
  /** `verification_status` enum (migration 001) — always one of four values. */
  verification_status: FundraiserVerificationStatus
  status: string
  published_at: string | null
}

export async function fetchPublishedFundraisers({
  category,
  search,
}: {
  category?: string
  search?: string
} = {}): Promise<PublicFundraiser[]> {
  let query = supabase
    .from('fundraisers')
    .select(FUNDRAISER_PUBLIC_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (category) query = query.eq('category', category)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data } = await query
  return (data ?? []) as unknown as PublicFundraiser[]
}

export async function fetchPublishedFundraiserBySlug(
  slug: string
): Promise<PublicFundraiser | null> {
  const { data } = await supabase
    .from('fundraisers')
    .select(FUNDRAISER_PUBLIC_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return (data as unknown as PublicFundraiser) ?? null
}

/**
 * The fundraiser an admin pinned to the homepage. `status = 'published'` is
 * re-asserted here rather than trusted from the flag, so unpublishing a
 * featured fundraiser pulls it off the front page immediately — without an
 * admin having to remember to untick the box as well.
 */
export async function fetchHomepageFeaturedFundraiser(): Promise<PublicFundraiser | null> {
  const { data } = await supabase
    .from('fundraisers')
    .select(FUNDRAISER_PUBLIC_COLUMNS)
    .eq('status', 'published')
    .eq('is_homepage_featured', true)
    .order('published_at', { ascending: false })
    .limit(1)
  return ((data ?? [])[0] as unknown as PublicFundraiser) ?? null
}

/**
 * The same page, without the publication filter, so an admin can read a
 * pending or draft fundraiser before approving it.
 *
 * Authorisation is the RLS policy's, not this function's: for anyone but an
 * elevated admin the unpublished row simply is not there, so calling this
 * can never widen what a visitor sees.
 */
export async function fetchFundraiserPreviewBySlug(
  slug: string
): Promise<PublicFundraiser | null> {
  const { data } = await supabase
    .from('fundraisers')
    .select(FUNDRAISER_PUBLIC_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()
  return (data as unknown as PublicFundraiser) ?? null
}

/** Public ledger rows. Donor names appear only where an admin published them. */
export async function fetchPublicCollections(
  fundraiserId: string
): Promise<PublicCollectionRow[]> {
  const { data } = await supabase
    .from('fundraiser_collections')
    .select(COLLECTION_PUBLIC_COLUMNS)
    .eq('fundraiser_id', fundraiserId)
    .order('received_on', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []) as unknown as PublicCollectionRow[]
}
