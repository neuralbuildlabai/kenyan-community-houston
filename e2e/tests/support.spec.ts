import { test, expect } from '@playwright/test'

test.describe('support page', () => {
  test('treasury handles and payment links', async ({ page }) => {
    await page.goto('/support')

    await expect(page.getByText('$KighTreasurer')).toBeVisible()
    await expect(page.getByText('@KIGH_Treasurer')).toBeVisible()
    await expect(page.getByText('@KighTreasurer')).toBeVisible()

    const cash = page.getByRole('link', { name: /Open Cash App/i })
    await expect(cash).toHaveAttribute('href', 'https://cash.app/$KighTreasurer')

    const venmo = page.getByRole('link', { name: /Open Venmo/i })
    await expect(venmo).toHaveAttribute('href', 'https://venmo.com/u/KIGH_Treasurer')

    const paypal = page.getByRole('link', { name: /Open PayPal/i })
    await expect(paypal).toHaveAttribute('href', 'https://www.paypal.com/paypalme/KighTreasurer')

    await expect(page.getByText(/tax\s*deduct/i)).toHaveCount(0)
  })
})
