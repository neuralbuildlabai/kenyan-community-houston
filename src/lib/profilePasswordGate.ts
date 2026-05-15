import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { hasEmailPasswordIdentity, isPasswordExpired } from '@/lib/passwordPolicy'

/**
 * Signed-in users with an email/password identity must refresh when forced,
 * past `password_expires_at`, or missing rotation metadata.
 */
export function requiresProfilePasswordRefresh(
  profile: Profile | null,
  user: User | null,
  now: Date = new Date()
): boolean {
  if (!profile || !user) return false
  if (!hasEmailPasswordIdentity(user)) return false
  if (profile.force_password_change) return true
  if (profile.password_expires_at) {
    const exp = new Date(profile.password_expires_at).getTime()
    if (Number.isNaN(exp)) return true
    return now.getTime() >= exp
  }
  if (profile.password_changed_at == null || profile.password_changed_at === '') {
    return true
  }
  return isPasswordExpired(profile.password_changed_at, now)
}
