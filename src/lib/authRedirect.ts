import { isElevatedAdminRole } from '@/lib/types'

/** Decode `next` from query; allow only same-origin relative internal paths. */
export function sanitizeNextParam(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null
  let decoded: string
  try {
    decoded = decodeURIComponent(raw.trim())
  } catch {
    return null
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
  if (decoded.includes('://')) return null
  if (decoded.includes('\\')) return null
  return decoded
}

const MEMBER_SAFE_PREFIXES = [
  '/membership',
  '/profile',
  '/login',
  '/support',
  '/resources',
  '/events',
  '/calendar',
  '/announcements',
  '/businesses',
  '/community-support',
  '/gallery',
  '/about',
  '/contact',
  '/chat',
  '/change-password',
  '/community-feed',
]

function isMemberSafePath(path: string): boolean {
  if (path === '/' || path === '') return true
  return MEMBER_SAFE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
}

/**
 * After email/password login: choose destination from `next` and role.
 * - Only internal paths; no external URLs.
 * - `/admin/**` only for elevated admins.
 * - Non-admins asking for `/admin/**` fall back to `memberFallback`.
 */
export function resolvePostLoginPath(
  next: string | null,
  role: string | null | undefined,
  memberFallback: string = '/profile'
): string {
  const elevated = isElevatedAdminRole(role)
  const adminHome = '/admin/dashboard'
  const safe = next && sanitizeNextParam(next) === next ? next : null

  if (elevated) {
    if (safe?.startsWith('/admin')) return safe
    return adminHome
  }

  if (safe?.startsWith('/admin')) return memberFallback
  if (safe && isMemberSafePath(safe)) return safe
  if (safe) return memberFallback
  return memberFallback
}

/**
 * After OAuth / magic-link callback: stricter allowlist before first profile load.
 * `role` may be unknown — never send to `/admin` unless elevated.
 */
export function resolveAuthCallbackPath(
  next: string | null,
  role: string | null | undefined,
  defaultPath: string
): string {
  const elevated = isElevatedAdminRole(role)
  const safe = next && sanitizeNextParam(next) === next ? next : null

  if (elevated) {
    if (safe?.startsWith('/admin')) return safe
    if (safe === '/profile' || safe === '/login' || safe === '/chat' || safe?.startsWith('/membership')) return safe
    return '/admin/dashboard'
  }

  if (safe?.startsWith('/admin')) return defaultPath
  if (safe && isMemberSafePath(safe)) return safe
  return defaultPath
}
