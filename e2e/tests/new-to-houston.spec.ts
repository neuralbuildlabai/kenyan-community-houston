import { test, expect } from '@playwright/test'

test.describe('new to houston', () => {
  test('official resources, services pathway, disclaimer, community groups', async ({ page }) => {
    await page.goto('/new-to-houston')

    await expect(page.getByRole('heading', { name: /Official Houston & Texas resources/i })).toBeVisible()

    await expect(page.getByRole('link', { name: /Texas DPS/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Texas DMV/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /City of Houston/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Harris County, Texas' })).toBeVisible()
    await expect(page.getByRole('link', { name: /METRO Houston/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /USCIS/i })).toBeVisible()

    await expect(page.getByRole('heading', { name: /Community-reviewed services/i })).toBeVisible()

    await expect(page.getByRole('link', { name: 'List Your Service' })).toHaveAttribute('href', '/businesses/submit')
    await expect(page.getByRole('link', { name: /Browse Business Directory/i })).toHaveAttribute('href', '/businesses')

    await page.getByRole('button', { name: /Community & Faith/i }).click()
    await expect(page.getByRole('link', { name: /Community Groups & Institutions/i })).toHaveAttribute('href', '/community-groups')

    await expect(page.getByText(/KIGH does not guarantee, endorse, or take responsibility/i)).toBeVisible()
  })
})
