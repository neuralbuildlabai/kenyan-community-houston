import { test, expect } from '@playwright/test'
import { buildWhatsAppInviteUrl, normalizeWhatsAppPhone } from '../../src/lib/memberDemographics'

test.describe('WhatsApp invites', () => {
  test('phone normalization utility strips non-digits', () => {
    expect(normalizeWhatsAppPhone('+1 (555) 222-3333')).toBe('15552223333')
  })

  test('WhatsApp link uses wa.me with digits and encoded text', () => {
    const u = buildWhatsAppInviteUrl('15552223333', 'Hello from KIGH')
    expect(u.startsWith('https://wa.me/15552223333?text=')).toBeTruthy()
  })

  test('Invite dialog for logged-out user explains sign-in tracking (no SMS vendor copy)', async ({ page }) => {
    await page.goto('/chat', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Invite Someone' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/Sign in to generate a tracked invite/i)).toBeVisible()
    await expect(page.getByText(/Twilio/i)).toHaveCount(0)
    await expect(page.getByText(/SMS provider/i)).toHaveCount(0)
  })
})
