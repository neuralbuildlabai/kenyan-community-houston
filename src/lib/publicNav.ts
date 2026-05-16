/**
 * Public site navigation — Pass 1 premium header structure.
 *
 * Center bar: Events, Community (dropdown), Resources (dropdown),
 * Business Directory, Gallery, More.
 * Right: Join, Submit event, Login.
 *
 * `/chat` appears in both Community and Resources labels; ALL_PUBLIC_NAV
 * dedupes by route. Tests allow that single intentional overlap.
 */

export interface NavItem {
  to: string
  label: string
}

export interface NavGroup {
  heading: string
  items: ReadonlyArray<NavItem>
}

/** Community dropdown (per Pass 1 spec). */
export const COMMUNITY_MENU: ReadonlyArray<NavItem> = [
  { to: '/chat', label: 'Community Chat' },
  { to: '/community-groups', label: 'Community Groups' },
  { to: '/new-to-houston', label: 'New to Houston' },
  { to: '/serve/apply', label: 'Volunteer' },
  { to: '/membership', label: 'Membership' },
]

/** Resources dropdown (per Pass 1 spec). */
export const RESOURCES_MENU: ReadonlyArray<NavItem> = [
  { to: '/announcements', label: 'Announcements' },
  { to: '/community-support', label: 'Community Support' },
  { to: '/chat', label: 'Ask the Community' },
  { to: '/serve', label: 'Call to Serve' },
  { to: '/resources', label: 'Resources' },
]

/** Direct center-nav links (excluding dropdown triggers). */
export const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { to: '/events', label: 'Events' },
  { to: '/businesses', label: 'Business Directory' },
  { to: '/gallery', label: 'Gallery' },
]

export const JOIN_MEMBERSHIP_ITEM: NavItem = {
  to: '/membership',
  label: 'Join',
}

export const MORE_NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    heading: 'Calendar & feed',
    items: [
      { to: '/calendar', label: 'Calendar' },
      { to: '/community-feed', label: 'Community Feed' },
    ],
  },
  {
    heading: 'Programs',
    items: [
      { to: '/sports-youth', label: 'Sports & Youth' },
    ],
  },
  {
    heading: 'Get involved',
    items: [
      { to: '/support', label: 'Support KIGH' },
      { to: '/events/submit', label: 'Submit an event' },
      { to: '/gallery/submit', label: 'Submit photos' },
      { to: '/announcements/submit', label: 'Submit an announcement' },
      { to: '/businesses/submit', label: 'List your business' },
      { to: '/community-support/submit', label: 'Submit a fundraiser' },
      { to: '/community-groups/submit', label: 'Submit a community group' },
    ],
  },
  {
    heading: 'About KIGH',
    items: [
      { to: '/about', label: 'About' },
      { to: '/governance', label: 'Governance' },
      { to: '/contact', label: 'Contact' },
      { to: '/privacy', label: 'Privacy' },
      { to: '/terms', label: 'Terms' },
    ],
  },
]

export const MORE_NAV_FLAT: ReadonlyArray<NavItem> = MORE_NAV_GROUPS.flatMap((g) => g.items)

function dedupeByTo(items: ReadonlyArray<NavItem>): NavItem[] {
  const seen = new Set<string>()
  const out: NavItem[] = []
  for (const i of items) {
    if (seen.has(i.to)) continue
    seen.add(i.to)
    out.push(i)
  }
  return out
}

/** Every destination reachable from the public header (deduped by `to`). */
export const ALL_PUBLIC_NAV: ReadonlyArray<NavItem> = dedupeByTo([
  ...PRIMARY_NAV,
  JOIN_MEMBERSHIP_ITEM,
  ...COMMUNITY_MENU,
  ...RESOURCES_MENU,
  ...MORE_NAV_FLAT,
])

/** Routes that may appear under more than one label (deduped in ALL_PUBLIC_NAV). */
export const NAV_ROUTE_DEDUPE_EXCEPTIONS: ReadonlySet<string> = new Set(['/chat', '/membership'])
