import { test, expect } from '@playwright/test'
import { expectNo404, expectNoPermanentLoading } from '../helpers/assertions'
import {
  COLLINS_COLLO_NAMASWA,
  memorialPath,
} from '../../src/lib/memorials'

const memorialRoute = memorialPath(COLLINS_COLLO_NAMASWA.slug)

test.describe('Collins Collo Namaswa memorial', () => {
  test('memorial route renders with identity and program links', async ({ page }) => {
    await page.goto(memorialRoute)
    await expectNoPermanentLoading(page)
    await expectNo404(page)

    await expect(page.getByRole('heading', { level: 1, name: /Forever in Our Hearts/i })).toBeVisible()
    await expect(page.getByText('Collins “Collo” Namaswa').first()).toBeVisible()
    await expect(page.getByText('Judy Cheruto and Nixon Namaswa Wetende', { exact: true })).toBeVisible()
    await expect(page.getByText('Trevor Kiplangat', { exact: true })).toBeVisible()

    const viewLink = page.getByRole('link', { name: /View funeral program/i })
    const downloadLink = page.getByRole('link', { name: /Download funeral program/i })
    await expect(viewLink).toHaveAttribute('href', COLLINS_COLLO_NAMASWA.funeralProgramPath)
    await expect(downloadLink).toHaveAttribute('href', COLLINS_COLLO_NAMASWA.funeralProgramPath)

    const qr = page.getByRole('img', { name: /Scan For Funeral Program/i })
    await expect(qr).toBeVisible()
    await expect(qr).toHaveAttribute('src', COLLINS_COLLO_NAMASWA.qrPngPath)
    await expect(page.getByRole('heading', { name: /Scan For Funeral Program/i })).toBeVisible()

    // Soft privacy check — private residence must not appear on the public page.
    const html = await page.content()
    expect(html).not.toMatch(/Glow Berry/i)
  })

  test('PDF and QR assets are reachable', async ({ request }) => {
    const pdf = await request.get(COLLINS_COLLO_NAMASWA.funeralProgramPath)
    expect(pdf.ok()).toBeTruthy()
    expect(pdf.headers()['content-type'] || '').toMatch(/pdf/i)

    const png = await request.get(COLLINS_COLLO_NAMASWA.qrPngPath)
    expect(png.ok()).toBeTruthy()

    const printPng = await request.get(COLLINS_COLLO_NAMASWA.qrPrintPngPath)
    expect(printPng.ok()).toBeTruthy()

    const svg = await request.get(COLLINS_COLLO_NAMASWA.qrSvgPath)
    expect(svg.ok()).toBeTruthy()
  })

  test('memorials index and community-support entry points link correctly', async ({ page }) => {
    await page.goto('/memorials')
    await expectNo404(page)
    const card = page.getByRole('link', { name: /Collins “Collo” Namaswa/i })
    await expect(card).toBeVisible()
    await Promise.all([page.waitForURL(`**${memorialRoute}`), card.click()])
    await expect(page.getByRole('heading', { level: 1, name: /Forever in Our Hearts/i })).toBeVisible()

    await page.goto('/community-support')
    await expectNo404(page)
    const entry = page.getByRole('link', { name: /Visit memorial/i })
    await expect(entry).toBeVisible()
    await expect(entry).toHaveAttribute('href', memorialRoute)
  })

  test('footer memorials link reaches the index', async ({ page }) => {
    await page.goto('/')
    const footer = page.getByRole('contentinfo')
    const link = footer.getByRole('link', { name: 'Memorials' })
    await expect(link).toBeVisible()
    await Promise.all([page.waitForURL('**/memorials'), link.click()])
    await expectNo404(page)
  })

  test('refresh on memorial URL keeps the page', async ({ page }) => {
    await page.goto(memorialRoute)
    await expect(page.getByRole('heading', { level: 1, name: /Forever in Our Hearts/i })).toBeVisible()
    await page.reload()
    await expectNo404(page)
    await expect(page.getByRole('heading', { level: 1, name: /Forever in Our Hearts/i })).toBeVisible()
  })
})
