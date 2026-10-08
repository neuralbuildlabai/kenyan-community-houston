import { test, expect } from '@playwright/test'

/**
 * "Internal KIGH fundraiser" on /community-support/submit. The checkbox must
 * swap the external donation field for the official KIGH handles without
 * losing what the submitter already typed, and must be operable by keyboard.
 */
const SUBMIT_PATH = '/community-support/submit'
const TYPED_URL = 'https://gofundme.com/keep-this-value'

const internalCheckbox = (page: import('@playwright/test').Page) =>
  page.getByRole('checkbox', { name: 'Internal KIGH fundraiser' })

const donationField = (page: import('@playwright/test').Page) =>
  page.getByLabel('Donation / GoFundMe Link')

test.describe('internal KIGH fundraiser toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SUBMIT_PATH)
    await expect(page.getByRole('heading', { name: 'Submit a Fundraiser' })).toBeVisible()
  })

  test('is unchecked by default and keeps the external donation field', async ({ page }) => {
    await expect(internalCheckbox(page)).not.toBeChecked()
    await expect(donationField(page)).toBeVisible()
    await expect(page.getByText('Donations go directly to KIGH')).toHaveCount(0)
  })

  test('checking it shows the same handles as Ways to Support and hides the link field', async ({
    page,
  }) => {
    const handlesFromSupportPage = await (async () => {
      await page.goto('/support')
      await expect(page.getByRole('heading', { name: 'Ways to support KIGH' })).toBeVisible()
      return page.locator('.font-mono').allInnerTexts()
    })()
    expect(handlesFromSupportPage.length).toBeGreaterThan(0)

    await page.goto(SUBMIT_PATH)
    await internalCheckbox(page).check()

    await expect(donationField(page)).toHaveCount(0)
    await expect(page.getByText('Donations go directly to KIGH using the payment options below.')).toBeVisible()
    await expect(page.getByText('Organized by KIGH')).toBeVisible()
    for (const handle of handlesFromSupportPage) {
      await expect(page.getByText(handle, { exact: true })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Copy' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit for Review' })).toBeEnabled()
  })

  test('toggling preserves the typed external URL', async ({ page }) => {
    await donationField(page).fill(TYPED_URL)
    await internalCheckbox(page).check()
    await expect(donationField(page)).toHaveCount(0)

    await internalCheckbox(page).uncheck()
    await expect(donationField(page)).toHaveValue(TYPED_URL)
  })

  test('is operable by keyboard with a visible focus state', async ({ page }) => {
    await donationField(page).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(internalCheckbox(page)).toBeFocused()

    // Radix renders the checkbox as a native button — Space activates it.
    await page.keyboard.press(' ')
    await expect(internalCheckbox(page)).toBeChecked()
    const ring = await internalCheckbox(page).evaluate((el) => getComputedStyle(el).boxShadow)
    expect(ring).not.toBe('none')

    await page.keyboard.press(' ')
    await expect(internalCheckbox(page)).not.toBeChecked()
  })

  test('clicking the label toggles the checkbox', async ({ page }) => {
    await page.getByText('Internal KIGH fundraiser', { exact: true }).click()
    await expect(internalCheckbox(page)).toBeChecked()
  })

  test('payment preview stays readable on a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await internalCheckbox(page).check()

    const preview = page.getByText('Organized by KIGH').locator('..')
    await expect(preview).toBeVisible()
    const box = await preview.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeLessThanOrEqual(390)

    for (const button of await page.getByRole('button', { name: 'Copy' }).all()) {
      const b = await button.boundingBox()
      expect(b).not.toBeNull()
      expect(b!.x + b!.width).toBeLessThanOrEqual(390)
    }
  })
})
