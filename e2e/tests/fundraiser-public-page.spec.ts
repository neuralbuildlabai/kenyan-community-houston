import { test, expect, type Page } from '@playwright/test'

/**
 * The public fundraiser page: progress, donation options, sharing, and the
 * collections table.
 *
 * Every scenario is served from an intercepted Supabase response rather
 * than from rows in a real project. The figures being checked ($1,500 of
 * $2,000, exactly $2,000, $2,250) are arithmetic, and inventing confirmed
 * donations in a live database to prove arithmetic would be a bad trade.
 *
 * Nothing here signs in — that is the point of most of it.
 */

const SLUG = 'e2e-community-festival-fundraiser'
const TITLE = 'Community festival fundraiser'
const GOAL = 2000

/** `PUBLIC_SITE_URL`'s fallback: what a share link must use, never the test host. */
const PRODUCTION_ORIGIN = 'https://www.kenyansingreaterhouston.org'
const PUBLIC_URL = `${PRODUCTION_ORIGIN}/community-support/${SLUG}`

const PRIVATE_NOTE = 'Deposited 2026-10-02, ref CA-5512'
const HIDDEN_DONOR = 'Anonymous Giver Who Asked To Stay Private'

type Row = Record<string, unknown>

function fundraiser(overrides: Row = {}): Row {
  return {
    id: 'ffffffff-0000-4000-8000-000000000001',
    slug: SLUG,
    title: TITLE,
    category: 'Community Project',
    summary: 'Help us take part in the community festival.',
    body: 'Donations are tax-deductible to the extent permitted by law.',
    image_url: null,
    beneficiary_name: 'Kenyans in Greater Houston (KIGH)',
    organizer_name: 'Kenyans in Greater Houston (KIGH)',
    goal_amount: GOAL,
    raised_amount: 0,
    donation_url: null,
    funding_mode: 'internal',
    donations_closed: false,
    is_homepage_featured: false,
    payment_reference: 'Festival',
    collections_updated_at: null,
    deadline: null,
    verification_status: 'verified',
    status: 'published',
    published_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

/** Only the columns anon is granted — mirrors what the database would send. */
function collection(id: string, received_on: string, amount: number, description: string, extra: Row = {}): Row {
  return {
    id,
    fundraiser_id: fundraiser().id,
    received_on,
    amount,
    description,
    entry_type: 'individual',
    public_donor_name: null,
    created_at: `${received_on}T12:00:00.000Z`,
    updated_at: `${received_on}T12:00:00.000Z`,
    ...extra,
  }
}

async function serveFundraiser(
  page: Page,
  { rows, collections }: { rows: Row[]; collections: Row[] }
) {
  await page.route('**/rest/v1/fundraisers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(rows),
    })
  })
  await page.route('**/rest/v1/fundraiser_collections**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(collections),
    })
  })
}

async function openFundraiser(page: Page, collections: Row[], overrides: Row = {}) {
  await serveFundraiser(page, { rows: [fundraiser(overrides)], collections })
  await page.goto(`/community-support/${SLUG}`)
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible()
}

const progressBar = (page: Page) => page.getByTestId('fundraiser-progress').getByRole('progressbar')

