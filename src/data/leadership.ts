/**
 * Interim Leadership Team roster (May 2026).
 *
 * Static, hand-maintained list. Update this file when seats fill or leaders
 * rotate. Photos live in `/public/team/` and are referenced relative to the
 * public root. Vacancies are surfaced on /leadership with a "Volunteer" CTA
 * so the page doubles as a recruitment surface.
 *
 * If/when this needs admin-editing through the UI, this is the natural
 * shape to migrate into a `leadership_seats` table — same fields, plus
 * `position` for ordering.
 */

export type LeadershipSeat = {
  /** Stable slug used as a React key. */
  slug: string
  /** Display name, or `null` when the seat is vacant. */
  name: string | null
  /** One or more titles. Multi-title supports e.g. "Vice President · Acting Treasurer". */
  titles: ReadonlyArray<string>
  /** Public functional grouping for section headings. */
  group:
    | 'executive'
    | 'treasury'
    | 'operations'
    | 'community_welfare'
    | 'youth'
    | 'secretariat'
  /** Relative public path to headshot, or null to render initials/placeholder. */
  photoSrc: string | null
  /** Optional short blurb (kept brief; full bios can come later). */
  blurb?: string
}

export const LEADERSHIP_GROUP_LABEL: Record<LeadershipSeat['group'], string> = {
  executive: 'Executive',
  treasury: 'Treasury',
  operations: 'Operations & Facilitators',
  community_welfare: 'Community Welfare',
  youth: 'Youth Representatives',
  secretariat: 'Secretariat',
}

/** Order in which groups appear on the page. */
export const LEADERSHIP_GROUP_ORDER: ReadonlyArray<LeadershipSeat['group']> = [
  'executive',
  'treasury',
  'operations',
  'community_welfare',
  'youth',
  'secretariat',
]

export const LEADERSHIP_SEATS: ReadonlyArray<LeadershipSeat> = [
  {
    slug: 'brenda-kariuki',
    name: 'Brenda Kariuki',
    titles: ['President / Chairperson'],
    group: 'executive',
    photoSrc: '/team/brenda-kariuki.jpg',
  },
  {
    slug: 'patrick-gitu',
    name: 'Patrick Gitu',
    titles: ['Vice President', 'Acting Treasurer'],
    group: 'executive',
    photoSrc: '/team/patrick-gitu.jpg',
  },
  {
    slug: 'treasurer-co-lead-vacant',
    name: null,
    titles: ['Treasurer Co-Lead'],
    group: 'treasury',
    photoSrc: null,
  },
  {
    slug: 'godfrey-maseno',
    name: 'Godfrey Maseno',
    titles: ['Operations / Facilitators Co-Lead'],
    group: 'operations',
    photoSrc: '/team/godfrey-maseno.jpg',
  },
  {
    slug: 'laureen-murangiri',
    name: 'Laureen Murangiri',
    titles: ['Operations / Facilitators'],
    group: 'operations',
    photoSrc: '/team/laureen-murangiri.jpg',
  },
  {
    slug: 'beverly-sande',
    name: 'Dr. Beverly Sande',
    titles: ['Community Welfare Lead'],
    group: 'community_welfare',
    photoSrc: '/team/beverly-sande.jpg',
  },
  {
    slug: 'community-welfare-co-lead-vacant',
    name: null,
    titles: ['Community Welfare Co-Lead'],
    group: 'community_welfare',
    photoSrc: null,
  },
  {
    slug: 'michelle-mwaura',
    name: 'Michelle Mwaura',
    titles: ['Youth Representative'],
    group: 'youth',
    photoSrc: '/team/michelle-mwaura.jpg',
  },
  {
    slug: 'youth-rep-co-lead-vacant',
    name: null,
    titles: ['Youth Representative (Co-Lead)'],
    group: 'youth',
    photoSrc: null,
  },
  {
    slug: 'secretary-vacant',
    name: null,
    titles: ['Secretary'],
    group: 'secretariat',
    photoSrc: null,
  },
  {
    slug: 'co-secretary-vacant',
    name: null,
    titles: ['Co-Secretary'],
    group: 'secretariat',
    photoSrc: null,
  },
]

/** Helpers. */
export function initialsForName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => !/^(dr|mr|mrs|ms|prof)\.?$/i.test(p))
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function seatsByGroup(): Array<{
  group: LeadershipSeat['group']
  label: string
  seats: ReadonlyArray<LeadershipSeat>
}> {
  return LEADERSHIP_GROUP_ORDER.map((group) => ({
    group,
    label: LEADERSHIP_GROUP_LABEL[group],
    seats: LEADERSHIP_SEATS.filter((s) => s.group === group),
  })).filter((g) => g.seats.length > 0)
}
