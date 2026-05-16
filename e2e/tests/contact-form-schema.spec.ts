import { test, expect } from '@playwright/test'
import { DIRTY_PUBLIC_PHONE } from '../helpers/phoneSanitization'

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

    await expect(page.getByRole('heading', { name: /Contact us|Contact \/ Join Us/i })).toBeVisible()
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

  test('optional phone strips letters and spaces while typing', async ({ page }) => {
    await page.goto('/contact')
    const phone = page.locator('#phone')
    await phone.fill(DIRTY_PUBLIC_PHONE)
    await expect(phone).toHaveValue('0713936343')
    await phone.fill('+254 713 936 343')
    await expect(phone).toHaveValue('+254713936343')
    await phone.fill('++254abc713')
    await expect(phone).toHaveValue('+254713')
  })

  test('submit is blocked client-side when required fields are empty', async ({ page }) => {
    await page.goto('/contact')
    await page.getByRole('button', { name: /Send Message/i }).click()
    // Toast component renders a region; assert the form is still
    // mounted (no submitted-success state).
    await expect(page.getByLabel(/Full Name/i)).toBeVisible()
  })
})
