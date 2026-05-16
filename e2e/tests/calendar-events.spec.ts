import { test, expect } from '@playwright/test'

test.describe('calendar & seeded events', () => {
  test('submit event path is not captured as event slug', async ({ page }) => {
    await page.goto('/events/submit', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Submit an Event' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Event Not Found' })).toHaveCount(0)
  })

  test('tabs and category filters exist', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page.getByRole('button', { name: 'Upcoming' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Past' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'All' }).first()).toBeVisible()
  })

  test('Family Fun Day when seeded', async ({ page }) => {
    await page.goto('/calendar')
    const fun = page.getByRole('link', { name: /KIGH Family Fun Day/i })
    if (await fun.count()) {
      await expect(fun.first()).toBeVisible()
    }
  })

  test('Family Fun Day detail uses new flyer when event exists', async ({ page, request, baseURL }) => {
    const origin = baseURL ?? 'http://127.0.0.1:5173'
    const img = await request.get(`${origin}/kigh-media/events/family-fun-day-2026.jpeg`)
    expect(img.status()).toBe(200)

    await page.goto('/events/kigh-family-fun-day-2026', { waitUntil: 'domcontentloaded' })
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      return
    }
    const flyer = page.getByTestId('event-detail-flyer-img')
    await expect(flyer).toBeVisible()
    await expect(flyer).toHaveAttribute('src', /family-fun-day-2026\.jpeg/)
    const objectFit = await flyer.evaluate((el) => getComputedStyle(el).objectFit)
    expect(objectFit).toBe('contain')
    await expect(page.getByTestId('event-detail-title')).toBeVisible()
    await expect(page.getByTestId('event-detail-date')).toBeVisible()
    await expect(page.getByTestId('event-detail-location')).toBeVisible()
  })

  test('event detail flyer uses object-contain when any published event has a cover', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' })
    const eventLink = page.locator('a[href^="/events/"]:not([href*="submit"])').first()
    if ((await eventLink.count()) === 0) {
      test.skip(true, 'No published events in this environment')
    }
    const href = await eventLink.getAttribute('href')
    if (!href || href.includes('/submit')) {
      test.skip(true, 'No event detail link found')
    }
    await page.goto(href, { waitUntil: 'domcontentloaded' })
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      test.skip(true, 'Event not found')
    }
    const flyer = page.getByTestId('event-detail-flyer-img')
    if ((await flyer.count()) === 0) {
      test.skip(true, 'Event has no flyer image')
    }
    const objectFit = await flyer.evaluate((el) => getComputedStyle(el).objectFit)
    expect(objectFit).toBe('contain')
  })

  test('financial literacy detail shows Past event when session is in the past', async ({ page }) => {
    await page.goto('/events/kigh-financial-literacy-session-2026-04-24', { waitUntil: 'domcontentloaded' })
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      return
    }
    const shouldBePast = await page.evaluate(() => {
      const ymd = '2026-04-24'
      const d = new Date(`${ymd}T12:00:00`)
      const t = new Date()
      t.setHours(0, 0, 0, 0)
      d.setHours(0, 0, 0, 0)
      return d < t
    })
    if (!shouldBePast) {
      test.skip(true, 'Session start is still in the future for this runner clock')
    }
    await expect(page.getByText('Past event', { exact: true })).toBeVisible()
  })

  test('Financial Literacy session when seeded (past or all)', async ({ page }) => {
    await page.goto('/calendar')
    const lit = page.getByRole('link', { name: /Financial Literacy Session/i })
    if (!(await lit.count())) {
      await page.getByRole('button', { name: 'Past' }).click()
    }
    if (await lit.count()) {
      await expect(lit.first()).toBeVisible()
    } else {
      await page.getByRole('button', { name: 'All' }).first().click()
      if (await lit.count()) {
        await expect(lit.first()).toBeVisible()
      }
    }
  })

  test('no standalone public calendar row for archived tax event slug', async ({ page }) => {
    await page.goto('/calendar')
    await page.getByRole('button', { name: 'All' }).first().click()
    await expect(page.locator('a[href*="tax-presentation-04-24-2026"]')).toHaveCount(0)
  })

  test('financial literacy detail materials order when event exists', async ({ page }) => {
    await page.goto('/events/kigh-financial-literacy-session-2026-04-24')
    if (await page.getByRole('heading', { name: 'Event Not Found' }).isVisible()) {
      return
    }
    const section = page.getByRole('heading', { name: 'Related materials' })
    if (!(await section.isVisible())) {
      return
    }
    const lit = page.getByRole('link', { name: /KIGH Financial Literacy/i }).first()
    const hr = page.getByRole('link', { name: /HR and Benefits - Joyce Marendes/i }).first()
    const tax = page.getByRole('link', { name: /Tax Presentation 04-24-2026/i }).first()
    await expect(lit).toBeVisible()
    await expect(hr).toBeVisible()
    await expect(tax).toBeVisible()
    const yLit = await lit.evaluate((el) => (el as HTMLElement).getBoundingClientRect().top)
    const yHr = await hr.evaluate((el) => (el as HTMLElement).getBoundingClientRect().top)
    const yTax = await tax.evaluate((el) => (el as HTMLElement).getBoundingClientRect().top)
    expect(yLit, 'KIGH Financial Literacy first').toBeLessThanOrEqual(yHr + 2)
    expect(yHr, 'HR before tax').toBeLessThanOrEqual(yTax + 2)
  })
})
