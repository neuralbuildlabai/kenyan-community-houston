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

  test('membership registrations admin page loads', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/members')
    await expect(page.getByRole('heading', { name: 'Membership registrations' })).toBeVisible()
    await expect(page.getByText(/Auth email/i)).toBeVisible()
  })

  test('can activate a pending member when one exists', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/members?membershipStatus=pending', { waitUntil: 'domcontentloaded' })
    const empty = page.getByTestId('members-empty')
    if ((await empty.count()) > 0 && (await empty.isVisible())) {
      test.skip(true, 'No pending members to activate')
    }
    const statusTrigger = page.locator('table tbody tr').first().getByRole('combobox').first()
    await statusTrigger.click()
    await page.getByRole('option', { name: 'active', exact: true }).click()
    await expect(page.getByText('Updated')).toBeVisible({ timeout: 15_000 })
  })

  test('can delete a published gallery image when one exists', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/gallery?tab=library', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('gallery-tab-published').click()
    const deleteBtn = page.getByTestId('gallery-published-delete').first()
    if ((await deleteBtn.count()) === 0) {
      test.skip(true, 'No published gallery images to delete')
    }
    await deleteBtn.click()
    await page.getByRole('button', { name: 'Delete permanently', exact: true }).click()
    await expect(page.getByText(/deleted permanently/i)).toBeVisible({ timeout: 20_000 })
  })

  test('logout is visible and returns to public homepage', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByRole('button', { name: 'Logout' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Logout' }).first().click()
    await expect(page).not.toHaveURL(/\/admin/)
    await expect(page.getByRole('heading', { level: 1, name: /Your Kenyan community hub in Houston/i })).toBeVisible()
  })
})