test.describe('fundraiser progress and goal status', () => {
  test('shows 75% raised and $500 remaining at $1,500 of a $2,000 goal', async ({ page }) => {
    await openFundraiser(page, [
      collection('c1', '2026-10-01', 1000, 'Cash App collections', { entry_type: 'batch' }),
      collection('c2', '2026-10-05', 500, 'Business contribution'),
    ])

    await expect(page.getByTestId('fundraiser-collected')).toHaveText('$1,500')
    await expect(page.getByTestId('fundraiser-goal')).toHaveText('$2,000')
    await expect(page.getByTestId('fundraiser-percent')).toHaveText('75%')
    await expect(page.getByTestId('fundraiser-remaining')).toHaveText('$500')
    await expect(page.getByTestId('fundraiser-goal-reached')).toHaveCount(0)
    await expect(progressBar(page)).toHaveAttribute('aria-valuenow', '75')
  })

  test('announces the goal reached with nothing remaining at exactly $2,000', async ({ page }) => {
    await openFundraiser(page, [collection('c1', '2026-10-01', 2000, 'Cash App collections')])

    await expect(page.getByTestId('fundraiser-collected')).toHaveText('$2,000')
    await expect(page.getByTestId('fundraiser-goal-reached')).toHaveText('Goal reached')
    await expect(page.getByTestId('fundraiser-percent')).toHaveText('100%')
    await expect(page.getByTestId('fundraiser-remaining')).toHaveText('$0')
  })

  test('keeps the real figures past the goal with the bar capped at 100%', async ({ page }) => {
    await openFundraiser(page, [
      collection('c1', '2026-10-01', 2000, 'Cash App collections'),
      collection('c2', '2026-10-06', 250, 'Business contribution'),
    ])

    await expect(page.getByTestId('fundraiser-collected')).toHaveText('$2,250')
    await expect(page.getByTestId('fundraiser-percent')).toHaveText('112.5%')
    await expect(page.getByTestId('fundraiser-overage')).toHaveText('$250')
    await expect(page.getByTestId('fundraiser-goal-reached')).toBeVisible()

    const bar = progressBar(page)
    await expect(bar).toHaveAttribute('aria-valuenow', '100')
    await expect(bar).toHaveAttribute('aria-valuemax', '100')
    // The bar is clamped; the accessible value still reports the truth.
    await expect(bar).toHaveAttribute('aria-valuetext', '112.5%')
  })

  test('starts at $0 collected with no confirmed records', async ({ page }) => {
    await openFundraiser(page, [])

    await expect(page.getByTestId('fundraiser-collected')).toHaveText('$0')
    await expect(page.getByTestId('fundraiser-remaining')).toHaveText('$2,000')
    await expect(page.getByTestId('fundraiser-collections-empty')).toBeVisible()
  })

  test('does not imply live payment tracking', async ({ page }) => {
    await openFundraiser(page, [collection('c1', '2026-10-01', 100, 'Cash App collections')])
    await expect(
      page.getByText('Confirmed collections, updated manually by KIGH.').first()
    ).toBeVisible()
  })
})

test.describe('collections table', () => {
  test('lists each receipt with a running total that matches the headline figure', async ({ page }) => {
    await openFundraiser(page, [
      collection('c1', '2026-10-01', 1000, 'Cash App collections', { entry_type: 'batch' }),
      collection('c2', '2026-10-05', 500, 'Business contribution', {
        public_donor_name: 'Acme Catering LLC',
      }),
      collection('c3', '2026-10-07', 250, 'Cash collections at service'),
    ])

    const table = page.getByTestId('fundraiser-collections')
    for (const header of ['Date received', 'Source / description', 'Amount', 'Running total']) {
      await expect(table.getByRole('columnheader', { name: header })).toBeVisible()
    }

    const rows = page.getByTestId('fundraiser-collection-row')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('$1,000')
    await expect(rows.nth(1)).toContainText('$1,500')
    await expect(rows.nth(2)).toContainText('$1,750')

    await expect(page.getByTestId('fundraiser-collections-total')).toHaveText('$1,750')
    await expect(page.getByTestId('fundraiser-collected')).toHaveText('$1,750')

    await expect(table).toContainText('Batch of confirmed receipts')
    await expect(table).toContainText('Acme Catering LLC')
  })

  test('keeps donors anonymous and private notes off the page', async ({ page }) => {
    await openFundraiser(page, [
      // What the database actually grants anon: a published donor name, and
      // no column at all for the private note or an unpublished name.
      collection('c1', '2026-10-01', 1000, 'Cash App collections'),
      collection('c2', '2026-10-05', 500, 'Business contribution', {
        public_donor_name: 'Acme Catering LLC',
      }),
    ])

    const body = await page.content()
    expect(body).not.toContain(PRIVATE_NOTE)
    expect(body).not.toContain(HIDDEN_DONOR)
    expect(body).toContain('Acme Catering LLC')
  })

  test('never asks the database for private columns', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/rest/v1/fundraiser')) requested.push(decodeURIComponent(r.url()))
    })
    await openFundraiser(page, [collection('c1', '2026-10-01', 500, 'Cash App collections')])
    await expect(page.getByTestId('fundraiser-collections-total')).toBeVisible()

    expect(requested.length).toBeGreaterThan(0)
    for (const url of requested) {
      expect(url).not.toContain('select=*')
      expect(url).not.toContain('private_note')
      expect(url).not.toContain('organizer_contact')
      expect(url.replace(/public_donor_name/g, '')).not.toContain('donor_name')
    }
  })
})

