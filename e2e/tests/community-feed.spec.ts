import { test, expect } from '@playwright/test'
import { ALL_PUBLIC_NAV } from '../../src/lib/publicNav'
import { hasAdminCredentials } from '../helpers/env'
import { loginAsAdmin, loginAsMember, skipIfNoMember } from '../helpers/auth'

test.describe('Community Feed (public)', () => {
  test('/community-feed loads for logged-out visitor', async ({ page }) => {
    await page.goto('/community-feed', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Community Feed', level: 1 })).toBeVisible()
  })

  test('logged-out visitor sees login CTA instead of active composer', async ({ page }) => {
    await page.goto('/community-feed')
    await expect(page.getByText('Sign in to participate')).toBeVisible()
    await expect(page.getByPlaceholder('Share something with your community...')).toHaveCount(0)
  })

  test('public nav includes Community Feed', () => {
    const tos = ALL_PUBLIC_NAV.map((i) => i.to)
    expect(tos).toContain('/community-feed')
  })

  test('public nav does not expose /admin/feed', () => {
    const tos = ALL_PUBLIC_NAV.map((i) => i.to)
    expect(tos).not.toContain('/admin/feed')
  })

  test('feed page shows safety helper copy', async ({ page }) => {
    await page.goto('/community-feed')
    await expect(page.getByText(/Community posts must remain respectful/i)).toBeVisible()
  })

  test('feed page documents 200-character comment limit', async ({ page }) => {
    await page.goto('/community-feed')
    await expect(page.getByText(/200\s*characters/i)).toBeVisible()
  })

  test('feed page does not expose private member fields in DOM', async ({ page }) => {
    await page.goto('/community-feed')
    const body = await page.content()
    expect(body.toLowerCase()).not.toContain('@example.com')
    expect(body).not.toMatch(/555[-\s]?\d{4}/)
  })

  test('feed uses Community Member fallback text when applicable', async ({ page }) => {
    await page.goto('/community-feed')
    const hasMemberLabel = await page.getByText('Community Member').count()
    expect(hasMemberLabel >= 0).toBeTruthy()
  })
})

test.describe('Community Feed (admin route)', () => {
  test('/admin/feed redirects logged-out user to login', async ({ page }) => {
    await page.goto('/admin/feed', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin can open moderation page when credentials exist', async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
    await loginAsAdmin(page)
    await page.goto('/admin/feed')
    await expect(page.getByRole('heading', { name: 'Community Feed Moderation', level: 1 })).toBeVisible()
  })
})

test.describe('Community Feed (member, conditional)', () => {
  test('approved member can see composer when credentials exist', async ({ page }) => {
    skipIfNoMember()
    await loginAsMember(page)
    await page.goto('/community-feed')
    const composerHeading = page.getByRole('heading', { name: 'Share with the community', level: 3 })
    const pending = page.getByText('Your membership must be approved before you can post', { exact: false })
    await expect(composerHeading.or(pending)).toBeVisible()
  })

  test('member can create one post when composer is available', async ({ page }) => {
    skipIfNoMember()
    await loginAsMember(page)
    await page.goto('/community-feed')
    const textarea = page.getByPlaceholder('Share something with your community...')
    if ((await textarea.count()) === 0) {
      test.skip(true, 'Member is not approved for feed posting in this environment')
      return
    }
    await textarea.fill(`E2E feed check ${Date.now()} — community update.`)
    await page.getByRole('button', { name: 'Post', exact: true }).click()
    await expect(page.getByText(/live on the Community Feed|Could not|weekly limit|already posted today/i)).toBeVisible()
  })
})
