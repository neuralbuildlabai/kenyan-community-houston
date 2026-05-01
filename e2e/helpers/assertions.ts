import { expect, type Page } from '@playwright/test'

/** Waits out initial PageLoader / async shell; fails if loading text persists. */
export async function expectNoPermanentLoading(page: Page) {
  const loading = page.getByText('Loading…', { exact: true })
  try {
    await loading.first().waitFor({ state: 'visible', timeout: 2000 })
  } catch {
    return
  }
  await expect(loading).toHaveCount(0, { timeout: 45_000 })
}

export async function expectNo404(page: Page) {
  await expect(page.getByRole('heading', { name: 'Page Not Found' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Event Not Found' })).toHaveCount(0)
}

const PRIVATE_TERMS = [
  'Vendor spreadsheet',
  'Action Log',
  'Park Budget',
  'Certificate',
  'Original_Document',
  'kigh-private-documents',
  'storage_path',
  'original_filename',
  'kigh-private-review',
] as const

/** "Contacts" is too generic (e.g. Contact page); use narrower phrases where needed. */
export async function expectNoPrivateTerms(page: Page) {
  const html = await page.content()
  for (const term of PRIVATE_TERMS) {
    expect(html, `unexpected private term: ${term}`).not.toContain(term)
  }
  expect(html).not.toMatch(/\bIEN\b/i)
  expect(html).not.toMatch(/\bEIN\b/)
}
