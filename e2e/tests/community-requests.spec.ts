import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test, expect } from '@playwright/test'
import { ALL_PUBLIC_NAV } from '../../src/lib/publicNav'
import { loginAsMember, skipIfNoMember } from '../helpers/auth'
import { loginAsAdmin, skipIfNoAdmin } from '../helpers/auth'

test.describe('Community Requests (/chat)', () => {
  test('migration 030 defines partial unique index for one active request per user', () => {
    const p = resolve(process.cwd(), 'supabase/migrations/030_community_requests_and_event_comments.sql')
    const sql = readFileSync(p, 'utf8')
    expect(sql).toContain('one_active_chat_thread_per_user')
    expect(sql).toContain('create_chat_request')
  })

  test('/chat loads for logged-out visitor', async ({ page }) => {
    await page.goto('/chat', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Community Requests' })).toBeVisible()
  })

  test('logged-out visitor sees login CTA', async ({ page }) => {
    await page.goto('/chat')
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
    await expect(page.getByText(/Please log in to start a request/i)).toBeVisible()
  })

  test('logged-out visitor does not see Start a Request form', async ({ page }) => {
    await page.goto('/chat')
    // "Sign in to start a request" is a heading too — use exact match so substring does not false-match.
    await expect(page.getByRole('heading', { name: 'Start a Request', exact: true })).toHaveCount(0)
    await expect(page.getByLabel(/Title \*/i)).toHaveCount(0)
  })

  test('login CTA points to login with return path', async ({ page }) => {
    await page.goto('/chat')
    const link = page.getByRole('link', { name: /sign in/i }).first()
    await expect(link).toHaveAttribute('href', /\/login\?next=%2Fchat/)
  })

  test('public nav includes Ask the Community', () => {
    const tos = ALL_PUBLIC_NAV.map((i) => i.to)
    expect(tos).toContain('/chat')
    const labels = ALL_PUBLIC_NAV.map((i) => i.label)
    expect(labels.some((l) => /ask the community/i.test(l))).toBeTruthy()
  })

  test('public nav does not expose admin chat routes', () => {
    const tos = ALL_PUBLIC_NAV.map((i) => i.to)
    expect(tos).not.toContain('/admin/chat')
    expect(tos).not.toContain('/admin/event-comments')
  })
})

test.describe('Community Requests — authenticated flows', () => {
  test('member can see Start a Request when no active thread (requires E2E_MEMBER_*)', async ({ page }) => {
    skipIfNoMember()
    await loginAsMember(page)
    await page.goto('/chat')
    await expect(page.getByRole('heading', { name: 'Start a Request', exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('title and message required on new request (requires E2E_MEMBER_*)', async ({ page }) => {
    skipIfNoMember()
    await loginAsMember(page)
    await page.goto('/chat')
    if (!(await page.getByRole('heading', { name: 'Start a Request', exact: true }).count())) {
      test.skip(true, 'Member has an active request; close it in Supabase or UI to run this test.')
    }
    await page.getByLabel(/Title \*/i).fill('ab')
    await page.getByLabel(/Message \*/i).fill('Valid message body for validation test.')
    await page.getByRole('button', { name: /^Start a Request$/i }).click()
    await expect(page.getByText(/Title must be between 5 and 120 characters/i)).toBeVisible()
  })

  test('member full create + close flow (requires E2E_MEMBER_* and clean thread state)', async ({ page }) => {
    skipIfNoMember()
    await loginAsMember(page)
    await page.goto('/chat')
    if ((await page.getByRole('heading', { name: 'Start a Request', exact: true }).count()) === 0) {
      test.skip(true, 'Active request already exists for this member.')
    }
    const title = `E2E help ${Date.now()}`
    await page.getByLabel(/Title \*/i).fill(title)
    await page.getByLabel(/Message \*/i).fill('Looking for a referral for a small community event.')
    await page.getByRole('button', { name: /^Start a Request$/i }).click()
    await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/You already have an open request/i)).toBeVisible()
    await page.getByRole('button', { name: /Close request/i }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: /^Close request$/i }).click()
    await expect(page.getByRole('heading', { name: 'Start a Request', exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('admin can open Community requests (requires E2E_ADMIN_*)', async ({ page }) => {
    skipIfNoAdmin()
    await loginAsAdmin(page)
    await page.goto('/admin/chat')
    await expect(page.getByRole('heading', { name: 'Community Requests' })).toBeVisible()
    await expect(page.getByText(/Review and respond to member help requests/i)).toBeVisible()
  })
})
