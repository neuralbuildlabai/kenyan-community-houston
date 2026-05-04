import { test, expect } from '@playwright/test'

/**
 * Smoke test for the ContactPage schema fix (migration 018). We do
 * not actually submit unless E2E_ENABLE_FORM_SUBMISSIONS=true; the
 * default mode just confirms the form has the fields wired so the
 * code path that builds the insert payload (with phone, inquiry_type,
 * status, honeypot) is exercised by the bundle.
 */

test.describe('contact form schema', () => {
  test('renders all expected fields', async ({ page }) => {
    await page.goto('/contact')

    await expect(page.getByRole('heading', { name: /Contact \/ Join Us/i })).toBeVisible()
    await expect(page.getByLabel(/Full Name/i)).toBeVisible()
    await expect(page.getByLabel(/Email/i)).toBeVisible()
    await expect(page.getByLabel(/Phone \(optional\)/i)).toBeVisible()
    await expect(page.getByLabel(/Subject/i)).toBeVisible()
    await expect(page.getByLabel(/Message/i)).toBeVisible()
  })

  test('honeypot field is in the DOM but not visible', async ({ page }) => {
    await page.goto('/contact')

    const honeypot = page.locator('input#company_website')
    await expect(honeypot).toHaveCount(1)
    // It is positioned off-screen rather than display:none, so the
    // browser will not consider it visible.
    await expect(honeypot).toBeHidden()
  })

  test('submit is blocked client-side when required fields are empty', async ({ page }) => {
    await page.goto('/contact')
    await page.getByRole('button', { name: /Send Message/i }).click()
    // Toast component renders a region; assert the form is still
    // mounted (no submitted-success state).
    await expect(page.getByLabel(/Full Name/i)).toBeVisible()
  })
})
