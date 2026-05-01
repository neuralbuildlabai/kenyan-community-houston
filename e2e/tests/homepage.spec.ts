import { test, expect } from '@playwright/test'

test.describe('homepage', () => {
  test('hero, CTAs, sections, footer disclaimer', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: /Where Kenyans in Houston connect/i })).toBeVisible()

    const join = page.getByRole('link', { name: /Join \/ Membership/i })
    await expect(join).toBeVisible()
    await expect(join).toHaveAttribute('href', /\/membership/)

    const cal = page.getByRole('link', { name: /View Calendar/i })
    await expect(cal).toBeVisible()
    await expect(cal).toHaveAttribute('href', /\/calendar/)

    await expect(page.getByText(/Quick access/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Events' }).first()).toBeVisible()

    await expect(page.getByRole('heading', { name: /Gather with the community|Upcoming events/i })).toBeVisible()

    await expect(page.getByRole('heading', { name: /Make this your community home|Are you Kenyan/i })).toBeVisible()

    await expect(page.getByRole('heading', { name: /Help carry the community forward/i })).toBeVisible()

    const disclaimer = page.getByRole('contentinfo').getByRole('link', { name: 'Disclaimer' }).first()
    await expect(disclaimer).toBeVisible()
    await Promise.all([page.waitForURL('**/disclaimer'), disclaimer.click()])
    await expect(page.getByRole('heading', { name: 'Disclaimer', exact: true })).toBeVisible()
  })
})
