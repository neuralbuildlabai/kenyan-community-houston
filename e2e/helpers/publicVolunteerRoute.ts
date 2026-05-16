import { expect, type Page } from '@playwright/test'

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Volunteer signup is a public route: visitors must not be sent to login or membership.
 * Call after navigating to `/events/:slug/volunteer` (any outcome: form, closed, or not found).
 */
export async function expectPublicVolunteerSignupPath(page: Page, slug: string) {
  await expect(page).toHaveURL(new RegExp(`/events/${escapeRegExp(slug)}/volunteer`))
  await expect(page).not.toHaveURL(/\/login(\/|\?|$)/)
  await expect(page).not.toHaveURL(/\/membership(\/|\?|$)/)
}
