import { test, expect } from '@playwright/test'

test.describe('governance & resources', () => {
  test('governance shows AGM copy and document links', async ({ page }) => {
    await page.goto('/governance')
    await expect(page.getByText('AGM month: November')).toBeVisible()
    await expect(page.getByText('AGM quorum: 25% of members in good standing')).toBeVisible()

    await expect(page.getByRole('link', { name: /View full constitution & bylaws/i })).toBeVisible()
    await expect(
      page.locator('a[href*="Rules%20and%20Regulations"]').filter({ hasText: 'View' }),
    ).toBeVisible()
    await expect(
      page.locator('a[href*="Roles%20and%20Responsibilities"]').filter({ hasText: 'View' }),
    ).toBeVisible()
  })

  test('resources page structure and no private leaks', async ({ page }) => {
    await page.goto('/resources')
    await expect(page.getByRole('heading', { name: /Resource library/i })).toBeVisible()

    const html = await page.content()
    for (const term of [
      'Vendor spreadsheet',
      'Action Log',
      'Park Budget',
      'Certificate',
      'Original_Document',
      'kigh-private-documents',
      'storage_path',
      'original_filename',
      'kigh-private-review',
    ]) {
      expect(html).not.toContain(term)
    }
    expect(html).not.toMatch(/\bIEN\b/i)
    expect(html).not.toMatch(/\bEIN\b/)

    const seeded = page.getByRole('link', { name: 'KIGH Financial Literacy' })
    if (await seeded.count()) {
      await expect(seeded.first()).toBeVisible()
    }
  })
})
