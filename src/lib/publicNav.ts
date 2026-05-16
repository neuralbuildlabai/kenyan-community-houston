/**
 * Single source of truth for the public site navigation.
 *
 * Header.tsx reads `PRIMARY_NAV` for the desktop top bar and
 * `MORE_NAV_GROUPS` for the grouped More dropdown / the mobile
 * sheet. Footer mirrors these where appropriate.
 *
 * May 2026 premium UX cleanup: surface Community Chat directly in
 * the primary nav (it is the highest-value member entry point) and
 * group secondary destinations by visitor intent. Calendar and
 * Gallery move into More to keep the top bar to four primary tabs.
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
 * Top-level desktop nav. Keep this list short — four items leaves
 * room for the More menu, the Submit Event CTA, and the Login link
 * affordance on a 1280px viewport.
 *
 * Community Chat lives here on purpose: the May 2026 cleanup
 * surfaced it as a top-level destination so members never have to
 * hunt through More to ask the community a question.
 */
export const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { to: '/events', label: 'Events' },
  { to: '/chat', label: 'Community Chat' },
  { to: '/resources', label: 'Resources' },
  { to: '/businesses', label: 'Businesses' },
]

/**
 * Secondary nav, grouped by visitor intent so the More dropdown
 * scans cleanly on desktop and reads as logical sections in the
 * mobile sheet.
 */
export const MORE_NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    heading: 'Community',
    items: [
      { to: '/community-feed', label: 'Community Feed' },
      { to: '/calendar', label: 'Calendar' },
      { to: '/community-groups', label: 'Community Groups' },
      { to: '/gallery', label: 'Gallery' },
      { to: '/gallery/submit', label: 'Submit photos' },
    ],
  },
  {
    heading: 'Programs',
    items: [
      { to: '/membership', label: 'Membership' },
      { to: '/sports-youth', label: 'Sports & Youth' },
      { to: '/serve', label: 'Call to Serve' },
      { to: '/community-support', label: 'Community Support' },
    ],
  },
  {
    heading: 'About KIGH',
    items: [
      { to: '/new-to-houston', label: 'New to Houston' },
      { to: '/governance', label: 'Governance' },
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
      { to: '/support', label: 'Support KIGH' },
    ],
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
