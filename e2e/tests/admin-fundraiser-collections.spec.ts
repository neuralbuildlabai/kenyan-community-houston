import { test, expect, type Page } from '@playwright/test'
import { loginAsAdmin, skipIfNoAdmin } from '../helpers/auth'
import { formSubmissionsEnabled } from '../helpers/env'

/**
 * The admin side of the collection ledger on /admin/fundraisers.
 *
 * The read-only checks need only an admin login. The add/edit/remove round
 * trip writes real rows, so it is gated behind E2E_ENABLE_FORM_SUBMISSIONS
 * like the other data-writing specs, and it deletes what it created.
 */

const ADMIN_PATH = '/admin/fundraisers'
const DESCRIPTION = 'E2E ledger check — safe to delete'
const EDITED_DESCRIPTION = 'E2E ledger check (edited) — safe to delete'
const PRIVATE_NOTE = 'E2E private reconciliation note'
const DONOR = 'E2E Donor Name'

const manager = (page: Page) => page.getByTestId('fundraiser-collections-manager')
const total = (page: Page) => page.getByTestId('admin-collections-total')
const adminRows = (page: Page) => page.getByTestId('admin-collection-row')

async function openFirstLedger(page: Page) {
  await page.goto(ADMIN_PATH)
  await expect(page.getByRole('heading', { name: 'Fundraisers' })).toBeVisible()
  const button = page.getByTestId('admin-fundraiser-collections').first()
  await expect(button).toBeVisible()
  await button.click()
  await expect(manager(page)).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Collections — / })).toBeVisible()
}

async function fillDraft(page: Page, { amount, description }: { amount: string; description: string }) {
  await page.getByLabel('Date received').fill('2026-10-05')
  await page.getByLabel('Amount (USD)').fill(amount)
  await page.getByLabel('Source / description (public)').fill(description)
}

test.describe('admin collection ledger', () => {
  skipIfNoAdmin()

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('is reachable from each fundraiser row', async ({ page }) => {
    await openFirstLedger(page)
    await expect(
      manager(page).getByText('Do not record pledges or payments you have not confirmed.')
    ).toBeVisible()
    for (const header of ['Date', 'Source / description', 'Amount', 'Running total']) {
      await expect(manager(page).getByRole('columnheader', { name: header })).toBeVisible()
    }
  })

  test('shows the recalculated total before anything is saved', async ({ page }) => {
    await openFirstLedger(page)
    const before = await total(page).innerText()

    await expect(page.getByTestId('admin-collections-preview')).toHaveCount(0)
    await fillDraft(page, { amount: '125', description: DESCRIPTION })

    const preview = page.getByTestId('admin-collections-preview')
    await expect(preview).toBeVisible()
    await expect(preview).toContainText('After saving:')
    // Nothing is committed by typing.
    await expect(total(page)).toHaveText(before)
  })

  test('refuses an amount that is not positive money', async ({ page }) => {
    await openFirstLedger(page)
    const before = await total(page).innerText()

    await fillDraft(page, { amount: '0', description: DESCRIPTION })
    await page.getByTestId('admin-collection-save').click()
    await expect(page.getByText(/amount must be greater than|enter an amount/i)).toBeVisible()

    await fillDraft(page, { amount: '-50', description: DESCRIPTION })
    await page.getByTestId('admin-collection-save').click()
    await expect(total(page)).toHaveText(before)
    await expect(manager(page)).toBeVisible()
  })

  test('keeps a donor anonymous unless the name is explicitly published', async ({ page }) => {
    await openFirstLedger(page)
    const showDonor = page.getByRole('checkbox', {
      name: /Show this donor's name on the public page/,
    })
    await expect(showDonor).not.toBeChecked()
    await expect(
      manager(page).getByText('Donors stay anonymous unless you tick this.')
    ).toBeVisible()
    await expect(page.getByLabel('Private reconciliation note (never public)')).toBeVisible()
  })

  test('offers homepage featuring only for a published fundraiser', async ({ page }) => {
    await page.goto(ADMIN_PATH)
    await expect(page.getByRole('heading', { name: 'Fundraisers' })).toBeVisible()

    const rows = page.getByRole('row')
    const count = await rows.count()
    let checkedAny = false
    for (let i = 1; i < count; i += 1) {
      const row = rows.nth(i)
      const toggle = row.getByTestId('admin-fundraiser-feature-toggle')
      if ((await toggle.count()) === 0) continue
      const published = (await row.getByText('Publish first').count()) === 0
      // A fundraiser that is not published cannot be put on the homepage,
      // and only a published one gets a copyable public link.
      await expect(toggle).toBeEnabled({ enabled: published })
      await expect(row.getByTestId('admin-fundraiser-copy-link')).toHaveCount(published ? 1 : 0)
      checkedAny = true
    }
    expect(checkedAny).toBe(true)
  })

  test('copies the permanent public link for a published fundraiser', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(ADMIN_PATH)
    const copy = page.getByTestId('admin-fundraiser-copy-link').first()
    test.skip((await copy.count()) === 0, 'No published fundraiser to copy a link from')

    await copy.click()
    await expect(copy).toHaveText('Copied')
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toMatch(/^https:\/\/www\.kenyansingreaterhouston\.org\/community-support\/.+/)
    expect(copied).not.toContain('/admin')
    expect(copied).not.toContain('127.0.0.1')
  })
})

