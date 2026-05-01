import { test, expect } from '@playwright/test'
import { expectNo404, expectNoPermanentLoading } from '../helpers/assertions'

const LEGAL = ['/terms', '/privacy', '/disclaimer'] as const

for (const path of LEGAL) {
  test(`legal page ${path}`, async ({ page }) => {
    await page.goto(path)
    await expectNoPermanentLoading(page)
    await expectNo404(page)
  })
}

test('footer legal links from home', async ({ page }) => {
  const paths = { Terms: '/terms', Privacy: '/privacy', Disclaimer: '/disclaimer' } as const
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  for (const label of ['Terms', 'Privacy', 'Disclaimer'] as const) {
    const link = footer.getByRole('link', { name: label }).first()
    await expect(link).toBeVisible()
    const path = paths[label]
    await Promise.all([page.waitForURL(`**${path}`), link.click()])
    await expectNo404(page)
    await page.goto('/')
  }
})
