import { test, expect } from '@playwright/test'

/**
 * Static /submit paths must be registered before /:slug routes or React Router
 * treats "submit" as a slug. Regression guard for App.tsx ordering.
 */
test.describe('static submit routes', () => {
  test('/announcements/submit is not announcement detail', async ({ page }) => {
    await page.goto('/announcements/submit', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Submit an Announcement' })).toBeVisible()
  })

  test('/businesses/submit is not business detail', async ({ page }) => {
    await page.goto('/businesses/submit', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'List Your Business' })).toBeVisible()
  })

  test('/community-support/submit is not fundraiser detail', async ({ page }) => {
    await page.goto('/community-support/submit', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Submit a Fundraiser' })).toBeVisible()
  })
})