test.describe('admin collection ledger round trip', () => {
  skipIfNoAdmin()
  test.skip(
    !formSubmissionsEnabled,
    'Set E2E_ENABLE_FORM_SUBMISSIONS=true to write and clean up real collection records'
  )

  test('add, edit and remove keep every displayed total in step', async ({ page }) => {
    await loginAsAdmin(page)
    await openFirstLedger(page)

    const startingTotal = await total(page).innerText()
    const startingRows = await adminRows(page).count()

    // ── Add ──
    await fillDraft(page, { amount: '125', description: DESCRIPTION })
    await page.getByLabel('Donor name (optional)').fill(DONOR)
    await page.getByLabel('Private reconciliation note (never public)').fill(PRIVATE_NOTE)
    await page.getByTestId('admin-collection-save').click()

    await expect(page.getByText('Collection added')).toBeVisible()
    await expect(adminRows(page)).toHaveCount(startingRows + 1)
    const afterAdd = await total(page).innerText()
    expect(afterAdd).not.toBe(startingTotal)
    await expect(manager(page).getByText(DESCRIPTION)).toBeVisible()
    // Unticked donor name means the record reads as anonymous.
    await expect(manager(page).getByText('· anonymous').first()).toBeVisible()

    const row = adminRows(page).filter({ hasText: DESCRIPTION })
    await expect(row).toContainText('$125')

    // The table behind the dialog picks up the recalculated figure too.
    await page.keyboard.press('Escape')
    await expect(manager(page)).toHaveCount(0)
    await expect(page.getByRole('row').filter({ hasText: afterAdd.replace('$', '') }).first()).toBeVisible()

    // ── Edit ──
    await openFirstLedger(page)
    await adminRows(page)
      .filter({ hasText: DESCRIPTION })
      .getByRole('button', { name: /^Edit collection from/ })
      .click()
    await expect(page.getByLabel('Amount (USD)')).toHaveValue('125')
    await page.getByLabel('Amount (USD)').fill('200')
    await page.getByLabel('Source / description (public)').fill(EDITED_DESCRIPTION)
    await page.getByTestId('admin-collection-save').click()

    await expect(page.getByText('Collection updated')).toBeVisible()
    await expect(adminRows(page)).toHaveCount(startingRows + 1)
    await expect(adminRows(page).filter({ hasText: EDITED_DESCRIPTION })).toContainText('$200')
    expect(await total(page).innerText()).not.toBe(afterAdd)

    // ── Remove ──
    await adminRows(page)
      .filter({ hasText: EDITED_DESCRIPTION })
      .getByRole('button', { name: /^Remove collection from/ })
      .click()
    await page.getByRole('button', { name: 'Remove', exact: true }).click()

    await expect(page.getByText('Collection removed')).toBeVisible()
    await expect(adminRows(page)).toHaveCount(startingRows)
    // Removing the record puts the total back exactly where it started —
    // there is no separate figure left holding the old number.
    await expect(total(page)).toHaveText(startingTotal)
  })
})
