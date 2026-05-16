import { test, expect } from '@playwright/test'

test.describe('public header login visibility', () => {
  test('desktop header shows Login for logged-out visitors', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const login = page.getByTestId('header-login')
    await expect(login).toBeVisible()
    await expect(login).toHaveAttribute('href', '/login')
  })

  test('mobile header and menu show Login for logged-out visitors', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/gallery', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('header-login-mobile')).toBeVisible()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByTestId('header-login-menu')).toBeVisible()
    await expect(page.getByTestId('header-login-menu')).toHaveAttribute('href', '/login')
  })

  test('public nav does not expose admin dashboard routes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const adminLinks = await page
      .locator('header a[href^="/admin"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href))
    expect(adminLinks).toEqual([])
  })
})

test.describe('auth return links', () => {
  test('community feed sign-in preserves next path', async ({ page }) => {
    await page.goto('/community-feed', { waitUntil: 'domcontentloaded' })
    const link = page.getByTestId('community-feed-sign-in')
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toContain('/login?next=')
    expect(decodeURIComponent(href!.split('next=')[1] ?? '')).toContain('/community-feed')
  })

  test('event comments sign-in includes hash when event exists', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' })
    const eventLink = page.locator('a[href^="/events/"]:not([href*="submit"])').first()
    if ((await eventLink.count()) === 0) {
      test.skip(true, 'No published events')
    }
    const href = await eventLink.getAttribute('href')
    if (!href) test.skip(true, 'No event link')
    await page.goto(href, { waitUntil: 'domcontentloaded' })
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      test.skip(true, 'Event not found')
    }
    const signIn = page.getByTestId('event-comments-sign-in')
    if ((await signIn.count()) === 0) {
      test.skip(true, 'Already signed in or comments hidden')
    }
    const loginHref = await signIn.getAttribute('href')
    expect(loginHref).toContain('%23comments')
  })
})
