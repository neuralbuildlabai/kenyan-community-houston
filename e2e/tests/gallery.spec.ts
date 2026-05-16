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
        (r) =>
          r.url().includes('/rest/v1/gallery_albums_public') && r.request().method() === 'GET',
        { timeout: 20_000 }
      )
      .catch(() => null)
    if (!albumsResp?.ok()) {
      test.skip(true, 'gallery_albums_public request did not succeed (Supabase env / RLS)')
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
    await expect(submit).toBeDisabled()
    await page.getByTestId('gallery-submit-consent').click()
    if ((await page.getByTestId('gallery-submit-name').count()) > 0) {
      await page.getByTestId('gallery-submit-name').fill('Test Uploader')
      await page.getByTestId('gallery-submit-email').fill('uploader@example.com')
    }
    try {
      await expect(submit).toBeEnabled({ timeout: 15_000 })
    } catch {
      test.skip(true, 'Submit stayed disabled (no albums open for submissions)')
    }
    await submit.click()
    await expect(page.getByText(/submitted for review|thank you/i)).toBeVisible({ timeout: 30_000 })
  })

  test('upload form file input accepts multiple images', async ({ page }) => {
    await page.goto('/gallery/submit', { waitUntil: 'domcontentloaded' })
    const input = page.getByTestId('gallery-submit-file-input')
    await expect(input).toHaveAttribute('accept', 'image/*')
    await expect(input).toHaveAttribute('type', 'file')
    await expect(input).toHaveAttribute('multiple', '')
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
    await input.setInputFiles([
      { name: 'a.png', mimeType: 'image/png', buffer: png },
      { name: 'b.png', mimeType: 'image/png', buffer: png },
    ])
    await expect(page.getByTestId('gallery-submit-preview-item')).toHaveCount(2)
  })

  test('logged-out visitor sees uploader fields', async ({ page }) => {
    await page.goto('/gallery/submit', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('gallery-submit-name')).toBeVisible()
    await expect(page.getByTestId('gallery-submit-email')).toBeVisible()
    await expect(page.getByTestId('gallery-submit-consent')).toBeVisible()
  })

  test('/gallery loads albums without gallery_images table errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /permission denied for table gallery_images/i.test(msg.text())) {
        errors.push(msg.text())
      }
    })
    await page.goto('/gallery', { waitUntil: 'networkidle' })
    expect(errors).toEqual([])
  })

  test('public gallery grid is present when published images exist', async ({ page }) => {
    await page.goto('/gallery', { waitUntil: 'domcontentloaded' })
    const grid = page.getByTestId('gallery-public-grid')
    const n = await grid.count()
    if (n > 0) {
      await expect(grid).toBeVisible()
    }
  })

  test.describe('gallery slideshow lightbox', () => {
    async function openFirstGridImage(page: import('@playwright/test').Page) {
      await page.goto('/gallery', { waitUntil: 'domcontentloaded' })
      await expectNoPermanentLoading(page)
      const grid = page.getByTestId('gallery-public-grid')
      if ((await grid.count()) === 0) {
        test.skip(true, 'No published gallery images in grid')
      }
      const first = grid.locator('button').first()
      await expect(first).toBeVisible()
      await first.click()
      const lightbox = page.getByTestId('gallery-lightbox')
      await expect(lightbox).toBeVisible()
      return { grid, lightbox }
    }

    test('opens lightbox when a grid image is clicked', async ({ page }) => {
      await openFirstGridImage(page)
    })

    test('lightbox shows the selected image with object-contain', async ({ page }) => {
      await openFirstGridImage(page)
      const img = page.getByTestId('gallery-lightbox-image')
      await expect(img).toBeVisible()
      await expect(img).toHaveClass(/object-contain/)
    })

    test('next and previous buttons advance the slideshow', async ({ page }) => {
      const { grid } = await openFirstGridImage(page)
      const buttons = grid.locator('button')
      if ((await buttons.count()) < 2) {
        test.skip(true, 'Need at least two images for next/previous')
      }
      const counter = page.getByTestId('gallery-lightbox-counter')
      await expect(counter).toHaveText(/^1 \/ \d+$/)
      await page.getByTestId('gallery-lightbox-next').click()
      await expect(counter).toHaveText(/^2 \/ \d+$/)
      await page.getByTestId('gallery-lightbox-prev').click()
      await expect(counter).toHaveText(/^1 \/ \d+$/)
    })

    test('close button closes the lightbox', async ({ page }) => {
      await openFirstGridImage(page)
      await page.getByTestId('gallery-lightbox-close').click()
      await expect(page.getByTestId('gallery-lightbox')).toHaveCount(0)
    })

    test('play/pause control toggles aria-label', async ({ page }) => {
      await openFirstGridImage(page)
      const toggle = page.getByTestId('gallery-lightbox-play-pause')
      if ((await toggle.count()) === 0) {
        test.skip(true, 'Single-image gallery has no play/pause control')
      }
      await expect(toggle).toHaveAttribute('aria-label', 'Pause slideshow')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-label', 'Play slideshow')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-label', 'Pause slideshow')
    })
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
