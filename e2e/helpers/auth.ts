import { expect, test, type Page } from '@playwright/test'
import { hasAdminCredentials } from './env'

export function skipIfNoAdmin() {
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin tests')
}

export async function loginAsAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL?.trim()
  const password = process.env.E2E_ADMIN_PASSWORD?.trim()
  if (!email || !password) {
    throw new Error('loginAsAdmin called without E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD')
  }
  await page.goto('/admin/login')
  await page.getByLabel('Email', { exact: false }).fill(email)
  await page.getByLabel('Password', { exact: false }).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

export async function loginAsMember(page: Page) {
  const email = process.env.E2E_MEMBER_EMAIL?.trim()
  const password = process.env.E2E_MEMBER_PASSWORD?.trim()
  if (!email || !password) {
    throw new Error('loginAsMember called without E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD')
  }
  await page.goto('/login')
  await page.getByLabel('Email', { exact: false }).fill(email)
  await page.getByLabel('Password', { exact: false }).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/profile/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible()
}
