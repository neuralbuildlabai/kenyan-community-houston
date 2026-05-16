import { test, expect } from '@playwright/test'

/**
 * Legacy email claim + duplicate avoidance live in Postgres migration 027
 * (`submit_membership_registration`). Re-run audit SQL at bottom of that file
 * after deploy; full RPC paths need Supabase + real auth (not covered here).
 */

test.describe('membership registration auth fields', () => {
  test('membership page heading is visible (signup sync is server-side)', async ({ page }) => {
    await page.goto('/membership')
    await expect(page.getByRole('heading', { level: 1, name: /Become a member|Membership registration|Join the community/i })).toBeVisible()
  })

  test('logged-out membership hides Google and shows password fields (OAuth disabled)', async ({ page }) => {
    await page.goto('/membership')
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 3, name: /^Password/i })).toBeVisible()
  })

  test('shows password and confirm password when signed out', async ({ page }) => {
    await page.goto('/membership')
    await expect(page.getByRole('heading', { level: 3, name: /^Password/i })).toBeVisible()
    await expect(page.getByLabel(/^Password \*$/i)).toBeVisible()
    await expect(page.getByLabel(/^Confirm password \*$/i)).toBeVisible()
  })

  test('blocks submit when passwords do not match', async ({ page }) => {
    await page.goto('/membership')
    await page.getByLabel(/First name/i).fill('Test')
    await page.getByLabel(/Last name/i).fill('User')
    await page.getByLabel(/Email \*/i).fill('testuser-not-real@example.com')
    await page.getByLabel(/Phone \*/i).fill('7135550100')
    await page.getByLabel(/^Password \*$/i).fill('Abcd12!')
    await page.getByLabel(/^Confirm password \*$/i).fill('Abcd12@')
    await page.getByLabel(/City \*/i).fill('Houston')
    await page.getByLabel(/ZIP code \*/i).fill('77002')
    await page.getByTestId('membership-general-location').click()
    await page.getByRole('option', { name: 'Houston', exact: true }).click()
    await page.locator('label', { hasText: 'I agree to follow the KIGH' }).getByRole('checkbox').check()
    await page.locator('label', { hasText: 'I consent to KIGH using my information' }).getByRole('checkbox').check()
    await page.getByRole('button', { name: /Submit registration/i }).click()
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible()
  })

  test('blocks submit when password is too short', async ({ page }) => {
    await page.goto('/membership')
    await page.getByLabel(/First name/i).fill('Test')
    await page.getByLabel(/Last name/i).fill('User')
    await page.getByLabel(/Email \*/i).fill('shortpw@example.com')
    await page.getByLabel(/Phone \*/i).fill('7135550100')
    await page.getByLabel(/^Password \*$/i).fill('short')
    await page.getByLabel(/^Confirm password \*$/i).fill('short')
    await page.getByLabel(/City \*/i).fill('Houston')
    await page.getByLabel(/ZIP code \*/i).fill('77002')
    await page.getByTestId('membership-general-location').click()
    await page.getByRole('option', { name: 'Houston', exact: true }).click()
    await page.locator('label', { hasText: 'I agree to follow the KIGH' }).getByRole('checkbox').check()
    await page.locator('label', { hasText: 'I consent to KIGH using my information' }).getByRole('checkbox').check()
    await page.getByRole('button', { name: /Submit registration/i }).click()
    await expect(page.getByTestId('membership-password-error')).toContainText('Password must be at least 6 characters.')
  })

  test('blocks submit when password exceeds 16 characters', async ({ page }) => {
    await page.goto('/membership')
    await page.getByLabel(/First name/i).fill('Test')
    await page.getByLabel(/Last name/i).fill('User')
    await page.getByLabel(/Email \*/i).fill('longpwtest@example.com')
    await page.getByLabel(/Phone \*/i).fill('7135550100')
    const long = 'VeryLongPassword123!'
    await page.getByLabel(/^Password \*$/i).fill(long)
    await page.getByLabel(/^Confirm password \*$/i).fill(long)
    await page.getByLabel(/City \*/i).fill('Houston')
    await page.getByLabel(/ZIP code \*/i).fill('77002')
    await page.getByTestId('membership-general-location').click()
    await page.getByRole('option', { name: 'Houston', exact: true }).click()
    await page.locator('label', { hasText: 'I agree to follow the KIGH' }).getByRole('checkbox').check()
    await page.locator('label', { hasText: 'I consent to KIGH using my information' }).getByRole('checkbox').check()
    await page.getByRole('button', { name: /Submit registration/i }).click()
    await expect(page.getByTestId('membership-password-error')).toContainText('Password must be 16 characters or less.')
  })

  test('blocks submit when password lacks a special character', async ({ page }) => {
    await page.goto('/membership')
    await page.getByLabel(/First name/i).fill('Test')
    await page.getByLabel(/Last name/i).fill('User')
    await page.getByLabel(/Email \*/i).fill('nospecial@example.com')
    await page.getByLabel(/Phone \*/i).fill('7135550100')
    await page.getByLabel(/^Password \*$/i).fill('Abcdef12')
    await page.getByLabel(/^Confirm password \*$/i).fill('Abcdef12')
    await page.getByLabel(/City \*/i).fill('Houston')
    await page.getByLabel(/ZIP code \*/i).fill('77002')
    await page.getByTestId('membership-general-location').click()
    await page.getByRole('option', { name: 'Houston', exact: true }).click()
    await page.locator('label', { hasText: 'I agree to follow the KIGH' }).getByRole('checkbox').check()
    await page.locator('label', { hasText: 'I consent to KIGH using my information' }).getByRole('checkbox').check()
    await page.getByRole('button', { name: /Submit registration/i }).click()
    await expect(page.getByTestId('membership-password-error')).toContainText('Add a symbol.')
  })
})

test.describe('public auth wording', () => {
  test('homepage does not show Admin login branding', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Admin login/i)).toHaveCount(0)
  })
})
