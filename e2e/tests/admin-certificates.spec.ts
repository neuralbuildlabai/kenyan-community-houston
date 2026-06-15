import { test, expect } from '@playwright/test'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin } from '../helpers/auth'

test.describe('admin certificate generator', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
    await loginAsAdmin(page)
    await page.goto('/admin/certificates', { waitUntil: 'domcontentloaded' })
  })

  test('loads certificate generator page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Certificates & Acknowledgements', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Certificate type')).toBeVisible()
    await expect(page.getByLabel('Recipient name')).toBeVisible()
  })

  test('can select certificate category and preview', async ({ page }) => {
    await page.getByLabel('Certificate type').click()
    await page.getByRole('option', { name: 'Community Speaker Recognition' }).click()
    await expect(page.getByText('Certificate of Recognition')).toBeVisible()

    await page.getByLabel('Recipient name').fill('E2E Test Recipient')
    await page.getByRole('button', { name: 'Preview' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Certificate Preview' })).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('Community Speaker Recognition')
    await expect(page.getByLabel('Certificate preview')).toContainText('E2E Test Recipient')
  })

  test('can choose blank signature line', async ({ page }) => {
    await page.getByLabel('Recipient name').fill('Blank Signature Recipient')
    await page.getByLabel('Signature').click()
    await page.getByRole('option', { name: 'No signature (blank line)' }).click()

    const preview = page.getByLabel('Certificate preview')
    await expect(preview).toContainText('Blank Signature Recipient')
    await expect(preview.locator('.cert-signature-blank')).toBeVisible()
  })

  test('can choose saved signature when library has entries', async ({ page }) => {
    await page.getByLabel('Recipient name').fill('Signed Recipient')
    await page.getByLabel('Signature').click()
    await page.getByRole('option', { name: 'Select saved signature' }).click()

    const signatureSelect = page.getByLabel('Saved signature')
    if ((await signatureSelect.count()) === 0) {
      test.skip(true, 'No saved signatures in library — skipping saved signature test')
    }

    await signatureSelect.click()
    const options = page.getByRole('option')
    if ((await options.count()) <= 1) {
      test.skip(true, 'No saved signatures in library — skipping saved signature test')
    }
    await options.nth(1).click()

    const preview = page.getByLabel('Certificate preview')
    await expect(preview).toContainText('Signed Recipient')
    await expect(preview.locator('.cert-signature-image, .cert-signature-blank')).toBeVisible()
  })

  test('renders KIGH branding on live preview', async ({ page }) => {
    await page.getByLabel('Recipient name').fill('Branded Recipient')
    const preview = page.getByLabel('Certificate preview')
    await expect(preview).toContainText('Branded Recipient')
    await expect(preview).toContainText('Kenyans in Greater Houston Community')
    await expect(preview.locator('.cert-logo')).toBeVisible()
    await expect(preview.locator('.cert-official-seal')).toBeVisible()
  })
})

test('unauthenticated visitor cannot access certificate generator', async ({ page }) => {
  await page.goto('/admin/certificates', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/login/)
})
