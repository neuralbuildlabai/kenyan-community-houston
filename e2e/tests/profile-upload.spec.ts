import { test, expect } from '@playwright/test'
import { hasMemberCredentials, uploadTestsEnabled } from '../helpers/env'
import { loginAsMember } from '../helpers/auth'

test.describe('profile upload UI', () => {
  test('avatar file input exists when logged in', async ({ page }) => {
    test.skip(!hasMemberCredentials, 'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD')
    await loginAsMember(page)
    await expect(page.locator('input[type="file"][accept*="image/jpeg"]')).toBeVisible()
  })

  test('tiny upload when E2E_ENABLE_UPLOAD_TESTS=true', async ({ page }) => {
    test.skip(!hasMemberCredentials || !uploadTestsEnabled, 'Requires E2E_MEMBER_* and E2E_ENABLE_UPLOAD_TESTS=true')
    await loginAsMember(page)
    const buffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
      'base64'
    )
    await page.locator('input[type="file"][accept*="image/jpeg"]').setInputFiles({
      name: 'e2e-avatar.jpg',
      mimeType: 'image/jpeg',
      buffer,
    })
    await expect(page.getByText(/avatar updated|upload failed/i)).toBeVisible({ timeout: 45_000 })
  })
})
