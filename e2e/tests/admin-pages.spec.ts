import { test, expect } from '@playwright/test'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin } from '../helpers/auth'

const ADMIN_PATHS = [
  '/admin/calendar',
  '/admin/resources',
  '/admin/members',
  '/admin/community-groups',
  '/admin/service-interests',
  '/admin/gallery',
  '/admin/users',
  '/admin/media-submissions',
] as const

test.describe('admin pages', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
    await loginAsAdmin(page)
  })

  for (const path of ADMIN_PATHS) {
    test(`loads ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
  }
})
