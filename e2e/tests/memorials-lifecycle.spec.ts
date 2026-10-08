import { test, expect } from '@playwright/test'

/**
 * Memorial pages are printed QR destinations, so the permanent URL must
 * resolve whatever the lifecycle state says. These tests cover both the
 * promoted list and the archived presentation by stubbing the
 * memorial_states lookup, since the real state is admin-controlled.
 */
const INDEX_PATH = '/memorials'
const COLLO_PATH = '/memorials/collins-collo-namaswa'
const STATES_URL = /memorial_states/

test.describe('memorial lifecycle', () => {
  test('index lists the memorial when nothing is archived', async ({ page }) => {
    await page.route(STATES_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    )
    await page.goto(INDEX_PATH)

    await expect(page.getByRole('heading', { name: 'Memorials', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Collins “Collo” Namaswa' })).toBeVisible()
    await expect(page.getByText('Earlier memorials')).toHaveCount(0)
  })

  test('archiving moves the memorial to the quiet list but keeps the link', async ({ page }) => {
    await page.route(STATES_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ slug: 'collins-collo-namaswa', status: 'archived' }]),
      })
    )
    await page.goto(INDEX_PATH)

    await expect(page.getByText('Earlier memorials')).toBeVisible()
    const link = page.getByRole('link', { name: /Collins “Collo” Namaswa/ })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', COLLO_PATH)
  })

  test('the permanent URL resolves and keeps the program when archived', async ({ page }) => {
    await page.route(STATES_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ slug: 'collins-collo-namaswa', status: 'archived' }]),
      })
    )
    await page.goto(COLLO_PATH)

    await expect(page.getByRole('heading', { name: 'Forever in Our Hearts' })).toBeVisible()
    await expect(page.getByText('remains online in remembrance')).toBeVisible()
    // The funeral program and QR assets stay available.
    await expect(page.getByRole('link', { name: /program/i }).first()).toBeVisible()
  })

  test('shows no archive notice while the memorial is promoted', async ({ page }) => {
    await page.route(STATES_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    )
    await page.goto(COLLO_PATH)

    await expect(page.getByRole('heading', { name: 'Forever in Our Hearts' })).toBeVisible()
    await expect(page.getByText('remains online in remembrance')).toHaveCount(0)
  })

  test('renders the memorial even when the state lookup fails', async ({ page }) => {
    await page.route(STATES_URL, (route) => route.abort('failed'))
    await page.goto(COLLO_PATH)

    await expect(page.getByRole('heading', { name: 'Forever in Our Hearts' })).toBeVisible()
    await expect(page.getByText('remains online in remembrance')).toHaveCount(0)

    await page.goto(INDEX_PATH)
    await expect(page.getByRole('heading', { name: 'Collins “Collo” Namaswa' })).toBeVisible()
  })
})
