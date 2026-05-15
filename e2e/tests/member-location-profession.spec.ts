import { test, expect } from '@playwright/test'
import { GENERAL_LOCATION_AREA_VALUES, PROFESSIONAL_FIELD_VALUES } from '../../src/lib/memberDemographics'
import { ALL_PUBLIC_NAV } from '../../src/lib/publicNav'

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
