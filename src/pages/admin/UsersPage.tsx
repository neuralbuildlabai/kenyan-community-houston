import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { adminPasswordAgeDays } from '@/lib/adminPasswordPolicy'
import { getAdminPasswordGate } from '@/lib/adminPasswordGate'
import type { AdminUserSecurity } from '@/lib/types'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/lib/types'
import {
  assignableRolesForCaller,
  canInviteAdminUsers,
} from '@/lib/adminRoleMatrix'

interface AdminUserRow {
  id: string
  email: string
  role: string
  created_at: string
  last_sign_in_at: string | null
  must_change_password?: boolean | null
  password_changed_at?: string | null
  temporary_password_set_at?: string | null
  display_name?: string | null
  position_title?: string | null
}

export function AdminUsersPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  // Compute assignable roles from the caller's profile.role. The
  // server-side Edge Function is the authoritative gate; this list
  // exists only so the UI does not surface options that will be
  // rejected. See `src/lib/adminRoleMatrix.ts`.
  const assignableRoles = useMemo(
    () => assignableRolesForCaller(profile?.role),
    [profile?.role]
  )
  const canInvite = canInviteAdminUsers(profile?.role)
  const defaultRole: UserRole = useMemo(() => {
    if (assignableRoles.includes('community_admin' as UserRole)) return 'community_admin'
    return (assignableRoles[0] as UserRole) ?? ('viewer' as UserRole)
  }, [assignableRoles])
  const [newRole, setNewRole] = useState<UserRole>(defaultRole)
  // Keep the selected role valid if the caller's role changes (e.g.
  // role flip, refresh) — never leave the picker on a value the
  // backend will reject.
  useEffect(() => {
    if (!assignableRoles.includes(newRole)) {
      setNewRole(defaultRole)
    }
  }, [assignableRoles, defaultRole, newRole])
  const [displayName, setDisplayName] = useState('')
  const [positionTitle, setPositionTitle] = useState('')
  const [inviting, setInviting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const canDelete = profile?.role === 'super_admin'

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setUsers((data as AdminUserRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault()
    if (!canInvite) {
      toast.error('Your role is not permitted to invite admin users.')
      return
    }
    if (!newEmail.trim() || !newPassword) {
      toast.error('Enter email and temporary password')
      return
    }
    if (!assignableRoles.includes(newRole)) {
      toast.error(`Your role cannot assign "${newRole}".`)
      return
    }
    setInviting(true)
    const { data, error } = await supabase.functions.invoke('create-admin-user', {
      body: {
        email: newEmail.trim().toLowerCase(),
        temporaryPassword: newPassword,
        role: newRole,
        displayName: displayName.trim() || undefined,
        positionTitle: positionTitle.trim() || undefined,
      },
    })
    setInviting(false)
    if (error) {
      // Surface the server-side reason where possible (the Edge
      // Function returns 403/422 with a `message` body for
      // forbidden role assignments). supabase-js wraps non-2xx
      // responses into `error`; if the response carried a JSON
      // body we still get a message.
      const msg = error.message || 'Could not reach the create-admin-user Edge Function.'
      toast.error(msg)
      return
    }
    const payload = data as { ok?: boolean; message?: string }
    if (!payload?.ok) {
      toast.error(payload?.message ?? 'Unable to create user')
      return
    }
    toast.success(payload.message ?? 'Admin user created')
    setNewEmail('')
    setNewPassword('')
    setDisplayName('')
    setPositionTitle('')
    load()
  }

  async function deleteUser() {
    if (!deleteId || !canDelete) return
    const { data, error } = await supabase.functions.invoke('delete-admin-user', {
      body: { userId: deleteId },
    })
    if (error) {
      toast.error('Could not reach the delete-admin-user Edge Function.')
      setDeleteId(null)
      return
    }
    const payload = data as { ok?: boolean; message?: string }
    if (!payload?.ok) {
      toast.error(payload?.message ?? 'Unable to remove user')
      setDeleteId(null)
      return
    }
    toast.success('User removed')
    load()
    setDeleteId(null)
  }

  function passwordStatus(u: AdminUserRow): string {
    const sec: AdminUserSecurity = {
      user_id: u.id,
      must_change_password: !!u.must_change_password,
      temporary_password_set_at: u.temporary_password_set_at ?? null,
      password_changed_at: u.password_changed_at ?? null,
      display_name: u.display_name ?? null,
      position_title: u.position_title ?? null,
    }
    const g = getAdminPasswordGate(sec)
    if (g.required) return g.reason === 'expired' ? 'Expired' : 'Update required'
    const age = adminPasswordAgeDays(u.password_changed_at ?? null)
    if (age === null) return '—'
    const left = 180 - age
    return `${left}d left`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <p className="text-muted-foreground text-sm">Create accounts via the Edge Function (service role). Never paste the service key in the browser.</p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 flex gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Deploy <code className="text-xs bg-white/80 px-1 rounded">create-admin-user</code> and{' '}
          <code className="text-xs bg-white/80 px-1 rounded">delete-admin-user</code> Supabase Edge Functions before using this page in production.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Password</TableHead>
                  <TableHead className="hidden xl:table-cell">Position</TableHead>
                  <TableHead className="hidden lg:table-cell">Last sign in</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <div className="h-8 bg-muted animate-pulse rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No admin users
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div>{u.email}</div>
                        {u.display_name ? <div className="text-xs text-muted-foreground">{u.display_name}</div> : null}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          {u.role ?? 'admin'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {u.must_change_password ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Force change
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{passwordStatus(u)}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{u.position_title ?? '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {u.last_sign_in_at ? formatDateShort(u.last_sign_in_at) : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        {canDelete ? (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Add Admin User
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!canInvite ? (
                <div className="text-sm text-muted-foreground">
                  Your role is not permitted to invite admin users. Ask a
                  super admin or platform admin.
                </div>
              ) : (
                <form onSubmit={inviteUser} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new_email">Email</Label>
                    <Input id="new_email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="admin@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new_pw">Temporary password</Label>
                    <Input id="new_pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Initial password (user will be forced to change)" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                      <SelectTrigger data-testid="admin-users-role-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((r) => (
                          <SelectItem key={r} value={r} data-testid={`admin-users-role-option-${r}`}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Only roles you may assign are listed. Server-side
                      governance ({profile?.role ?? 'unknown'}) is enforced
                      by the create-admin-user Edge Function.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="disp">Display name (optional)</Label>
                    <Input id="disp" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pos">Position title (optional)</Label>
                    <Input id="pos" value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} placeholder="e.g. Chair" />
                  </div>
                  <Button type="submit" className="w-full" disabled={inviting}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {inviting ? 'Creating…' : 'Create admin'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Remove Admin User"
        description="This will revoke their admin access. This action cannot be undone."
        onConfirm={deleteUser}
      />
    </div>
  )
}
