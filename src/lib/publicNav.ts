/**
 * Single source of truth for the public site navigation.
 *
 * Header.tsx reads `PRIMARY_NAV` for the desktop top bar and
 * `MORE_NAV_GROUPS` for the grouped More dropdown / the mobile
 * sheet. Footer mirrors these where appropriate.
 *
 * Production-readiness UX run (May 2026): the previous header
 * exposed 6 unranked top-level tabs and a flat list of 9 secondary
 * items in More. We trimmed primary nav to 5 high-traffic
 * destinations and grouped the long tail by intent.
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

/**
 * Top-level desktop nav. Keep this list short — five items leaves
 * room for the More menu, the Submit Event CTA, and the Login link
 * affordance without crowding the header on a 1280px viewport.
 */
export const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { to: '/events', label: 'Events' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/businesses', label: 'Businesses' },
  { to: '/community-support', label: 'Community Support' },
  { to: '/gallery', label: 'Gallery' },
]

/**
 * Secondary nav, grouped by visitor intent so the More dropdown
 * scans cleanly on desktop and reads as logical sections in the
 * mobile sheet.
 */
export const MORE_NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    heading: 'Programs',
    items: [
      { to: '/sports-youth', label: 'Sports & Youth' },
      { to: '/membership', label: 'Membership' },
      { to: '/serve', label: 'Call to Serve' },
    ],
  },
  {
    heading: 'Discover',
    items: [
      { to: '/community-groups', label: 'Community Groups' },
      { to: '/resources', label: 'Resources' },
      { to: '/new-to-houston', label: 'New to Houston' },
    ],
  },
  {
    heading: 'About KIGH',
    items: [
      { to: '/governance', label: 'Governance' },
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Support',
    items: [{ to: '/support', label: 'Support KIGH' }],
  },
]

/** Flat list of every secondary destination (used by the mobile drawer). */
export const MORE_NAV_FLAT: ReadonlyArray<NavItem> = MORE_NAV_GROUPS.flatMap(
  (g) => g.items
)

/** Every destination represented anywhere in the public nav. */
export const ALL_PUBLIC_NAV: ReadonlyArray<NavItem> = [
  ...PRIMARY_NAV,
  ...MORE_NAV_FLAT,
]
