/**
 * Official KIGH treasury & support handles — the single source of truth.
 *
 * `/support` ("Ways to support KIGH") renders these as cards, and internal
 * KIGH fundraisers resolve the same list at render time so a handle change
 * here lands on every surface at once. Nothing snapshots these values into
 * a row: a retired handle must never keep collecting money from an old
 * fundraiser page.
 *
 * Retire a handle by flipping `active` to false rather than deleting it —
 * the record stays available for treasury history while every public
 * surface stops offering it.
 */
export interface KighSupportOption {
  provider: string
  label: string
  handle: string
  /** Exact text placed on the clipboard by the copy control. */
  copy: string
  href: string
  openLabel: string
  active: boolean
}

export const KIGH_SUPPORT_OPTIONS: readonly KighSupportOption[] = [
  {
    provider: 'Cash App',
    label: 'KIGH Cash App',
    handle: '$KighTreasurer',
    copy: '$KighTreasurer',
    href: 'https://cash.app/$KighTreasurer',
    openLabel: 'Open Cash App',
    active: true,
  },
  {
    provider: 'Venmo',
    label: 'Venmo',
    handle: '@KIGH_Treasurer',
    copy: '@KIGH_Treasurer',
    href: 'https://venmo.com/u/KIGH_Treasurer',
    openLabel: 'Open Venmo',
    active: true,
  },
  {
    provider: 'PayPal',
    label: 'PayPal',
    handle: '@KighTreasurer',
    copy: '@KighTreasurer',
    href: 'https://www.paypal.com/paypalme/KighTreasurer',
    openLabel: 'Open PayPal',
    active: true,
  },
] as const

/** Handles that may be shown publicly right now. */
export function activeKighSupportOptions(): KighSupportOption[] {
  return KIGH_SUPPORT_OPTIONS.filter((option) => option.active)
}

export function hasActiveKighSupportOptions(): boolean {
  return activeKighSupportOptions().length > 0
}
