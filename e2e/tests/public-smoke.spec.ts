import { test, expect } from '@playwright/test'
import { expectNo404, expectNoPermanentLoading } from '../helpers/assertions'

const ROUTES = [
  '/',
  '/events',
  '/calendar',
  '/resources',
  '/community-groups',
  '/community-groups/submit',
  '/serve',
  '/serve/apply',
  '/membership',
  '/support',
  '/governance',
  '/new-to-houston',
  '/businesses',
  '/businesses/submit',
  '/announcements',
  '/community-support',
  '/gallery',
  '/terms',
  '/privacy',
  '/disclaimer',
  '/contact',
  '/login',
  '/chat',
] as const

for (const route of ROUTES) {
  test.describe(`public smoke: ${route}`, () => {
    test(`loads ${route}`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))

      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expectNoPermanentLoading(page)
      await expectNo404(page)

      await expect(page.locator('body')).toBeVisible()
      expect(errors, `pageerror on ${route}: ${errors.join('; ')}`).toEqual([])
    })
  })
}
