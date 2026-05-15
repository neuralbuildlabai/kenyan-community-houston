import { test, expect } from '@playwright/test'
import { skipIfNoMember, loginAsMember } from '../helpers/auth'

test.describe('change-password page', () => {
  test('logged-out user is redirected to login', async ({ page }) => {
    await page.goto('/change-password')
    await expect(page).toHaveURL(/\/login\?/)
  })

  test('signed-in user sees policy summary', async ({ page }) => {
    skipIfNoMember()
    await loginAsMember(page)
    await page.goto('/change-password')
    await expect(page.getByTestId('password-policy-summary')).toBeVisible()
    await expect(page.getByText(/6–16 characters/i)).toBeVisible()
  })

  test('mismatch confirmation blocks submit with toast', async ({ page }) => {
    skipIfNoMember()
    await loginAsMember(page)
    await page.goto('/change-password')
    await page.getByTestId('change-password-new').fill('Kenya1!')
    await page.getByTestId('change-password-confirm').fill('Kenya2!')
    await page.getByTestId('change-password-submit').click()
    await expect(page.getByText('Passwords do not match')).toBeVisible()
  })

  test('too-short password blocks submit with toast', async ({ page }) => {
    skipIfNoMember()
    await loginAsMember(page)
    await page.goto('/change-password')
    await page.getByTestId('change-password-new').fill('Ab1!')
    await page.getByTestId('change-password-confirm').fill('Ab1!')
    await page.getByTestId('change-password-submit').click()
    await expect(page.getByText('Password must be at least 6 characters.')).toBeVisible()
  })

  test('over-16 password blocks submit with toast', async ({ page }) => {
    skipIfNoMember()
    await loginAsMember(page)
    await page.goto('/change-password')
    const long = 'VeryLongPassword123!'
    await page.getByTestId('change-password-new').fill(long)
    await page.getByTestId('change-password-confirm').fill(long)
    await page.getByTestId('change-password-submit').click()
    await expect(page.getByText('Password must be 16 characters or less.')).toBeVisible()
  })
})
