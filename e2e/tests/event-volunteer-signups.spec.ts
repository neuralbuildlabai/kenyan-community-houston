import { test, expect } from '@playwright/test'
import { ALL_PUBLIC_NAV } from '../../src/lib/publicNav'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin } from '../helpers/auth'
import { expectPublicVolunteerSignupPath } from '../helpers/publicVolunteerRoute'

test.describe('event volunteer signups', () => {
  test('volunteer route: unknown slug is graceful', async ({ page }) => {
    const slug = '__no_such_event_slug_kigh_uat__'
    await page.goto(`/events/${slug}/volunteer`, { waitUntil: 'domcontentloaded' })
    await expectPublicVolunteerSignupPath(page, slug)
    await expect(page.getByRole('heading', { name: /Event not found/i })).toBeVisible()
  })

  test('public nav config does not surface /admin/volunteers', () => {
    const tos = ALL_PUBLIC_NAV.map((i) => i.to)
    expect(tos).not.toContain('/admin/volunteers')
  })

  test('unauthenticated visitor is redirected from /admin/volunteers to login', async ({ page }) => {
    await page.goto('/admin/volunteers', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('public event detail does not render volunteer PII table', async ({ page }) => {
    await page.goto('/events/kigh-financial-literacy-session-2026-04-24', { waitUntil: 'domcontentloaded' })
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      return
    }
    await expect(page.getByRole('columnheader', { name: 'Phone' })).toHaveCount(0)
    await expect(page.getByRole('table')).toHaveCount(0)
  })

  test('volunteer form: name, phone, consent, and phone validation when signup is open', async ({ page }) => {
    const slug = 'kigh-financial-literacy-session-2026-04-24'
    await page.goto(`/events/${slug}/volunteer`, {
      waitUntil: 'networkidle',
    })
    await expectPublicVolunteerSignupPath(page, slug)

    const nameInput = page.locator('#vol-name')
    const notOpen = page.getByText('Volunteer signup is not open for this event.')
    const closed = page.getByText('Volunteer signup has closed for this event.')
    const closedPast = page.getByText(/not available for past events/i)
    const notFound = page.getByRole('heading', { name: /Event not found/i })
    await expect(nameInput.or(notOpen).or(closed).or(closedPast).or(notFound).first()).toBeVisible({ timeout: 30000 })
    if (await notOpen.isVisible()) return
    if (await closed.isVisible()) return
    if (await closedPast.isVisible()) return
    if (await notFound.isVisible()) return

    await expectPublicVolunteerSignupPath(page, slug)

    await nameInput.fill(' ')
    await page.locator('#vol-phone').fill('+15551234567')
    await page.getByRole('checkbox', { name: /agree that KIGH may contact me/i }).check()
    await page.getByRole('button', { name: /Submit signup/i }).click()
    await expect(page.getByText(/Please enter your full name/i)).toBeVisible()

    await nameInput.fill('Test Volunteer UAT')
    await page.locator('#vol-phone').fill('abc')
    await page.getByRole('button', { name: /Submit signup/i }).click()
    await expect(page.getByText(/valid phone number|only numbers/i)).toBeVisible()

    await page.locator('#vol-phone').fill('+254712345678')
    await page.getByRole('checkbox', { name: /agree that KIGH may contact me/i }).uncheck()
    await page.getByRole('button', { name: /Submit signup/i }).click()
    await expect(page.getByText(/agree that KIGH may contact you/i)).toBeVisible()
  })
})

test.describe('event volunteer signups (admin, conditional)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
    await loginAsAdmin(page)
  })

  test('admin volunteers page loads', async ({ page }) => {
    await page.goto('/admin/volunteers')
    await expect(page.getByRole('heading', { name: /Event volunteers/i })).toBeVisible()
  })
})
