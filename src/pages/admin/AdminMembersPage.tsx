import { Fragment, useEffect, useState } from 'react'
import { Search, Download, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { DuesStatus, HouseholdMember, Member, MembershipRecordStatus, MembershipType } from '@/lib/types'

type MemberWithHousehold = Member & { household_members?: HouseholdMember[] }

const MEM_TYPES: MembershipType[] = ['individual', 'family_household', 'associate']
const MEM_STATUS: MembershipRecordStatus[] = ['pending', 'active', 'inactive', 'rejected']
const DUES: DuesStatus[] = ['pending', 'paid', 'waived', 'overdue']

const COL_COUNT = 13

export function AdminMembersPage() {
  const [rows, setRows] = useState<MemberWithHousehold[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [memStatusFilter, setMemStatusFilter] = useState<string>('all')
  const [duesFilter, setDuesFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [detail, setDetail] = useState<MemberWithHousehold | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*, household_members(*)')
      .order('submitted_at', { ascending: false })
    if (error) {
      toast.error(error.message)
      setRows([])
    } else {
      setRows((data as MemberWithHousehold[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = rows.filter((m) => {
    if (typeFilter !== 'all' && m.membership_type !== typeFilter) return false
    if (memStatusFilter !== 'all' && m.membership_status !== memStatusFilter) return false
    if (duesFilter !== 'all' && m.dues_status !== duesFilter) return false
    if (search) {
      const s = search.toLowerCase()
      const hit =
        m.first_name.toLowerCase().includes(s) ||
        m.last_name.toLowerCase().includes(s) ||
        m.email.toLowerCase().includes(s) ||
        (m.phone?.toLowerCase().includes(s) ?? false)
      if (!hit) return false
    }
    return true
  })

  async function updateMember(id: string, patch: Partial<Member>) {
    const { error } = await supabase.from('members').update(patch).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Updated')
      load()
    }
  }

  function exportCsv() {
    const cols = [
      'id',
      'first_name',
      'last_name',
      'email',
      'phone',
      'city',
      'state',
      'zip_code',
      'membership_type',
      'membership_status',
      'dues_status',
      'willing_to_volunteer',
      'willing_to_serve',
      'interests',
      'submitted_at',
    ]
    const lines = [cols.join(',')]
    for (const m of filtered) {
      lines.push(
        cols
          .map((c) => {
            const v = (m as unknown as Record<string, unknown>)[c]
            if (v == null) return ''
            if (Array.isArray(v)) return `"${String(v.join('; ')).replace(/"/g, '""')}"`
            const str = String(v)
            if (str.includes(',') || str.includes('"')) return `"${str.replace(/"/g, '""')}"`
            return str
          })
          .join(',')
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kigh-members-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export started')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words">Membership registrations</h1>
          <p className="text-muted-foreground text-sm">Search, filter, and update member records.</p>
        </div>
        <Button variant="outline" className="gap-2 shrink-0 w-full sm:w-auto" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV (filtered)
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Name, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {MEM_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={memStatusFilter} onValueChange={setMemStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Membership" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All membership</SelectItem>
            {MEM_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={duesFilter} onValueChange={setDuesFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Dues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dues</SelectItem>
            {DUES.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Name</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden xl:table-cell">Phone</TableHead>
              <TableHead className="hidden sm:table-cell text-center">HH</TableHead>
              <TableHead className="hidden md:table-cell max-w-[140px]">Interests</TableHead>
              <TableHead className="hidden lg:table-cell">Volunteer</TableHead>
              <TableHead className="hidden lg:table-cell">Serve</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead>Membership</TableHead>
              <TableHead>Dues</TableHead>
              <TableHead className="hidden sm:table-cell">Submitted</TableHead>
              <TableHead className="text-right w-[72px]">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={COL_COUNT}>
                    <div className="h-8 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COL_COUNT} className="text-center py-10 text-muted-foreground">
                  No members match filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => {
                const open = !!expanded[m.id]
                const hh = m.household_members ?? []
                const interests = m.interests ?? []
                const intLabel = interests.slice(0, 2).join(', ') + (interests.length > 2 ? '…' : '')
                return (
                  <Fragment key={m.id}>
                    <TableRow>
                      <TableCell>
                        {m.membership_type === 'family_household' && hh.length > 0 ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setExpanded((e) => ({ ...e, [m.id]: !open }))}
                            aria-label={open ? 'Collapse household' : 'Expand household'}
                          >
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {m.first_name} {m.last_name}
                        <div className="lg:hidden text-xs text-muted-foreground font-normal truncate max-w-[140px]">{m.email}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{m.email}</TableCell>
                      <TableCell className="hidden xl:table-cell text-sm">{m.phone ?? '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-center text-sm">{hh.length}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[160px]">
                        <span title={interests.join(', ')} className="line-clamp-2">
                          {intLabel || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={m.willing_to_volunteer ? 'default' : 'secondary'}>{m.willing_to_volunteer ? 'Yes' : 'No'}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={m.willing_to_serve ? 'default' : 'secondary'}>{m.willing_to_serve ? 'Yes' : 'No'}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{m.membership_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Select
                          value={m.membership_status}
                          onValueChange={(v) => updateMember(m.id, { membership_status: v as MembershipRecordStatus })}
                        >
                          <SelectTrigger className="h-8 min-w-[100px] max-w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEM_STATUS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={m.dues_status}
                          onValueChange={(v) => updateMember(m.id, { dues_status: v as DuesStatus })}
                        >
                          <SelectTrigger className="h-8 min-w-[90px] max-w-[110px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DUES.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(m.submitted_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right p-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" type="button" onClick={() => setDetail(m)} aria-label="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {open && hh.length > 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={COL_COUNT} className="py-3">
                          <div className="text-xs font-semibold mb-2">Household members</div>
                          <ul className="space-y-1 text-sm">
                            {hh.map((h) => (
                              <li key={h.id} className="flex flex-wrap gap-x-4 gap-y-1">
                                <span className="font-medium">{h.full_name}</span>
                                {h.relationship ? <Badge variant="outline">{h.relationship}</Badge> : null}
                                {h.age_group ? <span className="text-muted-foreground">{h.age_group}</span> : null}
                                {h.email ? <span className="text-muted-foreground">{h.email}</span> : null}
                                {h.phone ? <span className="text-muted-foreground">{h.phone}</span> : null}
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member detail</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-semibold text-base">
                  {detail.first_name} {detail.last_name}
                </div>
                <p className="text-muted-foreground">{detail.email}</p>
                <p className="text-muted-foreground">{detail.phone ?? 'No phone on file'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Type</span>
                  <div>{detail.membership_type.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Status</span>
                  <div>{detail.membership_status}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Dues</span>
                  <div>{detail.dues_status}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Household count</span>
                  <div>{(detail.household_members ?? []).length}</div>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase">Willing to volunteer</span>
                <div>{detail.willing_to_volunteer ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase">Willing to serve</span>
                <div>{detail.willing_to_serve ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase">Interests</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(detail.interests ?? []).length ? (
                    detail.interests!.map((i) => (
                      <Badge key={i} variant="secondary">
                        {i}
                      </Badge>
                    ))
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase">Address</span>
                <p>
                  {[detail.address_line1, [detail.city, detail.state, detail.zip_code].filter(Boolean).join(', ')].filter(Boolean).join(' · ') ||
                    '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase">Household</span>
                <ul className="mt-1 space-y-2">
                  {(detail.household_members ?? []).length ? (
                    detail.household_members!.map((h) => (
                      <li key={h.id} className="rounded-md border p-2">
                        <div className="font-medium">{h.full_name}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                          {h.relationship}
                          {h.age_group ? `· ${h.age_group}` : ''}
                        </div>
                        {h.email ? <div className="text-xs">{h.email}</div> : null}
                        {h.phone ? <div className="text-xs">{h.phone}</div> : null}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No household rows</li>
                  )}
                </ul>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
