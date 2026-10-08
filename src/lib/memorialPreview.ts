/**
 * Lets an elevated admin open a memorial the public can no longer reach.
 *
 * Archived memorials are refused at the edge (`middleware.ts`), which runs
 * before the app loads and therefore cannot see the Supabase session — that
 * lives in localStorage, where no request carries it. So an explicit admin
 * action hands the edge a short-lived copy of the access token in a cookie
 * scoped to /memorials, and the edge verifies it by calling
 * `public.kigh_is_elevated_admin()` as that user. A forged or expired cookie
 * fails that check and the archive notice is served as normal.
 *
 * The token is already in localStorage, so the cookie exposes nothing new;
 * it is deliberately short-lived and path-scoped so it is not attached to
 * ordinary requests.
 */
export const MEMORIAL_PREVIEW_COOKIE = 'kigh_memorial_preview'

export const MEMORIAL_PREVIEW_MAX_AGE_SECONDS = 900

export function buildMemorialPreviewCookie(token: string, secure: boolean): string {
  return [
    `${MEMORIAL_PREVIEW_COOKIE}=${token}`,
    'Path=/memorials',
    `Max-Age=${MEMORIAL_PREVIEW_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}

/**
 * Synchronous on purpose: callers open the memorial in the same click, and
 * awaiting a session lookup first would get the tab blocked as a popup.
 * Returns false when there is no live session to preview with.
 */
export function grantMemorialPreview(accessToken: string | null | undefined): boolean {
  if (!accessToken) return false
  document.cookie = buildMemorialPreviewCookie(
    accessToken,
    window.location.protocol === 'https:'
  )
  return true
}
