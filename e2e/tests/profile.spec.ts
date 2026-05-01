import { test, expect } from '@playwright/test'
import { hasMemberCredentials } from '../helpers/env'
import { loginAsMember } from '../helpers/auth'

test.describe('member profile', () => {
  test('redirects to login when logged out', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('profile form fields when authenticated', async ({ page }) => {
    test.skip(!hasMemberCredentials, 'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD')
    await loginAsMember(page)
    await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible()
    await expect(page.getByLabel(/^Email$/i)).toBeVisible()
    await expect(page.getByTestId('profile-input-full-name')).toBeVisible()
    await expect(page.getByTestId('profile-input-phone')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Interests' })).toBeVisible()
    await expect(page.getByText('I am willing to volunteer', { exact: false })).toBeVisible()
    await expect(page.getByText('I am willing to explore serving', { exact: false })).toBeVisible()
  })

  test('household dialog includes relationship options', async ({ page }) => {
    test.skip(!hasMemberCredentials, 'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD')
    await loginAsMember(page)
    await page.getByRole('button', { name: 'Add member' }).click()
    await page.getByTestId('household-relationship').click()
    for (const label of ['Mother', 'Father', 'Brother', 'Sister', 'Child', 'Spouse', 'Other'] as const) {
      await expect(page.getByRole('option', { name: label })).toBeVisible()
    }
  })
})
