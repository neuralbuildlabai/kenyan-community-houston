import { test, expect } from '@playwright/test'
import { formSubmissionsEnabled } from '../helpers/env'
import { uniqueEmail, uniqueName } from '../helpers/testData'

test.describe('public form submissions', () => {
  test.beforeEach(() => {
    test.skip(!formSubmissionsEnabled, 'Set E2E_ENABLE_FORM_SUBMISSIONS=true to run DB-writing form tests')
  })

  test('membership individual flow', async ({ page }) => {
    await page.goto('/membership')
    await page.getByLabel('First name').fill('E2E')
    await page.getByLabel('Last name').fill('Member')
    await page.locator('#em').fill(uniqueEmail('e2e-member'))
    await page.getByLabel('City').fill('Houston')
    await page.getByLabel('State').fill('TX')
    await page.getByLabel('ZIP code').fill('77002')

    await page.locator('label').filter({ hasText: /I agree to follow the KIGH/i }).click()
    await page.locator('label').filter({ hasText: /I consent to KIGH using my information/i }).click()

    await page.getByRole('button', { name: /Submit registration/i }).click()
    await expect(page).toHaveURL(/\/membership\/success/, { timeout: 30_000 })
  })

  test('serve apply interest', async ({ page }) => {
    await page.goto('/serve/apply')
    await page.getByLabel('Full name').fill(uniqueName('E2E Volunteer'))
    await page.getByLabel('Email', { exact: false }).first().fill(uniqueEmail('e2e-serve'))
    await page.getByRole('combobox').nth(1).click()
    await page.getByRole('option', { name: 'Yes' }).click()
    await page.getByRole('button', { name: /Submit interest/i }).click()
    await expect(page).toHaveURL(/\/serve$/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: /Call to Serve Our Community/i })).toBeVisible()
  })

  test('community group submit', async ({ page }) => {
    await page.goto('/community-groups/submit')
    await page.getByLabel('Organization name').fill(uniqueName('E2E Group'))
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Religious Institution' }).click()
    await page.getByLabel('Description').fill('E2E test submission for community directory.')
    await page.getByLabel('Your name').fill('E2E Submitter')
    await page.getByLabel('Your email').fill(uniqueEmail('e2e-group'))
    await page.getByRole('button', { name: /Submit for review/i }).click()
    await expect(page.getByRole('heading', { name: /Thank you/i })).toBeVisible({ timeout: 30_000 })
  })

  test('business submit', async ({ page }) => {
    await page.goto('/businesses/submit')
    await page.getByLabel(/Business Name/i).fill(uniqueName('E2E Biz'))
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Food & Catering' }).click()
    await page.getByLabel(/Description/i).first().fill('E2E business listing test.')
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByRole('heading', { name: /Business Submitted/i })).toBeVisible({ timeout: 30_000 })
  })

  test('contact form', async ({ page }) => {
    await page.goto('/contact')
    await page.getByLabel(/Full Name/i).fill(uniqueName('E2E Contact'))
    await page.getByLabel(/Email/i).first().fill(uniqueEmail('e2e-contact'))
    await page.getByLabel(/Message/i).fill('E2E automated test message.')
    await page.getByRole('button', { name: /Send Message/i }).click()
    await expect(page.getByRole('heading', { name: /Message Sent/i })).toBeVisible({ timeout: 30_000 })
  })
})
