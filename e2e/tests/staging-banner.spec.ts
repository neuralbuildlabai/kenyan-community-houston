import { test, expect } from '@playwright/test'

/**
 * The StagingBanner component is rendered whenever VITE_APP_ENV !==
 * 'production'. The hardening run defaults the local `.env` to
 * `VITE_APP_ENV=staging`, so this test is hermetic enough for the
 * default Playwright run.
 *
 * If the runtime environment is production (VITE_APP_ENV=production or
 * VITE_DEPLOYMENT_TYPE=production), the banner is intentionally absent
 * and the staging-banner assertions do not apply. We skip rather than
 * assert "no banner" so production-like runs can shape behaviour
 * independently — production tests for banner absence live with the
 * production-readiness suite.
 *
 * The banner exposes `data-testid="staging-banner"` and
 * `data-env={appEnv}` so we can assert on the environment label too.
 */

function shouldRequireStagingBanner(): boolean {
  const appEnv = process.env.VITE_APP_ENV?.toLowerCase()
  const deploymentType = process.env.VITE_DEPLOYMENT_TYPE?.toLowerCase()

  return (
    appEnv === 'staging' ||
    appEnv === 'development' ||
    deploymentType === 'staging' ||
    deploymentType === 'development'
  )
}

test.describe('staging banner visibility', () => {
  test('shown on public pages when not in production', async ({ page }) => {
    if (!shouldRequireStagingBanner()) {
      test.skip(true, 'Staging banner is required only in explicit staging/development test environments.')
    }
    await page.goto('/')

    const banner = page.getByTestId('staging-banner')
    await expect(banner).toBeVisible()

    const env = await banner.getAttribute('data-env')
    expect(['staging', 'development']).toContain(env ?? '')

    await expect(banner).toContainText(/non-production environment/i)
  })

  test('shown on the shared login page when not in production', async ({ page }) => {
    if (!shouldRequireStagingBanner()) {
      test.skip(true, 'Staging banner is required only in explicit staging/development test environments.')
    }
    await page.goto('/login')
    await expect(page.getByTestId('staging-banner')).toBeVisible()
  })
})
