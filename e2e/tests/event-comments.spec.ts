import { test, expect } from '@playwright/test'

const EVENT_DETAIL_SLUG = 'kigh-financial-literacy-session-2026-04-24'

test.describe('Event comments (public)', () => {
  test('event detail page loads comments section when event exists', async ({ page }) => {
    await page.goto(`/events/${EVENT_DETAIL_SLUG}`, { waitUntil: 'domcontentloaded' })
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      test.skip(true, 'Seeded event not present in this environment.')
    }
    await expect(page.getByRole('heading', { name: 'Questions & Comments' })).toBeVisible()
  })

  test('logged-out users see login prompt on event comments', async ({ page }) => {
    await page.goto(`/events/${EVENT_DETAIL_SLUG}`)
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      test.skip(true, 'Seeded event not present in this environment.')
    }
    await expect(page.getByText(/Log in to ask a question about this event/i)).toBeVisible()
  })

  test('anonymous users do not see authenticated comment form fields as primary CTA', async ({ page }) => {
    await page.goto(`/events/${EVENT_DETAIL_SLUG}`)
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      test.skip(true, 'Seeded event not present in this environment.')
    }
    await expect(page.getByRole('button', { name: /Submit question/i })).toHaveCount(0)
  })

  test('approved comments area does not crash on empty state', async ({ page }) => {
    await page.goto(`/events/${EVENT_DETAIL_SLUG}`)
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      test.skip(true, 'Seeded event not present in this environment.')
    }
    await expect(
      page.getByText(/No published questions yet|Pending review|Log in to ask a question/i).first()
    ).toBeVisible()
  })
})
