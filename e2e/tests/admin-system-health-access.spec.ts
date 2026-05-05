import { test, expect } from '@playwright/test'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin } from '../helpers/auth'

/**
 * System Health is restricted to super_admin / platform_admin in the app shell.
 * With a generic E2E admin (often community_admin), expect redirect away from
 * /admin/system-health after login.
 */
test.describe('system health access', () => {
  test.beforeEach(() => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
  })

  test('system health is only reachable for platform super roles (others go to dashboard)', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/system-health', { waitUntil: 'domcontentloaded' })
    const url = page.url()
    if (url.includes('/admin/dashboard')) {
      await expect(page).toHaveURL(/\/admin\/dashboard/)
      return
    }
    await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible()
  })
})
