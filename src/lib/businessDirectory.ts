/** Tiers eligible for the spotlight row at the top of the public directory. */
export const SPOTLIGHT_TIERS: ReadonlyArray<string> = ['sponsor', 'featured', 'verified']

/** How many spotlight listings the directory hero shows. */
export const SPOTLIGHT_LIMIT = 3

/** The DB carries tiers the `BusinessTier` union does not list (e.g. 'basic'), so keep this loose. */
type DirectoryListing = { id: string; tier: string }

/**
 * Split published listings into the spotlight row and the directory below it.
 *
 * Every listing must land in exactly one bucket. An earlier version excluded
 * *all* spotlight-tier listings from `rest` while rendering only the first
 * three, so a 4th verified/featured business (e.g. the Event Planning listing)
 * disappeared from the directory entirely.
 */
export function partitionDirectoryListings<T extends DirectoryListing>(
  items: readonly T[],
  limit: number = SPOTLIGHT_LIMIT
): { featured: T[]; rest: T[] } {
  const cap = Math.max(0, limit)
  const featured = items.filter((b) => SPOTLIGHT_TIERS.includes(b.tier)).slice(0, cap)
  const featuredIds = new Set(featured.map((b) => b.id))
  return { featured, rest: items.filter((b) => !featuredIds.has(b.id)) }
}
