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
