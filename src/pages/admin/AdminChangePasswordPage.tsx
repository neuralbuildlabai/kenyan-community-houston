import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { passwordPolicyChecklist, validatePasswordPolicy } from '@/lib/passwordPolicy'
import { toast } from 'sonner'
import type { AdminPasswordGateReason } from '@/lib/adminPasswordGate'
import { postLogoutPath } from '@/lib/logoutRedirect'

export function AdminChangePasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut, refreshAdminSecurity, refreshProfile } = useAuth()
  const reason = (location.state as { reason?: AdminPasswordGateReason } | null)?.reason

  const headline =
    reason === 'expired'
      ? 'Your admin password has expired. Please choose a new password to continue.'
      : 'For security, you must update your admin password before continuing.'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const checklist = useMemo(() => passwordPolicyChecklist(password, confirm), [password, confirm])

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
      toast.error(pwErr.message || 'Could not update password')
      return
    }
    const { error: rpcErr } = await supabase.rpc('kigh_apply_profile_password_rotation')
    if (rpcErr) {
      setSaving(false)
      toast.error(rpcErr.message || 'Password updated, but profile sync failed. Contact support.')
      return
    }
    const { error: dbErr } = await supabase
      .from('admin_user_profiles')
      .update({
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
        temporary_password_set_at: null,
      })
      .eq('user_id', user.id)
    setSaving(false)
    if (dbErr) {
      toast.error(dbErr.message || 'Password updated, but admin metadata sync failed. Contact support.')
      return
    }
    await refreshProfile()
    await refreshAdminSecurity()
    toast.success('Password updated')
    navigate('/admin/dashboard', { replace: true })
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Update admin password</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{headline}</p>
          </div>
        </div>

        <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="np">New password</Label>
            <Input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="npc">Confirm password</Label>
            <Input id="npc" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>

          <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-medium text-foreground">Requirements</p>
            <ul className="text-xs space-y-1">
              {checklist.map((row) => (
                <li key={row.label} className={row.pass ? 'text-green-700' : 'text-muted-foreground'}>
                  {row.pass ? '✓' : '○'} {row.label}
                </li>
              ))}
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save new password'}
          </Button>
        </form>

        <Button type="button" variant="outline" className="w-full gap-2" onClick={() => void signOut().then(() => navigate(postLogoutPath(location.pathname)))}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  )
}
