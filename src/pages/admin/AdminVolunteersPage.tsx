import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Eye, MailCheck, Search, Send, Users } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { isEventPast } from '@/lib/eventDate'
import { ContactDetailDialog, OutreachPanel, useOutreachDraft } from '@/components/admin/ContactOutreach'

const DEFAULT_DRAFT = {
  subject: 'KIGH volunteer update',
  message:
    'Hi {name}, thank you for volunteering with KIGH! Please join our volunteer WhatsApp group for updates: <paste group invite link>',
}

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
  /** Migration 091: set when the confirmation / reminder email was queued. */
  confirmation_emailed_at: string | null
  reminder_emailed_at: string | null
  /** Null for volunteers confirmed before emails existed: they are never emailed automatically. */
  confirmed_at: string | null
  events: SignupEvent | null
}

type SignupEvent = {
  title: string
  slug: string
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
}

function emailedLabel(iso: string | null): string | null {
  return iso ? `Emailed ${formatDateShort(iso.slice(0, 10))}` : null
}

export function AdminVolunteersPage() {
  const [rows, setRows] = useState<SignupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  /** Off by default: once an event ends its volunteers drop off this list (they stay in the Volunteer Roster). */
  const [showPast, setShowPast] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<SignupRow | null>(null)
  const [draft, setDraft] = useOutreachDraft('kigh.outreach.volunteers', DEFAULT_DRAFT)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('event_volunteer_signups')
      .select(
        'id, event_id, full_name, phone, email, volunteer_role, availability_note, status, submitted_at, confirmation_emailed_at, reminder_emailed_at, confirmed_at, events(title, slug, start_date, end_date, start_time, end_time)'
      )
      .order('submitted_at', { ascending: false })
    if (error) {
      toast.error(error.message)
      setRows([])
    } else {
      const list = Array.isArray(data) ? data : []
      const normalized: SignupRow[] = list.map((r: Record<string, unknown>) => {
        const ev = r.events as Partial<SignupEvent> | Partial<SignupEvent>[] | null | undefined
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
          confirmation_emailed_at: (r.confirmation_emailed_at as string | null) ?? null,
          reminder_emailed_at: (r.reminder_emailed_at as string | null) ?? null,
          confirmed_at: (r.confirmed_at as string | null) ?? null,
          events:
            one?.title && one.start_date
              ? {
                  title: one.title,
                  slug: one.slug ?? '',
                  start_date: one.start_date,
                  end_date: one.end_date ?? null,
                  start_time: one.start_time ?? null,
                  end_time: one.end_time ?? null,
                }
              : null,
        }
      })
      setRows(normalized)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Signups whose event has ended. Rows with no event data are kept visible.
  const visibleRows = useMemo(() => {
    if (showPast) return rows
    const now = new Date()
    return rows.filter((r) => !r.events || !isEventPast(r.events, now))
  }, [rows, showPast])
  const pastCount = rows.length - visibleRows.length

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of visibleRows) {
      const t = r.events?.title
      if (t) map.set(r.event_id, t)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [visibleRows])

  // A filtered event that just dropped off (past events hidden) would leave an empty list.
  useEffect(() => {
    if (eventFilter !== 'all' && !eventOptions.some(([id]) => id === eventFilter)) setEventFilter('all')
  }, [eventFilter, eventOptions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visibleRows.filter((r) => {
      if (eventFilter !== 'all' && r.event_id !== eventFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (q) {
        const hay = `${r.full_name} ${r.phone} ${r.email ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [visibleRows, eventFilter, statusFilter, search])

  const contacts = useMemo(
    () => filtered.map((r) => ({ name: r.full_name, phone: r.phone, email: r.email })),
    [filtered]
  )

  async function updateStatus(id: string, status: VolunteerSignupStatus) {
    setUpdatingId(id)
    const { error } = await supabase.from('event_volunteer_signups').update({ status }).eq('id', id)
    setUpdatingId(null)
    if (error) toast.error(error.message)
    else {
      const row = rows.find((r) => r.id === id)
      toast.success(
        status === 'confirmed' && row?.email && !row.confirmation_emailed_at
          ? 'Confirmed. The volunteer has been emailed their confirmation.'
          : 'Status updated'
      )
      // Confirming emails the volunteer in the database (migration 091);
      // reload so the "Emailed" note appears.
      void load()
    }
  }

  async function resendConfirmation(r: SignupRow) {
    setUpdatingId(r.id)
    const { data, error } = await supabase.rpc('kigh_admin_send_volunteer_email', {
      p_signup_id: r.id,
      p_kind: 'confirmation',
    })
    setUpdatingId(null)
    const res = data as { emailed: boolean; email: string | null } | null
    if (error) toast.error(error.message)
    else if (!res?.emailed) toast.error('No email on file. Use WhatsApp or text from the details view.')
    else {
      toast.success(`Confirmation emailed to ${res.email}`)
      void load()
    }
  }

  return (
    <>
      <SEOHead title="Volunteers" noIndex />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Event volunteers</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Signups for upcoming and ongoing events. When an event ends, its volunteers move to the Volunteer Roster.
              Names and phones are admin-only.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Link to="/admin/volunteer-roster">
              <Users className="h-3.5 w-3.5" /> Volunteer Roster
            </Link>
          </Button>
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
          <div className="flex items-center gap-2 lg:self-end lg:pb-2">
            <Switch id="vol-show-past" checked={showPast} onCheckedChange={setShowPast} />
            <Label htmlFor="vol-show-past" className="text-sm font-normal cursor-pointer whitespace-nowrap">
              Show past events{pastCount > 0 ? ` (${pastCount})` : ''}
            </Label>
          </div>
        </div>

        <OutreachPanel contacts={contacts} draft={draft} onDraftChange={setDraft} audienceLabel="volunteers" />

        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[200px]">Availability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="whitespace-nowrap">Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      : visibleRows.length === 0
                        ? 'No signups for upcoming events yet. Past volunteers are in the Volunteer Roster, or turn on “Show past events”.'
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
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[280px]">
                      {r.availability_note ? (
                        <button
                          type="button"
                          onClick={() => setSelected(r)}
                          className="line-clamp-2 text-left hover:text-foreground"
                          title="View full comment"
                        >
                          {r.availability_note}
                        </button>
                      ) : (
                        '—'
                      )}
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
                      {r.status === 'confirmed' ? (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          {r.confirmation_emailed_at ? (
                            <>
                              <MailCheck className="h-3 w-3 text-green-600" aria-hidden />
                              {emailedLabel(r.confirmation_emailed_at)}
                            </>
                          ) : !r.confirmed_at ? (
                            'Confirmed before email notices'
                          ) : r.email ? (
                            'Email sending…'
                          ) : (
                            'No email: message them'
                          )}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateShort(r.submitted_at.slice(0, 10))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View details & contact"
                          onClick={() => setSelected(r)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {r.status === 'confirmed' && r.email && r.confirmed_at ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Resend confirmation email"
                            disabled={updatingId === r.id}
                            onClick={() => void resendConfirmation(r)}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {r.events?.slug ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Public event">
                            <a href={`/events/${r.events.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ContactDetailDialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.full_name ?? ''}
        subtitle={selected?.events?.title}
        contact={selected ? { name: selected.full_name, phone: selected.phone, email: selected.email } : null}
        draft={draft}
        fields={
          selected
            ? [
                { label: 'Availability / comments', value: selected.availability_note },
                { label: 'Role', value: selected.volunteer_role },
                { label: 'Phone', value: selected.phone },
                { label: 'Email', value: selected.email },
                { label: 'Status', value: volunteerSignupStatusLabel(selected.status) },
                { label: 'Confirmation email', value: emailedLabel(selected.confirmation_emailed_at) },
                { label: 'Reminder email', value: emailedLabel(selected.reminder_emailed_at) },
                { label: 'Submitted', value: formatDateShort(selected.submitted_at.slice(0, 10)) },
              ]
            : []
        }
      />
    </>
  )
}
