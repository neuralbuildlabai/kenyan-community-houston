import { test, expect } from '@playwright/test'

test.describe('homepage', () => {
  test('renders premium civic homepage with hero, CTAs, and no leaks', async ({ page }) => {
    await page.goto('/')

    const hero = page.getByTestId('home-hero')
    await expect(hero).toBeVisible()
    await expect(hero).toHaveAttribute('data-hero-image', '/kigh-media/houstonmainimage-hero.jpg')

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Your Kenyan community hub in Houston/i,
      })
    ).toBeVisible()

    await expect(page.getByTestId('home-hero-headline')).toBeVisible()

    const join = page.getByTestId('hero-cta-join')
    await expect(join).toBeVisible()
    await expect(join).toHaveAttribute('href', '/membership')

    const exploreEvents = page.getByTestId('hero-cta-events')
    await expect(exploreEvents).toBeVisible()
    await expect(exploreEvents).toHaveAttribute('href', '/events')

    await expect(page.getByTestId('home-quick-join')).toHaveAttribute('href', '/membership')
    await expect(page.getByTestId('home-quick-events')).toHaveAttribute('href', '/events')
    await expect(page.getByTestId('home-quick-chat')).toHaveAttribute('href', '/chat')
    await expect(page.getByTestId('home-quick-businesses')).toHaveAttribute('href', '/businesses')
    await expect(page.getByTestId('home-quick-new')).toHaveAttribute('href', '/new-to-houston')
    await expect(page.getByTestId('home-quick-gallery')).toHaveAttribute('href', '/gallery')
    await expect(page.getByTestId('home-quick-submit')).toHaveAttribute('href', '/events/submit')
    await expect(page.getByTestId('home-quick-ask')).toHaveAttribute('href', '/chat')

    await expect(page.getByTestId('home-whats-happening')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /What's happening/i })
    ).toBeVisible()

    const html = await page.content()
    expect(html).not.toContain('kigh-family-fun-day-2026.jpeg')
    expect(html).not.toMatch(/\/kigh-media\/events\/[^"']+\.(jpe?g|png)/i)

    const eventRows = page.getByTestId('home-event-row')
    const calendarLink = page.getByTestId('home-whats-happening-calendar')
    await expect(eventRows.first().or(calendarLink)).toBeVisible({ timeout: 25_000 })
    const rowCount = await eventRows.count()
    expect(rowCount).toBeLessThanOrEqual(3)
    if (rowCount > 0) {
      await expect(page.getByTestId('home-cta-events')).toHaveAttribute('href', '/events')
      const titles = await eventRows.locator('[data-testid="home-event-title"]').allTextContents()
      const uniq = new Set(titles.map((t) => t.trim()))
      expect(uniq.size, 'no duplicate titles in homepage preview').toBe(titles.length)
      for (const row of await eventRows.all()) {
        const href = await row.getAttribute('href')
        expect(href).toMatch(/^\/events\//)
      }
    } else {
      const cal = page.getByTestId('home-whats-happening-calendar')
      await expect(cal).toBeVisible()
      await expect(cal).toHaveAttribute('href', '/calendar')
    }

    await expect(page.getByRole('heading', { name: /New to Houston\?/i })).toBeVisible()
    await expect(page.getByTestId('home-newcomer-resources')).toHaveAttribute('href', '/new-to-houston')
    await expect(page.getByTestId('home-newcomer-chat')).toHaveAttribute('href', '/chat')

    const help = page.getByTestId('home-help-links')
    await expect(help).toBeVisible()
    await expect(page.getByTestId('home-help-announcements')).toHaveAttribute('href', '/announcements')
    await expect(page.getByTestId('home-help-community-support')).toHaveAttribute(
      'href',
      '/community-support'
    )
    await expect(page.getByTestId('home-help-contact')).toHaveAttribute('href', '/contact')

    const momentCount = await page.getByTestId('home-gallery-moment').count()
    expect(momentCount).toBeLessThanOrEqual(6)

    const mainContent = page.locator('main')
    const adminLinks = await mainContent
      .getByRole('link')
      .evaluateAll((els) =>
        els
          .map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? '')
          .filter((href) => href.startsWith('/admin'))
      )
    expect(adminLinks).toEqual([])

    const fakeChatBubbles = await page
      .locator('[data-testid="chat-message"], [data-fake-chat="true"]')
      .count()
    expect(fakeChatBubbles).toBe(0)

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

  test('Family Fun Day flyer asset responds 200', async ({ request, baseURL }) => {
    const origin = baseURL ?? 'http://127.0.0.1:5173'
    const res = await request.get(`${origin}/kigh-media/events/family-fun-day-2026.jpeg`)
    expect(res.status()).toBe(200)
  })

  test('homepage DOM never leaks gallery submitter identity fields', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const html = await page.content()
    expect(html).not.toMatch(/submitted_by_email/i)
    expect(html).not.toMatch(/submitted_by_name/i)
    expect(html).not.toMatch(/submitted_by_user_id/i)
  })

  test('homepage never requests submitter PII columns from REST', async ({ page }) => {
    const piiRequestUrls: string[] = []
    page.on('request', (req) => {
      const url = req.url()
      if (
        url.includes('/rest/v1/gallery_images') &&
        /submitted_by_(email|name|user_id)/i.test(url)
      ) {
        piiRequestUrls.push(url)
      }
    })
    await page.goto('/', { waitUntil: 'networkidle' })
    expect(piiRequestUrls).toEqual([])
  })
})
