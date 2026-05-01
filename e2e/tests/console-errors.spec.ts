import { test, expect } from '@playwright/test'

const ROUTES = ['/', '/calendar', '/resources', '/membership', '/support', '/community-groups', '/serve'] as const

for (const route of ROUTES) {
  test(`no console errors on ${route}`, async ({ page }) => {
    const consoleErrors: string[] = []
    const pageErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const t = msg.text()
      if (t.includes('React Router Future')) return
      consoleErrors.push(t)
    })
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('load').catch(() => {})
    await page.waitForTimeout(1200)

    expect(pageErrors, `pageerror on ${route}`).toEqual([])
    expect(consoleErrors, `console.error on ${route}: ${consoleErrors.join(' | ')}`).toEqual([])
  })
}
