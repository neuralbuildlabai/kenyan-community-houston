import { test, expect } from '@playwright/test'
import {
  PRIMARY_NAV,
  MORE_NAV_GROUPS,
  MORE_NAV_FLAT,
  ALL_PUBLIC_NAV,
} from '../../src/lib/publicNav'

/**
 * Contract tests for the public navigation. These don't render the
 * header — they assert the shape of the config so the May 2026 UX
 * cleanup ("five primary tabs, grouped More dropdown") cannot be
 * accidentally regressed by adding ten items to PRIMARY_NAV in a
 * future PR.
 */
const REQUIRED_DESTINATIONS = [
  '/events',
  '/calendar',
  '/businesses',
  '/community-support',
  '/sports-youth',
  '/gallery',
  '/membership',
  '/resources',
  '/community-groups',
  '/new-to-houston',
  '/serve',
  '/support',
  '/governance',
  '/about',
  '/contact',
  '/chat',
  '/community-feed',
] as const

test.describe('public nav config', () => {
  test('PRIMARY_NAV contains 4–6 high-traffic items', () => {
    expect(PRIMARY_NAV.length).toBeGreaterThanOrEqual(4)
    expect(PRIMARY_NAV.length).toBeLessThanOrEqual(6)
  })

  test('PRIMARY_NAV destinations are unique', () => {
    const tos = PRIMARY_NAV.map((i) => i.to)
    expect(new Set(tos).size).toBe(tos.length)
  })

  test('MORE_NAV_GROUPS is grouped (≥2 sections, all sections labelled, no empty groups)', () => {
    expect(MORE_NAV_GROUPS.length).toBeGreaterThanOrEqual(2)
    for (const group of MORE_NAV_GROUPS) {
      expect(group.heading.length).toBeGreaterThan(0)
      expect(group.items.length).toBeGreaterThan(0)
    }
  })

  test('every required destination is reachable from the public nav', () => {
    const allTos = ALL_PUBLIC_NAV.map((i) => i.to)
    for (const dest of REQUIRED_DESTINATIONS) {
      expect(allTos, `${dest} must be reachable from public nav`).toContain(dest)
    }
  })

  test('no destination is duplicated across primary + more', () => {
    const all = [...PRIMARY_NAV.map((i) => i.to), ...MORE_NAV_FLAT.map((i) => i.to)]
    expect(new Set(all).size).toBe(all.length)
  })

  test('top-tier admin destinations are NOT in the public nav', () => {
    const admin = ['/admin', '/admin/dashboard', '/admin/system-health', '/admin/chat', '/admin/event-comments', '/admin/invites', '/admin/feed', '/admin/volunteers']
    const allTos = ALL_PUBLIC_NAV.map((i) => i.to)
    for (const a of admin) {
      expect(allTos).not.toContain(a)
    }
  })
})