test.describe('donating without an account', () => {
  test('a signed-out visitor gets the same handles as Ways to Support', async ({ page }) => {
    await page.goto('/support')
    await expect(page.getByRole('heading', { name: 'Ways to support KIGH' })).toBeVisible()
    const handles = await page.locator('.font-mono').allInnerTexts()
    expect(handles.length).toBeGreaterThan(0)

    await openFundraiser(page, [])

    const donate = page.getByTestId('fundraiser-donate')
    await expect(donate).toBeVisible()
    for (const handle of handles) {
      await expect(donate.getByText(handle, { exact: true })).toBeVisible()
    }
    await expect(donate.getByRole('button', { name: 'Copy' }).first()).toBeVisible()
    await expect(donate.getByText('Organized by KIGH')).toBeVisible()
  })

  test('tells donors what reference to put in the payment note', async ({ page }) => {
    await openFundraiser(page, [])
    await expect(page.getByTestId('fundraiser-payment-note')).toHaveText(
      'Include “Festival” in your payment note.'
    )
  })

  test('falls back to the fundraiser title when no reference is configured', async ({ page }) => {
    await openFundraiser(page, [], { payment_reference: null })
    await expect(page.getByTestId('fundraiser-payment-note')).toHaveText(
      `Include “${TITLE}” in your payment note.`
    )
  })

  test('attributes an internal fundraiser to KIGH', async ({ page }) => {
    await openFundraiser(page, [])
    await expect(page.getByTestId('fundraiser-organizer')).toHaveText('Organized by KIGH')
  })

  test('puts no sign-in step in front of the donation options', async ({ page }) => {
    await openFundraiser(page, [])
    await expect(page).toHaveURL(new RegExp(`/community-support/${SLUG}$`))
    await expect(page.getByTestId('fundraiser-donate')).toBeVisible()
    await expect(page.getByText(/sign in to donate|log in to donate/i)).toHaveCount(0)
  })

  test('keeps donating available after the goal is reached', async ({ page }) => {
    await openFundraiser(page, [collection('c1', '2026-10-01', 2500, 'Cash App collections')])
    await expect(page.getByTestId('fundraiser-goal-reached')).toBeVisible()
    await expect(page.getByTestId('fundraiser-donate')).toBeVisible()
  })

  test('shows a closed notice only when an admin closed donations', async ({ page }) => {
    await openFundraiser(page, [], { donations_closed: true })
    await expect(page.getByTestId('fundraiser-donations-closed')).toBeVisible()
    await expect(page.getByTestId('fundraiser-donate')).toHaveCount(0)
  })

  test('keeps an external fundraiser on its own donation link', async ({ page }) => {
    await openFundraiser(page, [], {
      funding_mode: 'external',
      donation_url: 'https://www.gofundme.com/f/example-campaign',
    })
    const link = page.getByTestId('fundraiser-donate-external')
    await expect(link).toHaveAttribute('href', 'https://www.gofundme.com/f/example-campaign')
    await expect(link).toHaveAttribute('rel', /noopener/)
  })

  test('renders donation options exactly once', async ({ page }) => {
    await openFundraiser(page, [])
    await expect(page.getByTestId('fundraiser-donate')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: 'Donate', exact: true })).toHaveCount(1)
  })
})

test.describe('sharing', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  })

  test('shares the permanent production URL with an encoded message', async ({ page }) => {
    await openFundraiser(page, [])

    await expect(page.getByTestId('fundraiser-share-url')).toHaveText(PUBLIC_URL)

    const href = await page.getByTestId('fundraiser-share-whatsapp').getAttribute('href')
    expect(href).not.toBeNull()
    expect(href!.startsWith('https://wa.me/?text=')).toBe(true)

    const message = decodeURIComponent(href!.slice('https://wa.me/?text='.length))
    expect(message).toBe(`Support ${TITLE}. Our goal is $2,000. Read more and donate: ${PUBLIC_URL}`)

    // Nothing from the machine running the test leaks into the share link.
    expect(href).not.toContain('127.0.0.1')
    expect(href).not.toContain('localhost')
    expect(href).not.toContain('/admin')
    // Spaces and the query separator must be escaped or WhatsApp truncates.
    expect(href).not.toMatch(/text=.*\s/)
  })

  test('confirms visibly when the link is copied', async ({ page }) => {
    await openFundraiser(page, [])

    const copyButton = page.getByTestId('fundraiser-copy-link')
    await expect(copyButton).toHaveText('Copy link')
    await copyButton.click()

    await expect(copyButton).toHaveText('Copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(PUBLIC_URL)
  })

  test('copies from the keyboard with a visible focus state', async ({ page }) => {
    await openFundraiser(page, [])

    await page.getByTestId('fundraiser-share-whatsapp').focus()
    await page.keyboard.press('Tab')
    const copyButton = page.getByTestId('fundraiser-copy-link')
    await expect(copyButton).toBeFocused()
    expect(await copyButton.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none')

    await page.keyboard.press('Enter')
    await expect(copyButton).toHaveText('Copied')
  })

  test('sets link-preview metadata pointing at the permanent URL', async ({ page }) => {
    await openFundraiser(page, [])

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', PUBLIC_URL)
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', PUBLIC_URL)
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      new RegExp(`^${TITLE}`)
    )
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      'Help us take part in the community festival.'
    )
    // A fundraiser with no image falls back to the KIGH branded card.
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /og-image\.png$/
    )
  })
})

