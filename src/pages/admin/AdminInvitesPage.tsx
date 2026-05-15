import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageCircle, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { MemberInvite } from '@/lib/types'
import { formatDate } from '@/lib/utils'

type Inviter = { id: string; full_name: string | null; email: string }

export function AdminInvitesPage() {
  const [rows, setRows] = useState<MemberInvite[]>([])
  const [inviters, setInviters] = useState<Record<string, Inviter>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('member_invites').select('*').order('created_at', { ascending: false })
    if (error) {
      toast.error('Could not load invites.')
      setRows([])
      setInviters({})
    } else {
      const list = (data as MemberInvite[]) ?? []
      setRows(list)
      const ids = [...new Set(list.map((r) => r.invited_by).filter(Boolean))]
      if (ids.length) {
        const { data: profs, error: pErr } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
        if (!pErr && profs) {
          const map: Record<string, Inviter> = {}
          for (const p of profs as Inviter[]) {
            map[p.id] = p
          }
          setInviters(map)
        } else setInviters({})
      } else setInviters({})
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (!search.trim()) return true
      const s = search.toLowerCase()
      return (
        r.recipient_phone.toLowerCase().includes(s) ||
        r.normalized_phone.includes(s) ||
        (r.recipient_name?.toLowerCase().includes(s) ?? false) ||
        (inviters[r.invited_by]?.email?.toLowerCase().includes(s) ?? false) ||
        (inviters[r.invited_by]?.full_name?.toLowerCase().includes(s) ?? false)
      )
    })
  }, [rows, search, statusFilter, inviters])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-7 w-7 text-primary" />
          WhatsApp invites
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tracked handoffs only — status &quot;opened WhatsApp&quot; means the site launched wa.me on the member&apos;s device, not that
          the message was delivered.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search phone or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="opened_whatsapp">Opened WhatsApp</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite attempts</CardTitle>
          <CardDescription>Member-initiated outreach. Not visible to the public.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <div className="rounded-b-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Invited by</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Phone (raw)</TableHead>
                  <TableHead className="hidden md:table-cell">Normalized</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No invite attempts match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const inv = inviters[r.invited_by]
                    const invLabel = inv?.full_name?.trim() || inv?.email || 'Member'
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(r.created_at, 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{invLabel}</div>
                          {inv?.email ? <div className="text-xs text-muted-foreground truncate max-w-[180px]">{inv.email}</div> : null}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.recipient_name?.trim() || '—'}
                          {r.personal_note ? (
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5" title={r.personal_note}>
                              Note: {r.personal_note}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-xs">{r.recipient_phone}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-mono">{r.normalized_phone}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.status === 'opened_whatsapp' ? 'Opened WhatsApp' : r.status}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
