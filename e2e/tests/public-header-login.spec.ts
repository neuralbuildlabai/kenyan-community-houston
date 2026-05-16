import { test, expect } from '@playwright/test'

test.describe('public header login visibility', () => {
  test('desktop header shows Login for logged-out visitors', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const login = page.getByTestId('header-login')
    await expect(login).toBeVisible()
    await expect(login).toHaveAttribute('href', '/login')
  })

  test('mobile header and menu show Login for logged-out visitors', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/gallery', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('header-login-mobile')).toBeVisible()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByTestId('header-login-menu')).toBeVisible()
    await expect(page.getByTestId('header-login-menu')).toHaveAttribute('href', '/login')
  })

  test('public nav does not expose admin dashboard routes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const adminLinks = await page
      .locator('header a[href^="/admin"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href))
    expect(adminLinks).toEqual([])
  })
})
