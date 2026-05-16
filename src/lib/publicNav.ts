/**
 * Single source of truth for the public site navigation.
 *
 * Header: Events, Community (dropdown), Resources (dropdown), Gallery,
 * More (grouped), Join → /membership. Submit-event and login stay as
 * actions outside the primary list where space allows.
 */

export interface NavItem {
  to: string
  label: string
}

export interface NavGroup {
  /** Label rendered above the group inside More. */
  heading: string
  items: ReadonlyArray<NavItem>
}

/** Community dropdown — matches product copy for the header. */
export const COMMUNITY_MENU: ReadonlyArray<NavItem> = [
  { to: '/chat', label: 'Community Chat' },
  { to: '/community-feed', label: 'Community Feed' },
  { to: '/community-groups', label: 'Community Groups' },
  { to: '/new-to-houston', label: 'New to Houston' },
  { to: '/serve', label: 'Volunteer' },
]

/** Resources dropdown — directory, governance, contact. */
export const RESOURCES_MENU: ReadonlyArray<NavItem> = [
  { to: '/resources', label: 'Resources' },
  { to: '/businesses', label: 'Business Directory' },
  { to: '/governance', label: 'Governance' },
  { to: '/contact', label: 'Contact' },
]

/**
 * Top bar direct links (Events + Gallery). Join uses /membership but is
 * rendered as a button in Header — still counted in ALL_PUBLIC_NAV.
 */
export const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { to: '/events', label: 'Events' },
  { to: '/gallery', label: 'Gallery' },
]

export const JOIN_MEMBERSHIP_ITEM: NavItem = {
  to: '/membership',
  label: 'Join',
}

/**
 * Secondary destinations in the More menu — everything else that must
 * stay reachable without duplicating Community / Resources dropdowns.
 */
export const MORE_NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    heading: 'Calendar & news',
    items: [
      { to: '/calendar', label: 'Calendar' },
      { to: '/announcements', label: 'Announcements' },
    ],
  },
  {
    heading: 'Programs',
    items: [
      { to: '/sports-youth', label: 'Sports & Youth' },
      { to: '/community-support', label: 'Community Support' },
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
      { to: '/privacy', label: 'Privacy' },
      { to: '/terms', label: 'Terms' },
    ],
  },
]

export const MORE_NAV_FLAT: ReadonlyArray<NavItem> = MORE_NAV_GROUPS.flatMap(
  (g) => g.items
)

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

/** Every destination represented in the public header (no duplicates). */
export const ALL_PUBLIC_NAV: ReadonlyArray<NavItem> = dedupeByTo([
  ...PRIMARY_NAV,
  JOIN_MEMBERSHIP_ITEM,
  ...COMMUNITY_MENU,
  ...RESOURCES_MENU,
  ...MORE_NAV_FLAT,
])
