import { test, expect } from '@playwright/test'

test.describe('homepage', () => {
  test('renders premium, clean homepage with key CTAs and no leaks', async ({ page }) => {
    await page.goto('/')

    // ── A. Hero ──────────────────────────────────────────────
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Your Kenyan community hub in Houston/i,
      })
    ).toBeVisible()

    const join = page.getByTestId('hero-cta-join')
    await expect(join).toBeVisible()
    await expect(join).toHaveAttribute('href', '/membership')

    const askChat = page.getByTestId('hero-cta-chat')
    await expect(askChat).toBeVisible()
    await expect(askChat).toHaveAttribute('href', '/chat')

    // ── B. Quick action strip — exactly four routes ──────────
    await expect(page.getByTestId('action-chat')).toHaveAttribute('href', '/chat')
    await expect(page.getByTestId('action-events')).toHaveAttribute(
      'href',
      '/events'
    )
    await expect(page.getByTestId('action-resources')).toHaveAttribute(
      'href',
      '/resources'
    )
    await expect(page.getByTestId('action-businesses')).toHaveAttribute(
      'href',
      '/businesses'
    )

    // ── C. Connect with the community ────────────────────────
    const living = page.getByTestId('home-living-community')
    await expect(living).toBeVisible()
    await expect(
      living.getByRole('heading', { name: /Connect with the community/i })
    ).toBeVisible()
    await expect(living.getByTestId('home-cta-community-chat')).toHaveAttribute(
      'href',
      '/chat'
    )
    await expect(living.getByTestId('home-cta-community-feed')).toHaveAttribute(
      'href',
      '/community-feed'
    )
    // Static copy only — no fake private chat messages should be exposed.
    const chatCard = living.getByTestId('home-cta-community-chat')
    await expect(chatCard.getByText(/Member space/i)).toBeVisible()
    await expect(chatCard.getByText(/Sign in may be required/i)).toBeVisible()

    // ── D. Events preview ────────────────────────────────────
    await expect(
      page.getByRole('heading', { name: /Upcoming gatherings/i })
    ).toBeVisible()
    await expect(page.getByTestId('home-cta-events')).toHaveAttribute(
      'href',
      '/events'
    )

    // ── E. Updates & ways to help ────────────────────────────
    await expect(
      page.getByRole('heading', { name: /Updates and ways to help/i })
    ).toBeVisible()
    await expect(page.getByTestId('home-cta-announcements')).toHaveAttribute(
      'href',
      '/announcements'
    )
    await expect(
      page.getByTestId('home-cta-community-support')
    ).toHaveAttribute('href', '/community-support')

    // ── F. New to Houston band ───────────────────────────────
    await expect(
      page.getByRole('heading', { name: /New to Houston\?/i })
    ).toBeVisible()

    // ── No admin routes exposed on public homepage ──────────
    const mainContent = page.locator('main')
    const adminLinks = await mainContent
      .getByRole('link')
      .evaluateAll((els) =>
        els
          .map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? '')
          .filter((href) => href.startsWith('/admin'))
      )
    expect(adminLinks).toEqual([])

    // ── No fake private chat-message bubbles ────────────────
    // We assert there are no chat-message-style nodes injected into the
    // homepage that could look like real conversations.
    const fakeChatBubbles = await page
      .locator('[data-testid="chat-message"], [data-fake-chat="true"]')
      .count()
    expect(fakeChatBubbles).toBe(0)

    // ── Footer essentials still wired ───────────────────────
    const loginLink = page
      .getByRole('contentinfo')
      .getByRole('link', { name: /^Login$/i })
    await expect(loginLink).toBeVisible()
    await expect(loginLink).toHaveAttribute('href', '/login')

    const disclaimer = page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Disclaimer' })
      .first()
    await expect(disclaimer).toBeVisible()
    await Promise.all([page.waitForURL('**/disclaimer'), disclaimer.click()])
    await expect(
      page.getByRole('heading', { name: 'Disclaimer', exact: true })
    ).toBeVisible()
  })
})
