/**
 * Helpers for handling user-supplied external URLs (e.g. community
 * group websites). Public listings render these straight into
 * `<a href="…">`, so a bare value like "kighsacc.org" without a
 * protocol would resolve as a relative path under the current
 * route — broken behaviour that loses the user.
 *
 * `normalizeExternalUrl` is applied on the WRITE path (submit form
 * + admin save) so freshly-stored values are always absolute. The
 * READ path (public list/detail rendering) calls `safeExternalHref`
 * defensively to catch any legacy rows that pre-date the
 * normalization.
 */

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * Normalise a user-typed URL into a safe absolute URL string.
 *
 * - Returns `null` for empty / whitespace-only input.
 * - Returns `null` for clearly unsafe protocols (e.g. `javascript:`).
 * - Adds `https://` when the user typed a bare host like
 *   `kighsacc.org` or `www.example.com/path`.
 * - Trims whitespace and standardises encoding via `URL`.
 */
export function normalizeExternalUrl(input: string | null | undefined): string | null {
  if (!input) return null
  const raw = String(input).trim()
  if (!raw) return null

  // Block obvious dangerous protocols early. We don't try to be
  // exhaustive — RLS / CSP / link rendering all add additional
  // defence layers.
  const lower = raw.toLowerCase()
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return null
  }

  // Only `mailto:`/`tel:` links bypass the host requirement. For
  // everything else we coerce to an http(s) URL.
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) {
    return raw
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(candidate)
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null
    if (!url.hostname || !url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

/**
 * Returns the value to put in `href`. Mirrors `normalizeExternalUrl`
 * for safety but additionally returns `null` if the value cannot be
 * parsed at all — callers should hide the link in that case.
 */
export function safeExternalHref(value: string | null | undefined): string | null {
  return normalizeExternalUrl(value)
}

/**
 * "kighsacc.org/path?x" given the input
 * "https://www.kighsacc.org/path?x". Falls back to the original
 * (trimmed) input if the URL is unparseable.
 */
export function prettyExternalLabel(value: string | null | undefined): string {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    const host = url.host.replace(/^www\./, '')
    const path = url.pathname.replace(/\/$/, '')
    return path && path !== '/' ? `${host}${path}` : host
  } catch {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./, '')
  }
}
