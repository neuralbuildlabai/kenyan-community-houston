import { test, expect } from '@playwright/test'
import { attachPublicConsoleErrorGuard } from '../helpers/consoleAllowlist'

const ROUTES = ['/', '/calendar', '/resources', '/membership', '/support', '/community-groups', '/serve'] as const

for (const route of ROUTES) {
  test(`no console errors on ${route}`, async ({ page }) => {
    const pageErrors: string[] = []
    const guard = attachPublicConsoleErrorGuard(page)

    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('load').catch(() => {})
    // Let late auth probe responses arrive before reconciling deferred 401 console lines.
    await page.waitForTimeout(1200)

    const consoleErrors = guard.getConsoleErrors()
    guard.detach()

    expect(pageErrors, `pageerror on ${route}`).toEqual([])
    expect(consoleErrors, `console.error on ${route}: ${consoleErrors.join(' | ')}`).toEqual([])
  })
}
