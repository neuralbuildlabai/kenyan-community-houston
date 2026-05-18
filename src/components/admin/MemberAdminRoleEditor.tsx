import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import {
  demoteAdminToMember,
  fetchAssignableRolesForCaller,
  fetchProfileRole,
  promoteMemberToAdmin,
  ROLE_LABEL,
} from '@/lib/memberAdminPromotion'
import { isElevatedAdminRole, type UserRole } from '@/lib/types'

/**
 * Promote-to-admin / demote affordance shown inside the member detail
 * dialog. Renders three states depending on whether the member has
 * claimed a login and what their current role is.
 *
 * Permission boundaries are enforced server-side by the migration-048
 * RPCs; this component just filters the role picker so the UI doesn't
 * surface options the server will reject.
 */
export function MemberAdminRoleEditor({
  userId,
  email,
  onChanged,
}: {
  userId: string | null | undefined
  email: string
  onChanged?: () => void
}) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  const [assignable, setAssignable] = useState<UserRole[]>([])
  const [pickedRole, setPickedRole] = useState<UserRole | ''>('')
  const [saving, setSaving] = useState(false)
  const [demoting, setDemoting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!userId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [role, roles] = await Promise.all([
          fetchProfileRole(userId),
          fetchAssignableRolesForCaller(),
        ])
        if (cancelled) return
        setCurrentRole(role)
        setAssignable(roles)
        // Default the picker to the current role if it's assignable;
        // otherwise pick the most useful elevated role available.
        if (role && roles.includes(role)) {
          setPickedRole(role)
        } else if (roles.includes('community_admin' as UserRole)) {
          setPickedRole('community_admin' as UserRole)
        } else {
          setPickedRole(roles[0] ?? '')
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not load role information')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [userId])

  if (!userId) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
        This member hasn&apos;t claimed an account yet. They need to sign in once before they
        can be granted admin access.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading role…
      </div>
    )
  }

  if (assignable.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
        Your role doesn&apos;t allow assigning admin access to others.
      </div>
    )
  }

  const currentLabel = currentRole ? (ROLE_LABEL[currentRole] ?? currentRole) : 'Member'
  const currentIsElevated = isElevatedAdminRole(currentRole)
  const isSelf = !!user && user.id === userId

  async function handleSave() {
    if (!userId || !pickedRole) return
    if (pickedRole === currentRole) {
      toast.info('No change — already that role.')
      return
    }
    setSaving(true)
    try {
      await promoteMemberToAdmin(userId, pickedRole)
      toast.success(`Role updated to ${ROLE_LABEL[pickedRole] ?? pickedRole}`)
      setCurrentRole(pickedRole)
      onChanged?.()
    } catch (err) {
      toast.error(translatePromotionError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDemote() {
    if (!userId) return
    setDemoting(true)
    try {
      await demoteAdminToMember(userId)
      toast.success('Admin access removed.')
      setCurrentRole('member' as UserRole)
      setPickedRole('member' as UserRole)
      onChanged?.()
    } catch (err) {
      toast.error(translatePromotionError(err))
    } finally {
      setDemoting(false)
    }
  }

  return (
    <div className="space-y-3 rounded-md border bg-card/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Admin access
          </p>
          <p className="text-sm">
            Current role:{' '}
            <Badge variant={currentIsElevated ? 'default' : 'secondary'} className="ml-1">
              {currentLabel}
            </Badge>
          </p>
        </div>
        {currentIsElevated && !isSelf ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleDemote()}
            disabled={demoting || saving}
            className="text-destructive hover:text-destructive"
            data-testid="member-demote"
          >
            <ShieldOff className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {demoting ? 'Removing…' : 'Remove admin access'}
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {email} — pick a role and save. The user keeps their current password and isn&apos;t
        forced to change it.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={pickedRole} onValueChange={(v) => setPickedRole(v as UserRole)}>
          <SelectTrigger className="h-9 text-sm sm:w-64" data-testid="member-role-select">
            <SelectValue placeholder="Pick a role" />
          </SelectTrigger>
          <SelectContent>
            {assignable.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r] ?? r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={() => void handleSave()}
          disabled={saving || demoting || !pickedRole || pickedRole === currentRole}
          data-testid="member-promote-save"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Save role
            </>
          )}
        </Button>
      </div>

      {isSelf ? (
        <p className="text-xs text-amber-700">
          Heads up: this is your own account. You can change your role, but you can&apos;t
          demote yourself to member.
        </p>
      ) : null}
    </div>
  )
}

function translatePromotionError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? 'Unknown error')
  if (msg.includes('not_authenticated')) return 'You need to be signed in.'
  if (msg.includes('not_authorized')) return 'Your role does not have permission to change this.'
  if (msg.includes('role_not_assignable_by_caller'))
    return 'You are not allowed to assign that role.'
  if (msg.includes('target_profile_not_found')) return 'This member has no profile yet.'
  if (msg.includes('target_auth_user_not_found'))
    return 'This user no longer exists. Their account was likely deleted.'
  if (msg.includes('cannot_demote_self')) return "You can't demote yourself."
  if (msg.includes('target_outranks_caller'))
    return 'This user holds a role above yours — only a higher-tier admin can change it.'
  return msg
}
