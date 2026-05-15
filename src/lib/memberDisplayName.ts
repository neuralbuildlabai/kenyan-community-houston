/**
 * Privacy-safe labels for public community surfaces (feed, comments).
 * Full last names and PII must not appear in public UI.
 */

const FALLBACK = 'Community Member'

function clean(s: string | null | undefined): string {
  return (s ?? '').trim()
}

/** First name + last initial + period, or first name only, or fallback. */
export function formatCommunityDisplayName(firstName?: string | null, lastName?: string | null): string {
  const fn = clean(firstName)
  const ln = clean(lastName)
  if (!fn && !ln) return FALLBACK
  if (fn && ln) {
    const initial = ln[0]?.toUpperCase() ?? ''
    return initial ? `${fn} ${initial}.` : fn
  }
  if (fn) return fn
  return FALLBACK
}

/** Short initials for avatars (first + last initial when both exist). */
export function getCommunityInitials(firstName?: string | null, lastName?: string | null): string {
  const fn = clean(firstName)
  const ln = clean(lastName)
  if (fn && ln) return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase() || '?'
  if (fn) return (fn[0] ?? '?').toUpperCase()
  return '?'
}
