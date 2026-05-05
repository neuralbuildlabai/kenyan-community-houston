import { test, expect } from '@playwright/test'

test.describe('homepage', () => {
  test('hero, CTAs, sections, footer disclaimer', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: /Your community hub for life in Houston/i })).toBeVisible()

    const join = page.getByRole('link', { name: /Join \/ Membership/i })
    await expect(join).toBeVisible()
    await expect(join).toHaveAttribute('href', /\/membership/)

    const cal = page.getByRole('link', { name: /View Calendar/i })
    await expect(cal).toBeVisible()
    await expect(cal).toHaveAttribute('href', /\/calendar/)

    await expect(page.getByText('Start here')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Events' }).first()).toBeVisible()

    await expect(page.getByText('Why we are here')).toBeVisible()
    await expect(page.getByRole('heading', { name: /One place to find your people/i })).toBeVisible()

    await expect(page.getByRole('heading', { name: /Upcoming gatherings/i })).toBeVisible()

    await expect(page.getByRole('heading', { name: /Updates & ways to help/i })).toBeVisible()

    await expect(
      page.getByRole('heading', { name: /New to Houston, or just looking for support\?/i })
    ).toBeVisible()

    const adminLogin = page.getByRole('link', { name: /Admin login/i }).first()
    await expect(adminLogin).toBeVisible()
    await expect(adminLogin).toHaveAttribute('href', /\/admin\/login/)

    const disclaimer = page.getByRole('contentinfo').getByRole('link', { name: 'Disclaimer' }).first()
    await expect(disclaimer).toBeVisible()
    await Promise.all([page.waitForURL('**/disclaimer'), disclaimer.click()])
    await expect(page.getByRole('heading', { name: 'Disclaimer', exact: true })).toBeVisible()
  })
})
