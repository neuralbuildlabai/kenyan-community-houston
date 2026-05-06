import { test, expect } from '@playwright/test'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin } from '../helpers/auth'

test.describe('admin auth', () => {
  test.beforeEach(() => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
  })

  test('login and dashboard', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Kenyan Community Houston' })).toBeVisible()
    await loginAsAdmin(page)
    await expect(page.getByRole('link', { name: /Calendar/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Contact messages/i })).toBeVisible()
  })

  test('logout is visible and returns to public homepage', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByRole('button', { name: 'Logout' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Logout' }).first().click()
    await expect(page).not.toHaveURL(/\/admin/)
    await expect(page.getByRole('heading', { level: 1, name: /Your community hub for life in Houston/i })).toBeVisible()
  })
})
