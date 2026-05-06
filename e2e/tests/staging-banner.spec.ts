import { test, expect } from '@playwright/test'

/**
 * The StagingBanner component is rendered whenever VITE_APP_ENV !==
 * 'production'. The hardening run defaults the local `.env` to
 * `VITE_APP_ENV=staging`, so this test is hermetic enough for the
 * default Playwright run. If the local environment overrides
 * VITE_APP_ENV to `production`, the test is skipped.
 *
 * The banner exposes `data-testid="staging-banner"` and
 * `data-env={appEnv}` so we can assert on the environment label too.
 */

test.describe('staging banner visibility', () => {
  test('shown on public pages when not in production', async ({ page }) => {
    await page.goto('/')

    const banner = page.getByTestId('staging-banner')

    if (process.env.VITE_APP_ENV === 'production') {
      // Banner must NOT be present in production builds.
      await expect(banner).toHaveCount(0)
      return
    }

    await expect(banner).toBeVisible()

    const env = await banner.getAttribute('data-env')
    expect(['staging', 'development']).toContain(env ?? '')

    await expect(banner).toContainText(/non-production environment/i)
  })

  test('shown on the shared login page when not in production', async ({ page }) => {
    if (process.env.VITE_APP_ENV === 'production') {
      test.skip(true, 'Banner is intentionally hidden in production')
    }
    await page.goto('/login')
    await expect(page.getByTestId('staging-banner')).toBeVisible()
  })
})
