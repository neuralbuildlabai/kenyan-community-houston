import { test, expect } from '@playwright/test'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin } from '../helpers/auth'

test.describe('admin gallery bulk publish', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
    await loginAsAdmin(page)
    await page.goto('/admin/gallery', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible()
  })

  test('review queue exposes bulk selection controls when pending items exist', async ({ page }) => {
    const selectAll = page.getByTestId('gallery-select-all-pending')
    if ((await selectAll.count()) === 0) {
      test.skip(true, 'No pending submissions in review queue')
    }
    await selectAll.click()
    await expect(page.getByTestId('gallery-bulk-action-bar')).toBeVisible()
    await expect(page.getByTestId('gallery-bulk-action-bar')).toContainText(/selected/)
    await page.getByTestId('gallery-bulk-publish-open').click()
    await expect(page.getByTestId('gallery-bulk-publish-dialog')).toBeVisible()
    await expect(page.getByTestId('gallery-bulk-album-select')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByTestId('gallery-bulk-clear-selection').click()
    await expect(page.getByTestId('gallery-bulk-action-bar')).toHaveCount(0)
  })

  test('published tab shows grid and unpublish dialog can be cancelled', async ({ page }) => {
    await page.goto('/admin/gallery?tab=published', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('gallery-tab-published').click()
    const grid = page.getByTestId('gallery-published-grid')
    if ((await grid.count()) === 0) {
      await expect(page.getByTestId('gallery-published-empty')).toBeVisible()
      return
    }
    await expect(grid).toBeVisible()
    const unpublish = page.getByTestId('gallery-published-unpublish').first()
    await expect(unpublish).toBeEnabled()
    await unpublish.click()
    const dialog = page.getByTestId('gallery-unpublish-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Unpublish image?')).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
  })
})
