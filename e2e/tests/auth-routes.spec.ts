import { test, expect } from '@playwright/test'

test.describe('shared login', () => {
  test('/login shows email and password; Google hidden when VITE_ENABLE_GOOGLE_AUTH is false', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toHaveCount(0)
    await expect(page.getByText(/Admin login/i)).toHaveCount(0)
  })

  test('/admin/login shows the same shared login UI without Google', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByText(/Sign in to your account/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toHaveCount(0)
  })
})

test.describe('auth callback', () => {
  test('shows recovery link when session cannot be established', async ({ page }) => {
    await page.goto('/auth/callback')
    await expect(page.getByRole('link', { name: /Back to sign in/i })).toBeVisible({ timeout: 25_000 })
  })
})
