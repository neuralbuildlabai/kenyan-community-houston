import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { isAdminPasswordExpiryReached } from '@/lib/adminPasswordGate'
import { isProfilePasswordExpiryReached } from '@/lib/profilePasswordGate'

const DISMISS_KEY = 'kigh.passwordExpiryBanner.dismissed'

/**
 * Soft prompt for password expiry. Shown above content when the user's
 * password is past its 180-day window. Two affordances:
 *
 *   - **Change now** — links to the appropriate change-password page.
 *   - **Keep using it** — calls `kigh_extend_password_expiry()` (migration
 *     047), which bumps the rotation timestamps without touching the
 *     Supabase Auth password. This is how password re-use is supported:
 *     the user keeps the same password, the system stops nagging.
 *
 * The banner can also be dismissed for the current browser tab via the
 * close icon. Re-renders on next login if the password is still expired.
 *
 * Hides automatically for OAuth-only users (no expiry concept) and for
 * accounts that haven't rotated yet (no metadata).
 */
export function PasswordExpiryBanner() {
  const { user, profile, isAdmin, adminSecurity, refreshProfile, refreshAdminSecurity } = useAuth()
  const [extending, setExtending] = useState(false)
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  const expired =
    isProfilePasswordExpiryReached(profile, user) ||
    (isAdmin && isAdminPasswordExpiryReached(adminSecurity))

  if (!expired || dismissed) return null

  const changePath = isAdmin ? '/admin/change-password' : '/change-password'

  function handleDismiss() {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // sessionStorage may be unavailable (private mode, etc.); ignore.
    }
  }

  async function handleKeep() {
    setExtending(true)
    try {
      const { error } = await supabase.rpc('kigh_extend_password_expiry')
      if (error) throw error
      await refreshProfile()
      if (isAdmin) await refreshAdminSecurity()
      toast.success('Got it — keeping your current password.')
      // Clear dismissal so any future re-expiry can re-surface.
      try {
        window.sessionStorage.removeItem(DISMISS_KEY)
      } catch {
        /* noop */
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update — please try again.')
    } finally {
      setExtending(false)
    }
  }

  return (
    <div
      className="border-b border-amber-300/60 bg-amber-50/90 px-4 py-3 text-sm text-amber-900"
      role="status"
      data-testid="password-expiry-banner"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 sm:items-center">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden />
          <p>
            <span className="font-semibold">Your password is past due.</span> Change it now for
            another 180 days, or keep using your current one.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
            onClick={() => void handleKeep()}
            disabled={extending}
            data-testid="password-expiry-keep"
          >
            {extending ? 'Saving…' : 'Keep current password'}
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-amber-700 text-white hover:bg-amber-800"
            data-testid="password-expiry-change"
          >
            <Link to={changePath}>Change now</Link>
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss for this session"
            className="rounded-full p-1 text-amber-900 hover:bg-amber-100"
            data-testid="password-expiry-dismiss"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