test.describe('publication', () => {
  test('a pending fundraiser has no public page', async ({ page }) => {
    // Published-only query: the database returns nothing for a pending row.
    await serveFundraiser(page, { rows: [], collections: [] })
    await page.goto('/community-support/e2e-pending-fundraiser')

    await expect(page.getByRole('heading', { name: 'Fundraiser Not Found' })).toBeVisible()
    await expect(page.getByTestId('fundraiser-donate')).toHaveCount(0)
    await expect(page.getByTestId('fundraiser-share')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('the listing links to each approved fundraiser', async ({ page }) => {
    await serveFundraiser(page, { rows: [fundraiser()], collections: [] })
    await page.goto('/community-support')

    const link = page.getByTestId('fundraiser-card-link').first()
    await expect(link).toHaveText(/View fundraiser/)
    await expect(link).toHaveAttribute('href', `/community-support/${SLUG}`)
  })

  test('Community Support is reachable from the site navigation', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.locator('a[href="/community-support"]').first()
    ).toHaveCount(1)
  })
})

test.describe('homepage feature', () => {
  test('links to the public page and shows the saved totals', async ({ page }) => {
    await serveFundraiser(page, {
      rows: [fundraiser({ is_homepage_featured: true, raised_amount: 1500 })],
      collections: [],
    })
    await page.goto('/')

    const card = page.getByTestId('home-featured-fundraiser')
    await expect(card).toBeVisible()
    await expect(card).toContainText(TITLE)
    await expect(page.getByTestId('home-featured-fundraiser-totals')).toContainText(
      '$1,500 collected of $2,000 goal'
    )
    await expect(page.getByTestId('home-featured-fundraiser-cta')).toHaveAttribute(
      'href',
      `/community-support/${SLUG}`
    )
  })

  test('stays on the homepage once the goal is reached', async ({ page }) => {
    await serveFundraiser(page, {
      rows: [fundraiser({ is_homepage_featured: true, raised_amount: 2000 })],
      collections: [],
    })
    await page.goto('/')

    const card = page.getByTestId('home-featured-fundraiser')
    await expect(card).toBeVisible()
    await expect(card).toContainText('Goal reached')
  })

  test('shows nothing when no fundraiser is featured', async ({ page }) => {
    await serveFundraiser(page, { rows: [], collections: [] })
    await page.goto('/')
    await expect(page.getByTestId('home-whats-happening')).toBeVisible()
    await expect(page.getByTestId('home-featured-fundraiser')).toHaveCount(0)
  })
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('fits a phone screen without sideways scrolling', async ({ page }) => {
    await openFundraiser(page, [
      collection('c1', '2026-10-01', 1000, 'Cash App collections', { entry_type: 'batch' }),
      collection('c2', '2026-10-05', 500, 'Business contribution'),
    ])

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow).toBeLessThanOrEqual(1)

    for (const id of ['fundraiser-share-whatsapp', 'fundraiser-copy-link']) {
      const box = await page.getByTestId(id).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    }
  })

  test('keeps the collections table readable by scrolling it, not the page', async ({ page }) => {
    await openFundraiser(page, [collection('c1', '2026-10-01', 1000, 'Cash App collections')])

    const scroller = page.getByTestId('fundraiser-collections').getByRole('region')
    await expect(scroller).toBeVisible()
    // Focusable so the horizontal scroll is reachable without a mouse.
    await expect(scroller).toHaveAttribute('tabindex', '0')
  })
})
