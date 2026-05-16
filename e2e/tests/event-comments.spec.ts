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

  // Pass 3 — public visitors must be able to read event details without logging in.
  test('logged-out visitor can view full event detail (editorial header, title, date, location)', async ({ page }) => {
    await page.goto(`/events/${EVENT_DETAIL_SLUG}`, { waitUntil: 'domcontentloaded' })
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      test.skip(true, 'Seeded event not present in this environment.')
    }
    await expect(page.getByTestId('event-detail-header')).toBeVisible()
    await expect(page.getByTestId('event-detail-title')).toBeVisible()
    await expect(page.getByTestId('event-detail-sidebar')).toBeVisible()
    await expect(page.getByTestId('event-detail-date')).toBeVisible()
    await expect(page.getByTestId('event-detail-location')).toBeVisible()
    // No redirect to the login page just for viewing.
    await expect(page).not.toHaveURL(/\/login(\?|$)/)
  })

  test('logged-out visitor sees Questions & Comments and an inline sign-in prompt — not a hidden block', async ({ page }) => {
    await page.goto(`/events/${EVENT_DETAIL_SLUG}`, { waitUntil: 'domcontentloaded' })
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      test.skip(true, 'Seeded event not present in this environment.')
    }
    // Comments section is rendered for everyone, not hidden behind auth.
    await expect(page.getByRole('heading', { name: 'Questions & Comments' })).toBeVisible()
    // The sign-in prompt links to /login (with a `next` redirect back to the event).
    const signInLink = page.getByRole('link', { name: /Sign in/i }).first()
    await expect(signInLink).toBeVisible()
    const href = await signInLink.getAttribute('href')
    expect(href).toMatch(/^\/login/)
    // No fake chat bubbles or anonymous live chat surfaces.
    await expect(
      page.locator('[data-testid="chat-message"], [data-fake-chat="true"]')
    ).toHaveCount(0)
  })
})
