import { test, expect } from '@playwright/test'
import { ALL_PUBLIC_NAV } from '../../src/lib/publicNav'

test.describe('Community request admin route protection', () => {
  test('/admin/chat redirects logged-out user to login', async ({ page }) => {
    await page.goto('/admin/chat', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('/admin/invites redirects logged-out user to login', async ({ page }) => {
    await page.goto('/admin/invites', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('/admin/event-comments redirects logged-out user to login', async ({ page }) => {
    await page.goto('/admin/event-comments', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('/admin/feed redirects logged-out user to login', async ({ page }) => {
    await page.goto('/admin/feed', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('public nav config does not list admin-only routes', () => {
    const tos = ALL_PUBLIC_NAV.map((i) => i.to)
    expect(tos.some((t) => t.startsWith('/admin'))).toBe(false)
  })
})
