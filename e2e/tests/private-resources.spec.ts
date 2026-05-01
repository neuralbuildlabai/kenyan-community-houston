import { test, expect } from '@playwright/test'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin } from '../helpers/auth'

async function assertPublicResourcesClean(page: import('@playwright/test').Page) {
  const html = await page.content()
  for (const term of [
    'Vendor spreadsheet',
    'Action Log',
    'Park Budget',
    'Certificate',
    'Original_Document',
    'kigh-private-documents',
    'storage_path',
    'original_filename',
    'kigh-private-review',
  ]) {
    expect(html).not.toContain(term)
  }
  expect(html).not.toMatch(/\bIEN\b/i)
  expect(html).not.toMatch(/\bEIN\b/)
}

test.describe('private resource exposure', () => {
  test('public /resources stays clean', async ({ page }) => {
    await page.goto('/resources')
    await assertPublicResourcesClean(page)
  })

  test('admin resources shows management controls when logged in', async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
    await loginAsAdmin(page)
    await page.goto('/admin/resources')
    await expect(page.getByRole('heading', { name: 'Resource library' })).toBeVisible()
    await expect(page.getByText('Access level', { exact: false }).first()).toBeVisible()
  })
})
