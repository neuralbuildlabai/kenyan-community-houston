import { test, expect } from '@playwright/test'

/**
 * Archiving a memorial takes it offline. In production the edge refuses the
 * request outright (middleware.ts, covered by unit tests); these tests cover
 * the other way in — navigating inside the app — by stubbing the
 * memorial_states lookup, since the real state is admin-controlled.
 */
const INDEX_PATH = '/memorials'
const COLLO_PATH = '/memorials/collins-collo-namaswa'
const STATES_URL = /memorial_states/

const MEMORIAL_HEADING = 'Forever in Our Hearts'
const ARCHIVE_NOTICE = /no longer published/

async function stubState(
  page: import('@playwright/test').Page,
  rows: Array<{ slug: string; status: string }>
) {
  await page.route(STATES_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rows),
    })
  )
}

test.describe('memorial lifecycle', () => {
  test('index lists the memorial while it is published', async ({ page }) => {
    await stubState(page, [])
    await page.goto(INDEX_PATH)

    await expect(page.getByRole('heading', { name: 'Memorials', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Collins “Collo” Namaswa' })).toBeVisible()
  })

  test('index stops listing an archived memorial', async ({ page }) => {
    await stubState(page, [{ slug: 'collins-collo-namaswa', status: 'archived' }])
    await page.goto(INDEX_PATH)

    await expect(page.getByText('There are no memorials published at this time.')).toBeVisible()
    await expect(page.getByRole('link', { name: /Collins “Collo” Namaswa/ })).toHaveCount(0)
  })

  test('an archived memorial shows the notice instead of the page', async ({ page }) => {
    await stubState(page, [{ slug: 'collins-collo-namaswa', status: 'archived' }])
    await page.goto(COLLO_PATH)

    await expect(
      page.getByRole('heading', { name: 'This memorial has been archived' })
    ).toBeVisible()
    await expect(page.getByText(ARCHIVE_NOTICE)).toBeVisible()
    await expect(page.getByRole('link', { name: /View all memorials/ })).toBeVisible()
    // None of the memorial itself leaks into the notice.
    await expect(page.getByRole('heading', { name: MEMORIAL_HEADING })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /funeral program/i })).toHaveCount(0)
  })

  test('a published memorial renders in full with no notice', async ({ page }) => {
    await stubState(page, [])
    await page.goto(COLLO_PATH)

    await expect(page.getByRole('heading', { name: MEMORIAL_HEADING })).toBeVisible()
    await expect(page.getByText(ARCHIVE_NOTICE)).toHaveCount(0)
  })

  test('a failed state lookup keeps the memorial visible', async ({ page }) => {
    await page.route(STATES_URL, (route) => route.abort('failed'))

    await page.goto(COLLO_PATH)
    await expect(page.getByRole('heading', { name: MEMORIAL_HEADING })).toBeVisible()
    await expect(page.getByText(ARCHIVE_NOTICE)).toHaveCount(0)

    await page.goto(INDEX_PATH)
    await expect(page.getByRole('heading', { name: 'Collins “Collo” Namaswa' })).toBeVisible()
  })
})
