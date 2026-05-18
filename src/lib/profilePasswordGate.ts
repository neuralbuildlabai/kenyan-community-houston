import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { hasEmailPasswordIdentity, isPasswordExpired } from '@/lib/passwordPolicy'

/**
 * Hard-block gate: returns true only when the user MUST change their
 * password before doing anything else. Per migration 047 / the May 2026
 * spec, the only hard-block case is the explicit `force_password_change`
 * flag — set when an admin issues a temp password.
 *
 * Mere expiry (>180 days since last rotation) no longer hard-blocks; it
 * surfaces as a dismissible banner via `isProfilePasswordExpiryReached`.
 * Users can either rotate or extend via `kigh_extend_password_expiry()`.
 */
export function requiresProfilePasswordRefresh(
  profile: Profile | null,
  user: User | null
): boolean {
  if (!profile || !user) return false
  if (!hasEmailPasswordIdentity(user)) return false
  return Boolean(profile.force_password_change)
}

/**
 * Soft signal: true when the caller's password is at or past its 180-day
 * window. Drives the dismissible expiry banner, not a redirect. Returns
 * false for OAuth-only users and for anyone with no rotation metadata
 * yet (newly-bootstrapped accounts shouldn't be nagged before they've
 * even rotated once).
 */
export function isProfilePasswordExpiryReached(
  profile: Profile | null,
  user: User | null,
  now: Date = new Date()
): boolean {
  if (!profile || !user) return false
  if (!hasEmailPasswordIdentity(user)) return false
  if (profile.password_expires_at) {
    const exp = new Date(profile.password_expires_at).getTime()
    if (Number.isNaN(exp)) return false
    return now.getTime() >= exp
  }
  if (!profile.password_changed_at) return false
  return isPasswordExpired(profile.password_changed_at, now)
}
