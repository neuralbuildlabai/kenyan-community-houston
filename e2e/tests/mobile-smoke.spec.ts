import { test, expect } from '@playwright/test'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin } from '../helpers/auth'

test.use({ viewport: { width: 390, height: 844 } })

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth > el.clientWidth + 2
  })
  expect(overflow, 'document scrollWidth should not exceed viewport').toBe(false)
}

test.describe('mobile smoke', () => {
  test('home and resources fit viewport', async ({ page }) => {
    await page.goto('/')
    await expectNoHorizontalOverflow(page)
    await page.goto('/resources')
    await expectNoHorizontalOverflow(page)
  })

  test('gallery submit fits viewport', async ({ page }) => {
    await page.goto('/gallery/submit')
    await expectNoHorizontalOverflow(page)
  })

  test('mobile header shows Login without opening menu', async ({ page }) => {
    await page.goto('/membership')
    await expect(page.getByTestId('header-login-mobile')).toBeVisible()
    await expect(page.getByTestId('header-account')).toHaveCount(0)
  })

  test('member login and profile route', async ({ page }) => {
    await page.goto('/login')
    await expectNoHorizontalOverflow(page)
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shared login layout', async ({ page }) => {
    await page.goto('/login')
    await expectNoHorizontalOverflow(page)
  })

  test('admin resources shows menu and logout in drawer when admin env set', async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
    await loginAsAdmin(page)
    await page.goto('/admin/resources')
    await expect(page.getByRole('button', { name: 'Open admin menu' })).toBeVisible()
    await page.getByRole('button', { name: 'Open admin menu' }).click()
    await expect(page.getByRole('button', { name: 'Logout' }).first()).toBeVisible()
  })
})
