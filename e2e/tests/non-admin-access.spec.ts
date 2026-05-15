import { test, expect } from '@playwright/test'

/**
 * The hardened ProtectedRoute requires both `isAdmin` (session) AND
 * an elevated profiles.role. A non-authenticated visitor must be
 * redirected to /login (with return path) when hitting any /admin/* route.
 *
 * We don't have a "non-admin authenticated" fixture by default in
 * this repo, so we assert the unauth case here — that alone catches
 * a regression where the guard was effectively "any authed user".
 *
 * Use admin-auth.spec.ts to exercise the positive path with
 * E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD.
 */

const ADMIN_PROTECTED = [
  '/admin',
  '/admin/dashboard',
  '/admin/calendar',
  '/admin/resources',
  '/admin/members',
  '/admin/community-groups',
  '/admin/announcements',
  '/admin/businesses',
  '/admin/fundraisers',
  '/admin/gallery',
  '/admin/submissions',
  '/admin/contacts',
  '/admin/service-interests',
  '/admin/media-submissions',
  '/admin/settings',
  '/admin/users',
  '/admin/analytics',
  '/admin/feed',
  '/admin/system-health',
] as const

for (const route of ADMIN_PROTECTED) {
  test(`unauthenticated visitor is redirected from ${route} to /login`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })
}
