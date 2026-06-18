import { test, expect } from '@playwright/test'

test.describe('community polls', () => {
  test('polls index page loads', async ({ page }) => {
    await page.goto('/polls')
    await expect(
      page.getByRole('heading', { level: 1, name: /Community polls/i })
    ).toBeVisible()
  })

  test('unknown poll slug shows not-found state', async ({ page }) => {
    await page.goto('/polls/this-poll-does-not-exist-xyz')
    await expect(page.getByRole('heading', { name: /Poll not found/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Browse polls/i })).toHaveAttribute(
      'href',
      '/polls'
    )
  })
})
