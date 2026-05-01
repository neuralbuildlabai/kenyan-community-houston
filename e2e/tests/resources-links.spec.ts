import { test, expect } from '@playwright/test'
import { expectNoPrivateTerms } from '../helpers/assertions'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin } from '../helpers/auth'

test.describe('resource links', () => {
  test('public resources shows view/download when published file resources exist', async ({ page }) => {
    await page.goto('/resources')
    await expect(page.getByRole('heading', { name: /resource library/i })).toBeVisible()
    const links = page.getByRole('link', { name: /view \/ download/i })
    const count = await links.count()
    if (count > 0) {
      const href = await links.first().getAttribute('href')
      expect(href).toBeTruthy()
      await expect(links.first()).toBeVisible()
    }
    await expectNoPrivateTerms(page)
  })

  test('admin resources table shows file actions when admin env set', async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
    await loginAsAdmin(page)
    await page.goto('/admin/resources')
    await expect(page.getByRole('heading', { name: 'Resource library' })).toBeVisible()
    const view = page.getByRole('link', { name: /view \/ download/i })
    const ext = page.getByRole('link', { name: /open external link/i })
    const priv = page.getByRole('button', { name: 'Download private file' })
    const count = (await view.count()) + (await ext.count()) + (await priv.count())
    expect(count).toBeGreaterThan(0)
  })
})
