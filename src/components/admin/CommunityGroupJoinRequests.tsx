import { useCallback, useEffect, useState } from 'react'
import { Mail, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  buildJoinRequestForwardMailto,
  JOIN_REQUEST_STATUS_LABEL,
  JOIN_REQUEST_STATUSES,
  resolveGroupContactEmail,
  type JoinRequestStatus,
} from '@/lib/communityGroupJoin'

type JoinRequestRow = {
  id: string
  group_id: string
  requester_name: string
  requester_email: string
  requester_phone: string | null
  message: string | null
  status: JoinRequestStatus
  forwarded_at: string | null
  created_at: string
  community_groups: {
    organization_name: string
    contact_person_name: string | null
    contact_person_email: string | null
    public_email: string | null
    submitter_email: string | null
  } | null
}

const FILTERS = ['new', 'forwarded', 'closed', 'all'] as const
type Filter = (typeof FILTERS)[number]

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Admin inbox for "Request to join" submissions from /community-groups. */
export function CommunityGroupJoinRequests() {
  const [rows, setRows] = useState<JoinRequestRow[]>([])
  const [filter, setFilter] = useState<Filter>('new')
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('community_group_join_requests')
      .select(
        'id, group_id, requester_name, requester_email, requester_phone, message, status, forwarded_at, created_at, community_groups(organization_name, contact_person_name, contact_person_email, public_email, submitter_email)'
      )
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, error } = await q
    if (error) {
      setUnavailable(true)
      setRows([])
    } else {
      setUnavailable(false)
      setRows((data as unknown as JoinRequestRow[]) ?? [])
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(id: string, status: JoinRequestStatus, quiet = false) {
    const patch: { status: JoinRequestStatus; forwarded_at?: string } = { status }
    if (status === 'forwarded') patch.forwarded_at = new Date().toISOString()
    const { error } = await supabase.from('community_group_join_requests').update(patch).eq('id', id)
    if (error) {
      toast.error(error.message || 'Could not update request')
      return
    }
    if (!quiet) toast.success(`Marked ${JOIN_REQUEST_STATUS_LABEL[status].toLowerCase()}`)
    void load()
  }

  return (
    <section id="join-requests" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Join requests
          </h2>
          <p className="text-sm text-muted-foreground">
            People who asked to join a group from the public directory. Use{' '}
            <span className="font-medium text-foreground">Email group contact</span> to pass each one on — the
            requester is copied so the group can reply directly.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f} value={f}>
                {f === 'all' ? 'All requests' : JOIN_REQUEST_STATUS_LABEL[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {unavailable ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Join requests are unavailable. Apply migration 079 in the Supabase SQL editor.
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead className="hidden lg:table-cell">Message</TableHead>
                <TableHead className="hidden md:table-cell">Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Forward</TableHead>
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
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {filter === 'new' ? 'No new join requests.' : 'No join requests match this filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const group = r.community_groups
                  const contactEmail = resolveGroupContactEmail(group)
                  const mailto =
                    group && contactEmail
                      ? buildJoinRequestForwardMailto({
                          groupName: group.organization_name,
                          contactName: group.contact_person_name,
                          contactEmail,
                          requesterName: r.requester_name,
                          requesterEmail: r.requester_email,
                          requesterPhone: r.requester_phone,
                          message: r.message,
                          requestedAt: r.created_at,
                        })
                      : null
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="align-top font-medium max-w-[200px]">
                        <div className="truncate">{group?.organization_name ?? 'Deleted group'}</div>
                        {contactEmail ? (
                          <div className="text-xs text-muted-foreground truncate">{contactEmail}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div className="font-medium">{r.requester_name}</div>
                        <a href={`mailto:${r.requester_email}`} className="text-xs text-primary break-all hover:underline">
                          {r.requester_email}
                        </a>
                        {r.requester_phone ? (
                          <div className="text-xs text-muted-foreground">{r.requester_phone}</div>
                        ) : null}
                        {r.message ? (
                          <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line lg:hidden">{r.message}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell align-top text-sm text-muted-foreground max-w-[280px] whitespace-pre-line">
                        {r.message || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell align-top text-sm tabular-nums">
                        {formatWhen(r.created_at)}
                      </TableCell>
                      <TableCell className="align-top">
                        <Select value={r.status} onValueChange={(v) => void setStatus(r.id, v as JoinRequestStatus)}>
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {JOIN_REQUEST_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {JOIN_REQUEST_STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {r.forwarded_at ? (
                          <div className="mt-1 text-[11px] text-muted-foreground">Forwarded {formatWhen(r.forwarded_at)}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        {mailto ? (
                          <Button asChild size="sm" variant={r.status === 'new' ? 'default' : 'outline'} className="gap-1.5">
                            <a
                              href={mailto}
                              onClick={() => {
                                if (r.status === 'new') void setStatus(r.id, 'forwarded', true)
                              }}
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Email group contact
                            </a>
                          </Button>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">No group email on file</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
