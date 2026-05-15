import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { KeyRound, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { SEOHead } from '@/components/SEOHead'
import { validatePasswordPolicy, getPasswordPolicySummary } from '@/lib/passwordPolicy'
import { sanitizeNextParam } from '@/lib/authRedirect'
import { isElevatedAdminRole } from '@/lib/types'
import { postLogoutPath } from '@/lib/logoutRedirect'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { user, profile, refreshProfile, refreshAdminSecurity, isAdmin, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const nextRaw = params.get('next')
  const nextSafe = sanitizeNextParam(nextRaw)

  const summary = useMemo(() => getPasswordPolicySummary(), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) {
      toast.error('You must be signed in.')
      return
    }
    const v = validatePasswordPolicy(password)
    if (!v.ok) {
      toast.error(v.errors[0] ?? 'Password does not meet requirements')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    const { error: pwErr } = await supabase.auth.updateUser({ password })
    if (pwErr) {
      setSaving(false)
      const msg = pwErr.message?.toLowerCase() ?? ''
      if (msg.includes('reauthentication') || msg.includes('same password')) {
        toast.error(pwErr.message || 'Could not update password. Try signing out and back in.')
      } else {
        toast.error(pwErr.message || 'Could not update password')
      }
      return
    }
    const { error: rpcErr } = await supabase.rpc('kigh_apply_profile_password_rotation')
    if (rpcErr) {
      setSaving(false)
      toast.error(rpcErr.message || 'Password updated, but profile sync failed. Contact support.')
      return
    }
    if (isAdmin) {
      const { error: dbErr } = await supabase
        .from('admin_user_profiles')
        .update({
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
          temporary_password_set_at: null,
        })
        .eq('user_id', user.id)
      if (dbErr) {
        setSaving(false)
        toast.error(dbErr.message || 'Password saved; admin metadata sync failed.')
        return
      }
      await refreshAdminSecurity()
    }
    await refreshProfile()
    setSaving(false)
    toast.success('Password updated')
    const dest =
      nextSafe && nextSafe !== '/change-password'
        ? nextSafe
        : isElevatedAdminRole(profile?.role)
          ? '/admin/dashboard'
          : '/profile'
    navigate(dest, { replace: true })
  }

  return (
    <>
      <SEOHead title="Update password" description="Update your KIGH account password." />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Update password</h1>
              <p className="text-sm text-muted-foreground mt-1">Your password must be updated before continuing.</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">For security, passwords are renewed every 6 months.</p>

          <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cp-new">New password</Label>
              <Input
                id="cp-new"
                data-testid="change-password-new"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-confirm">Confirm password</Label>
              <Input
                id="cp-confirm"
                data-testid="change-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1" data-testid="password-policy-summary">
              <p className="text-xs font-medium text-foreground">Rules</p>
              <ul className="text-xs space-y-0.5 text-muted-foreground">
                {summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={saving} data-testid="change-password-submit">
              {saving ? 'Saving…' : 'Save password'}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => void signOut().then(() => navigate(postLogoutPath(location.pathname)))}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </>
  )
}
