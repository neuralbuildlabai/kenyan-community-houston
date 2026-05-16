import { test, expect } from '@playwright/test'
import {
  PRIMARY_NAV,
  MORE_NAV_GROUPS,
  MORE_NAV_FLAT,
  ALL_PUBLIC_NAV,
  COMMUNITY_MENU,
  RESOURCES_MENU,
  JOIN_MEMBERSHIP_ITEM,
} from '../../src/lib/publicNav'

/**
 * Contract tests for the public navigation. Asserts the shape of the
 * config so destinations stay deduped and every required route stays
 * reachable from the header (primary links, dropdowns, or More).
 */
const REQUIRED_DESTINATIONS = [
  '/events',
  '/calendar',
  '/businesses',
  '/community-support',
  '/sports-youth',
  '/gallery',
  '/gallery/submit',
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
  test('PRIMARY_NAV lists direct bar links (Events + Gallery)', () => {
    expect(PRIMARY_NAV.map((i) => i.to)).toEqual(['/events', '/gallery'])
  })

  test('COMMUNITY_MENU and RESOURCES_MENU have unique routes', () => {
    const tos = [...COMMUNITY_MENU, ...RESOURCES_MENU].map((i) => i.to)
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

  test('no destination is duplicated across bar, dropdowns, join, and more', () => {
    const bar = [...PRIMARY_NAV.map((i) => i.to), JOIN_MEMBERSHIP_ITEM.to]
    const drops = [...COMMUNITY_MENU, ...RESOURCES_MENU].map((i) => i.to)
    const more = MORE_NAV_FLAT.map((i) => i.to)
    const all = [...bar, ...drops, ...more]
    expect(new Set(all).size).toBe(all.length)
  })

  test('top-tier admin destinations are NOT in the public nav', () => {
    const admin = [
      '/admin',
      '/admin/dashboard',
      '/admin/system-health',
      '/admin/chat',
      '/admin/event-comments',
      '/admin/invites',
      '/admin/feed',
      '/admin/volunteers',
    ]
    const allTos = ALL_PUBLIC_NAV.map((i) => i.to)
    for (const a of admin) {
      expect(allTos).not.toContain(a)
    }
  })
})
