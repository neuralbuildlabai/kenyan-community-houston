/**
 * Current browser origin for OAuth and email confirmation redirects.
 * Never use a hardcoded production URL here — Supabase must allow-list the same URLs.
 */
export function getBrowserOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}
