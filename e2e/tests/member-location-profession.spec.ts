import { test, expect } from '@playwright/test'
import { GENERAL_LOCATION_AREA_VALUES, PROFESSIONAL_FIELD_VALUES } from '../../src/lib/memberDemographics'
import { ALL_PUBLIC_NAV } from '../../src/lib/publicNav'
import { hasMemberCredentials } from '../helpers/env'
import { loginAsMember } from '../helpers/auth'

test.describe('Member location & profession (membership + privacy)', () => {
  test('membership form includes general location selector', async ({ page }) => {
    await page.goto('/membership', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('membership-general-location')).toBeVisible()
  })

  test('membership form does not offer Prefer not to say for general location', async ({ page }) => {
    await page.goto('/membership')
    const body = await page.textContent('body')
    expect(body?.toLowerCase().includes('prefer not to say')).toBe(false)
  })

  test('membership form includes professional field selector', async ({ page }) => {
    await page.goto('/membership')
    await expect(page.getByTestId('membership-professional-field')).toBeVisible()
  })

  test('membership shows concise location and profession helper copy', async ({ page }) => {
    await page.goto('/membership', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('membership-location-helper')).toContainText('Choose the broad area closest to you')
    await expect(page.getByTestId('membership-profession-helper')).toContainText('aggregate community planning')
    const body = (await page.textContent('body')) ?? ''
    expect((body.match(/never shown publicly/g) ?? []).length).toBeLessThanOrEqual(1)
  })

  test('profile page avoids stacked long privacy paragraphs when authenticated', async ({ page }) => {
    test.skip(!hasMemberCredentials, 'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD')
    await loginAsMember(page)
    const body = (await page.textContent('body')) ?? ''
    expect(body.split('Private contact details are visible only to authorized admins').length).toBeLessThanOrEqual(2)
  })

  test('public privacy page does not expose internal demographic field keys', async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' })
    const t = ((await page.textContent('body')) ?? '').toLowerCase()
    expect(t.includes('general_location_area')).toBe(false)
    expect(t.includes('professional_field')).toBe(false)
  })

  test('general location values are constrained to known set', () => {
    expect(GENERAL_LOCATION_AREA_VALUES).toContain('houston')
    expect(GENERAL_LOCATION_AREA_VALUES).toContain('outside_houston_metro')
    expect(GENERAL_LOCATION_AREA_VALUES.length).toBeGreaterThan(40)
  })

  test('professional field values are constrained to known set', () => {
    expect(PROFESSIONAL_FIELD_VALUES).toContain('healthcare')
    expect(PROFESSIONAL_FIELD_VALUES).toContain('other')
  })

  test('admin analytics route is protected when logged out', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('public nav does not list admin analytics', () => {
    const tos = ALL_PUBLIC_NAV.map((i) => i.to)
    expect(tos).not.toContain('/admin/analytics')
  })
})
