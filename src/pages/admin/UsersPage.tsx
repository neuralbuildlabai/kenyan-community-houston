import { useEffect, useState } from 'react'
import { UserPlus, Trash2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { toast } from 'sonner'

interface AdminUser {
  id: string
  email: string
  role: string
  created_at: string
  last_sign_in_at: string | null
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false })
    if (!error) setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail || !newPassword) { toast.error('Enter email and password'); return }
    setInviting(true)
    const { error } = await supabase.auth.admin.createUser({
      email: newEmail,
      password: newPassword,
      email_confirm: true,
    })
    setInviting(false)
    if (error) toast.error(error.message)
    else { toast.success('Admin user created'); setNewEmail(''); setNewPassword(''); load() }
  }

  async function deleteUser() {
    if (!deleteId) return
    const { error } = await supabase.auth.admin.deleteUser(deleteId)
    if (error) toast.error(error.message)
    else { toast.success('User removed'); load() }
    setDeleteId(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <p className="text-muted-foreground text-sm">Manage who has admin access to this platform.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Sign In</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No admin users</TableCell></TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        <ShieldCheck className="h-3 w-3 mr-1" />{u.role ?? 'admin'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {u.last_sign_in_at ? formatDateShort(u.last_sign_in_at) : 'Never'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {formatDateShort(u.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
              <form onSubmit={inviteUser} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new_email">Email</Label>
                  <Input id="new_email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="admin@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new_pw">Temporary Password</Label>
                  <Input id="new_pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
                </div>
                <Button type="submit" className="w-full" disabled={inviting}>
                  <UserPlus className="h-4 w-4 mr-2" />{inviting ? 'Creating…' : 'Create Admin'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Remove Admin User" description="This will revoke their admin access. This action cannot be undone." onConfirm={deleteUser} />
    </div>
  )
}
