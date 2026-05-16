import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { VolunteerSignupStatus } from '@/lib/types'
import { VOLUNTEER_SIGNUP_STATUSES, volunteerSignupStatusLabel } from '@/lib/eventVolunteerSignup'
import { formatDateShort } from '@/lib/utils'

type SignupRow = {
  id: string
  event_id: string
  full_name: string
  phone: string
  email: string | null
  volunteer_role: string | null
  availability_note: string | null
  status: string
  submitted_at: string
  events: { title: string; slug: string } | null
}

export function AdminVolunteersPage() {
  const [rows, setRows] = useState<SignupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('event_volunteer_signups')
      .select('id, event_id, full_name, phone, email, volunteer_role, availability_note, status, submitted_at, events(title, slug)')
      .order('submitted_at', { ascending: false })
    if (error) {
      toast.error(error.message)
      setRows([])
    } else {
      const list = Array.isArray(data) ? data : []
      const normalized: SignupRow[] = list.map((r: Record<string, unknown>) => {
        const ev = r.events as { title?: string; slug?: string } | { title?: string; slug?: string }[] | null | undefined
        const one = Array.isArray(ev) ? ev[0] : ev
        return {
          id: r.id as string,
          event_id: r.event_id as string,
          full_name: r.full_name as string,
          phone: r.phone as string,
          email: (r.email as string | null) ?? null,
          volunteer_role: (r.volunteer_role as string | null) ?? null,
          availability_note: (r.availability_note as string | null) ?? null,
          status: r.status as string,
          submitted_at: r.submitted_at as string,
          events: one?.title ? { title: one.title, slug: one.slug ?? '' } : null,
        }
      })
      setRows(normalized)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) {
      const t = r.events?.title
      if (t) map.set(r.event_id, t)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (eventFilter !== 'all' && r.event_id !== eventFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (q) {
        const hay = `${r.full_name} ${r.phone} ${r.email ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, eventFilter, statusFilter, search])

  async function updateStatus(id: string, status: VolunteerSignupStatus) {
    setUpdatingId(id)
    const { error } = await supabase.from('event_volunteer_signups').update({ status }).eq('id', id)
    setUpdatingId(null)
    if (error) toast.error(error.message)
    else {
      toast.success('Status updated')
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    }
  }

  return (
    <>
      <SEOHead title="Volunteers" noIndex />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Event volunteers</h1>
          <p className="text-muted-foreground text-sm mt-1">Private signups across published events. Names and phones are admin-only.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 min-w-0 flex-1 max-w-xl">
            <div className="form-field-stack">
              <Label className="text-xs">Event</Label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger><SelectValue placeholder="All events" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {eventOptions.map(([id, title]) => (
                    <SelectItem key={id} value={id}>{title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field-stack">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {VOLUNTEER_SIGNUP_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{volunteerSignupStatusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden xl:table-cell max-w-[180px]">Availability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="whitespace-nowrap">Submitted</TableHead>
                <TableHead className="text-right">Event link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-14 text-muted-foreground">
                    {rows.length === 0
                      ? 'No volunteer signups yet. Enable volunteer signup on an event and share the link from Calendar.'
                      : 'No rows match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium max-w-[200px]">
                      <div className="truncate">{r.events?.title ?? '—'}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.full_name}</TableCell>
                    <TableCell className="font-mono text-sm whitespace-nowrap">{r.phone}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[160px] truncate">
                      {r.email ?? '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm max-w-[140px] truncate">{r.volunteer_role ?? '—'}</TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground max-w-[200px] truncate" title={r.availability_note ?? ''}>
                      {r.availability_note ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.status}
                        disabled={updatingId === r.id}
                        onValueChange={(v) => void updateStatus(r.id, v as VolunteerSignupStatus)}
                      >
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VOLUNTEER_SIGNUP_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{volunteerSignupStatusLabel(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateShort(r.submitted_at.slice(0, 10))}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.events?.slug ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Public event">
                          <a href={`/events/${r.events.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
