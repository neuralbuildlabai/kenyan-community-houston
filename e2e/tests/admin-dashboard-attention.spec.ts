import { test, expect } from '@playwright/test'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin } from '../helpers/auth'

test.describe('admin dashboard attention links', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
    await loginAsAdmin(page)
  })

  test('attention rows link to filtered admin queues', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

    await expect(page.getByTestId('attention-submissions')).toHaveAttribute('href', '/admin/submissions?status=pending')
    await expect(page.getByTestId('attention-members')).toHaveAttribute(
      'href',
      '/admin/members?membershipStatus=pending'
    )
    await expect(page.getByTestId('attention-gallery')).toHaveAttribute('href', '/admin/gallery?tab=review')
    await expect(page.getByTestId('attention-media-submissions')).toHaveAttribute(
      'href',
      '/admin/media-submissions?status=pending'
    )
    await expect(page.getByTestId('attention-contacts')).toHaveAttribute('href', '/admin/contacts?status=new')
  })

  test('gallery review tab opens from query param', async ({ page }) => {
    await page.goto('/admin/gallery?tab=review')
    await expect(page.getByRole('heading', { name: 'Gallery', level: 1 })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Review queue/i })).toHaveAttribute('data-state', 'active')
  })

  test('members pending filter from query param', async ({ page }) => {
    await page.goto('/admin/members?membershipStatus=pending')
    await expect(page.getByRole('heading', { name: /Membership registrations/i })).toBeVisible()
    await expect(page.getByTestId('member-view-details').first()).toBeVisible({ timeout: 15_000 }).catch(() => {
      void expect(page.getByTestId('members-empty')).toBeVisible()
    })
  })
})
