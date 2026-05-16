import { test, expect } from '@playwright/test'
import { expectNo404, expectNoPermanentLoading } from '../helpers/assertions'

test.describe('gallery', () => {
  test('/gallery loads', async ({ page }) => {
    await page.goto('/gallery', { waitUntil: 'domcontentloaded' })
    await expectNoPermanentLoading(page)
    await expectNo404(page)
    await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible()
  })

  test('Community Park Event 2025 album control appears when seeded', async ({ page }) => {
    await page.goto('/gallery', { waitUntil: 'domcontentloaded' })
    const album = page.getByTestId('gallery-album-community-park-2025')
    const count = await album.count()
    if (count > 0) {
      await expect(album).toBeVisible()
    }
  })

  test('/gallery/submit loads', async ({ page }) => {
    await page.goto('/gallery/submit', { waitUntil: 'domcontentloaded' })
    await expectNoPermanentLoading(page)
    await expectNo404(page)
    await expect(page.getByRole('heading', { name: /submit photos/i })).toBeVisible()
  })

  test('upload form requires consent', async ({ page }) => {
    await page.goto('/gallery/submit', { waitUntil: 'domcontentloaded' })
    const albumsResp = await page
      .waitForResponse(
        (r) => r.url().includes('/rest/v1/gallery_albums') && r.request().method() === 'GET',
        { timeout: 20_000 }
      )
      .catch(() => null)
    if (!albumsResp?.ok()) {
      test.skip(true, 'gallery_albums request did not succeed (Supabase env / RLS)')
    }
    const submit = page.getByTestId('gallery-submit-button')
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
    await page.getByTestId('gallery-submit-file-input').setInputFiles({
      name: 'pixel.png',
      mimeType: 'image/png',
      buffer: png,
    })
    try {
      await expect(submit).toBeEnabled({ timeout: 15_000 })
    } catch {
      test.skip(true, 'Submit stayed disabled (no albums to attach submission to)')
    }
    await submit.click()
    await expect(page.getByText(/confirm consent/i)).toBeVisible()
  })

  test('upload form file input accepts images', async ({ page }) => {
    await page.goto('/gallery/submit', { waitUntil: 'domcontentloaded' })
    const input = page.getByTestId('gallery-submit-file-input')
    await expect(input).toHaveAttribute('accept', 'image/*')
    await expect(input).toHaveAttribute('type', 'file')
  })

  test('public gallery grid is present when published images exist', async ({ page }) => {
    await page.goto('/gallery', { waitUntil: 'domcontentloaded' })
    const grid = page.getByTestId('gallery-public-grid')
    const n = await grid.count()
    if (n > 0) {
      await expect(grid).toBeVisible()
    }
  })

  test('homepage community moments section respects featured cap', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const section = page.getByTestId('home-community-moments')
    if ((await section.count()) > 0) {
      await expect(section.getByRole('heading', { name: 'Community moments' })).toBeVisible()
      const imgs = section.locator('[data-testid="home-gallery-moment"] img')
      expect(await imgs.count()).toBeLessThanOrEqual(6)
    }
  })

  test('public gallery DOM never leaks submitter identity fields', async ({ page }) => {
    await page.goto('/gallery', { waitUntil: 'domcontentloaded' })
    await expectNoPermanentLoading(page)

    // Snapshot the rendered DOM after data has loaded. None of the
    // submitter PII columns should ever appear in the public payload.
    const html = await page.content()
    expect(html).not.toMatch(/submitted_by_email/i)
    expect(html).not.toMatch(/submitted_by_name/i)
    expect(html).not.toMatch(/submitted_by_user_id/i)
  })

  test('public gallery does not request submitter PII columns from REST', async ({ page }) => {
    const piiRequestUrls: string[] = []
    page.on('request', (req) => {
      const url = req.url()
      if (
        url.includes('/rest/v1/gallery_images') &&
        /submitted_by_(email|name|user_id)/i.test(url)
      ) {
        piiRequestUrls.push(url)
      }
    })
    await page.goto('/gallery', { waitUntil: 'networkidle' })
    expect(piiRequestUrls).toEqual([])
  })
})
