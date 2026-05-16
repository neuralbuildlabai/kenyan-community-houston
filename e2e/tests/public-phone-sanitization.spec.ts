import { test, expect } from '@playwright/test'
import { DIRTY_PUBLIC_PHONE, SANITIZED_PUBLIC_PHONE } from '../helpers/phoneSanitization'
import { expectPublicVolunteerSignupPath } from '../helpers/publicVolunteerRoute'

const DEFAULT_VOLUNTEER_EVENT_SLUG = 'kigh-financial-literacy-session-2026-04-24'

test.describe('public phone input sanitization', () => {
  test('membership — primary phone strips to digits', async ({ page }) => {
    await page.goto('/membership')
    const phone = page.locator('#ph')
    await expect(phone).toBeVisible()
    await phone.fill(DIRTY_PUBLIC_PHONE)
    await expect(phone).toHaveValue(SANITIZED_PUBLIC_PHONE)
  })

  test('membership — household phone strips to digits (family / household)', async ({ page }) => {
    await page.goto('/membership')
    await page
      .getByRole('heading', { name: 'Membership type *' })
      .locator('..')
      .locator('..')
      .getByRole('combobox')
      .click()
    await page.getByRole('option', { name: 'Family / household membership' }).click()
    await expect(page.getByRole('heading', { name: 'Household' })).toBeVisible()

    const householdPhone = page
      .getByRole('heading', { name: 'Household' })
      .locator('xpath=following::input[@type="tel"][1]')
    await expect(householdPhone).toBeVisible()
    await householdPhone.fill(DIRTY_PUBLIC_PHONE)
    await expect(householdPhone).toHaveValue(SANITIZED_PUBLIC_PHONE)
  })

  test('serve/apply — phone strips to digits', async ({ page }) => {
    await page.goto('/serve/apply')
    const phone = page.locator('#phone')
    await expect(phone).toBeVisible()
    await phone.fill(DIRTY_PUBLIC_PHONE)
    await expect(phone).toHaveValue(SANITIZED_PUBLIC_PHONE)
  })

  test('community-groups/submit — public phone strips to digits', async ({ page }) => {
    await page.goto('/community-groups/submit')
    const phone = page.locator('#public_phone')
    await expect(phone).toBeVisible()
    await phone.fill(DIRTY_PUBLIC_PHONE)
    await expect(phone).toHaveValue(SANITIZED_PUBLIC_PHONE)
  })

  test('businesses/submit — business phone strips to digits', async ({ page }) => {
    await page.goto('/businesses/submit')
    const phone = page.locator('#phone')
    await expect(phone).toBeVisible()
    await phone.fill(DIRTY_PUBLIC_PHONE)
    await expect(phone).toHaveValue(SANITIZED_PUBLIC_PHONE)
  })

  test('events volunteer — logged-out visitor: phone strips to digits when signup is open', async ({ page }) => {
    const slug = process.env.E2E_OPEN_VOLUNTEER_EVENT_SLUG ?? DEFAULT_VOLUNTEER_EVENT_SLUG
    await page.goto(`/events/${slug}/volunteer`, { waitUntil: 'networkidle' })

    await expectPublicVolunteerSignupPath(page, slug)

    const nameInput = page.locator('#vol-name')
    const notOpen = page.getByText('Volunteer signup is not open for this event.')
    const closed = page.getByText('Volunteer signup has closed for this event.')
    const notFound = page.getByRole('heading', { name: /Event not found/i })

    await expect(nameInput.or(notOpen).or(closed).or(notFound).first()).toBeVisible({ timeout: 30_000 })

    if (await notFound.isVisible()) {
      test.skip(true, `Volunteer phone sanitization skipped: no published event for slug "${slug}" (event not found).`)
    }
    if (await notOpen.isVisible()) {
      test.skip(true, `Volunteer phone sanitization skipped: volunteer signup is not enabled for slug "${slug}".`)
    }
    if (await closed.isVisible()) {
      test.skip(true, `Volunteer phone sanitization skipped: volunteer signup has closed for slug "${slug}".`)
    }

    await expectPublicVolunteerSignupPath(page, slug)
    await expect(page.getByRole('heading', { name: /Volunteer for this event/i })).toBeVisible()

    const phone = page.locator('#vol-phone')
    await expect(phone).toBeVisible()
    await phone.click()
    await phone.fill('')
    await phone.pressSequentially(DIRTY_PUBLIC_PHONE, { delay: 5 })
    await expect(phone).toHaveValue(SANITIZED_PUBLIC_PHONE)
    await expectPublicVolunteerSignupPath(page, slug)
  })
})
