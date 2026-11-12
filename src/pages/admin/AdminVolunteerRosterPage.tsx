import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye, Search } from 'lucide-react'
import { toast } from 'sonner'
import { SEOHead } from '@/components/SEOHead'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ContactDetailDialog, OutreachPanel, useOutreachDraft } from '@/components/admin/ContactOutreach'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { volunteerSignupStatusLabel } from '@/lib/eventVolunteerSignup'
import { buildVolunteerRoster, rosterRoleOptions, type RosterPerson, type RosterRecord } from '@/lib/volunteerRoster'

const DEFAULT_DRAFT = {
  subject: 'Volunteer with KIGH again?',
  message:
    'Hi {name}, thank you for volunteering with KIGH before! We have a new volunteer opportunity: <event or cause, date>. Are you available to help? Sign up here: <volunteer link>',
}

type Recency = 'all' | '6' | '12'
type Permission = 'all' | 'yes' | 'ask'

const EVENT_SIGNUP_COLUMNS =
  'id, event_id, full_name, phone, email, volunteer_role, availability_note, status, submitted_at, events(title, start_date)'

function day(iso: string): string {
  return formatDateShort(iso.slice(0, 10))
}

function monthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString()
}

async function loadEventSignups(): Promise<{ rows: Record<string, unknown>[]; consentKnown: boolean }> {
  const withConsent = await supabase
    .from('event_volunteer_signups')
    .select(`${EVENT_SIGNUP_COLUMNS}, recontact_consent_at`)
    .order('submitted_at', { ascending: false })
  if (!withConsent.error) return { rows: (withConsent.data ?? []) as Record<string, unknown>[], consentKnown: true }
  // Before migration 094 is applied the consent column does not exist yet; show the roster anyway.
  if (!/recontact_consent_at/.test(withConsent.error.message)) throw withConsent.error
  const plain = await supabase
    .from('event_volunteer_signups')
    .select(EVENT_SIGNUP_COLUMNS)
    .order('submitted_at', { ascending: false })
  if (plain.error) throw plain.error
  return { rows: (plain.data ?? []) as Record<string, unknown>[], consentKnown: false }
}

function toEventRecord(r: Record<string, unknown>): RosterRecord {
  const ev = r.events as { title?: string; start_date?: string } | { title?: string; start_date?: string }[] | null
  const one = Array.isArray(ev) ? ev[0] : ev
  return {
    source: 'event',
    id: r.id as string,
    full_name: (r.full_name as string) ?? '',
    phone: (r.phone as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    role: (r.volunteer_role as string | null) ?? null,
    submitted_at: r.submitted_at as string,
    event_id: (r.event_id as string) ?? null,
    event_title: one?.title ?? null,
    event_date: one?.start_date ?? null,
    status: (r.status as string) ?? null,
    recontact_ok: !!r.recontact_consent_at,
    note: (r.availability_note as string | null) ?? null,
  }
}

function toServeRecord(r: Record<string, unknown>): RosterRecord {
  return {
    source: 'serve',
    id: r.id as string,
    full_name: (r.full_name as string) ?? '',
    phone: (r.phone as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    role: (r.area_of_interest as string | null) ?? null,
    submitted_at: r.created_at as string,
    event_id: null,
    event_title: null,
    event_date: null,
    status: (r.status as string) ?? null,
    // Call to Serve is itself a request to be contacted about volunteering.
    recontact_ok: true,
    note: (r.how_to_help as string | null) ?? null,
  }
}

function historyLine(r: RosterRecord): string {
  if (r.source === 'serve') {
    return `${day(r.submitted_at)} · Call to Serve${r.role ? ` · ${r.role}` : ''}`
  }
  const when = r.event_date ? formatDateShort(r.event_date) : day(r.submitted_at)
  return [when, r.event_title ?? 'Event', r.role, r.status ? volunteerSignupStatusLabel(r.status) : null]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Admin → Volunteer Roster (`/admin/volunteer-roster`): every person who has
 * ever volunteered, one row each, with their full history. Used to invite
 * past volunteers to the next event or cause by email or WhatsApp.
 * See src/lib/volunteerRoster.ts for how signups are matched to a person.
 */
export function AdminVolunteerRosterPage() {
  const [eventRecords, setEventRecords] = useState<RosterRecord[]>([])
  const [serveRecords, setServeRecords] = useState<RosterRecord[]>([])
  const [consentKnown, setConsentKnown] = useState(true)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [recency, setRecency] = useState<Recency>('all')
  const [minEvents, setMinEvents] = useState('0')
  const [permission, setPermission] = useState<Permission>('all')
  const [includeServe, setIncludeServe] = useState(true)
  const [selected, setSelected] = useState<RosterPerson | null>(null)
  const [draft, setDraft] = useOutreachDraft('kigh.outreach.volunteer-roster', DEFAULT_DRAFT)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ev, serve] = await Promise.all([
        loadEventSignups(),
        supabase
          .from('service_interests')
          .select('id, full_name, email, phone, area_of_interest, how_to_help, status, created_at')
          .order('created_at', { ascending: false }),
      ])
      setEventRecords(ev.rows.map(toEventRecord))
      setConsentKnown(ev.consentKnown)
      if (serve.error) toast.error(`Call to Serve: ${serve.error.message}`)
      setServeRecords(serve.error ? [] : ((serve.data ?? []) as Record<string, unknown>[]).map(toServeRecord))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load volunteers')
      setEventRecords([])
      setServeRecords([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const people = useMemo(
    () => buildVolunteerRoster(includeServe ? [...eventRecords, ...serveRecords] : eventRecords),
    [eventRecords, serveRecords, includeServe]
  )

  const eventOptions = useMemo(() => {
    const map = new Map<string, { title: string; date: string }>()
    for (const r of eventRecords) {
      if (r.event_id && r.event_title) map.set(r.event_id, { title: r.event_title, date: r.event_date ?? '' })
    }
    return [...map.entries()].sort((a, b) => b[1].date.localeCompare(a[1].date))
  }, [eventRecords])

  const roleOptions = useMemo(() => rosterRoleOptions(people), [people])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const since = recency === 'all' ? null : monthsAgo(Number(recency))
    const min = Number(minEvents)
    return people.filter((p) => {
      if (eventFilter !== 'all' && !p.records.some((r) => r.event_id === eventFilter)) return false
      if (roleFilter !== 'all' && !p.roles.includes(roleFilter)) return false
      if (since && p.lastActive < since) return false
      if (min > 0 && p.eventIds.length < min) return false
      if (permission === 'yes' && !p.recontactOk) return false
      if (permission === 'ask' && p.recontactOk) return false
      if (q) {
        const hay = [p.name, ...p.emails, ...p.phones, ...p.records.map((r) => r.full_name)].join(' ').toLowerCase()
        // Phone search ignores formatting: "713 555" finds +17135551234.
        const digits = q.replace(/\D/g, '')
        const phoneHit = digits.length >= 3 && p.phones.some((ph) => ph.replace(/\D/g, '').includes(digits))
        if (!hay.includes(q) && !phoneHit) return false
      }
      return true
    })
  }, [people, search, eventFilter, roleFilter, recency, minEvents, permission])

  const contacts = useMemo(
    () => filtered.map((p) => ({ name: p.name, phone: p.phones[0] ?? null, email: p.emails[0] ?? null })),
    [filtered]
  )

  const askFirstShown = filtered.filter((p) => !p.recontactOk).length

  return (
    <>
      <SEOHead title="Volunteer Roster" noIndex />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Volunteer Roster</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Everyone who has volunteered with KIGH, one row per person across all events. Filter, then email or WhatsApp
              them about the next opportunity.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Link to="/admin/volunteers">
              <ArrowLeft className="h-3.5 w-3.5" /> Current event signups
            </Link>
          </Button>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, email or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
            <div className="form-field-stack min-w-0">
              <Label className="text-xs">Event</Label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger><SelectValue placeholder="Any event" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any event</SelectItem>
                  {eventOptions.map(([id, e]) => (
                    <SelectItem key={id} value={id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field-stack min-w-0">
              <Label className="text-xs">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger><SelectValue placeholder="Any role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any role</SelectItem>
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field-stack min-w-0">
              <Label className="text-xs">Last volunteered</Label>
              <Select value={recency} onValueChange={(v) => setRecency(v as Recency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="12">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="form-field-stack min-w-0">
              <Label className="text-xs">Events helped</Label>
              <Select value={minEvents} onValueChange={setMinEvents}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="1">1 or more</SelectItem>
                  <SelectItem value="2">2 or more</SelectItem>
                  <SelectItem value="3">3 or more</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="form-field-stack min-w-0 col-span-2 lg:col-span-1">
              <Label className="text-xs">Contact permission</Label>
              <Select value={permission} onValueChange={(v) => setPermission(v as Permission)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="yes">Agreed to future contact</SelectItem>
                  <SelectItem value="ask">Ask first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="roster-include-serve" checked={includeServe} onCheckedChange={setIncludeServe} />
            <Label htmlFor="roster-include-serve" className="text-sm font-normal cursor-pointer">
              Include Call to Serve sign-ups
            </Label>
          </div>
        </div>

        {!consentKnown ? (
          <p className="rounded-lg border border-kenyan-gold-200 bg-kenyan-gold-50/60 p-3 text-sm">
            Contact permission isn&apos;t recorded yet: database migration 094 hasn&apos;t been applied. Every event
            volunteer shows as “Ask first” until it is.
          </p>
        ) : null}

        <OutreachPanel contacts={contacts} draft={draft} onDraftChange={setDraft} audienceLabel="volunteers" />
        {askFirstShown > 0 ? (
          <p className="-mt-3 text-xs text-muted-foreground">
            {askFirstShown} of the {filtered.length} people shown signed up before KIGH asked about future opportunities
            (“Ask first”). When you message them, also ask whether they&apos;d like to keep hearing about volunteering.
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'person' : 'people'}`}
          {!loading && filtered.length !== people.length ? ` of ${people.length}` : ''}
        </p>

        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Events</TableHead>
                <TableHead className="hidden lg:table-cell">Roles</TableHead>
                <TableHead className="whitespace-nowrap">Last active</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-14 text-muted-foreground">
                    {people.length === 0 ? 'No volunteers yet.' : 'Nobody matches these filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  // Most recent event they actually helped at (skips cancelled / declined signups).
                  const latestEvent = p.records.find((r) => r.event_id && r.event_title && p.eventIds.includes(r.event_id))
                  return (
                    <TableRow key={p.key}>
                      <TableCell className="font-medium">
                        <button type="button" className="text-left hover:underline" onClick={() => setSelected(p)}>
                          {p.name}
                        </button>
                        {p.fromServe ? (
                          <Badge variant="muted" className="ml-2 align-middle">Call to Serve</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-[220px] truncate text-muted-foreground">{p.emails[0] ?? 'No email'}</div>
                        <div className="font-mono text-xs whitespace-nowrap">
                          {p.phones[0] ?? '—'}
                          {p.phones.length > 1 ? (
                            <span className="ml-1 font-sans text-muted-foreground">+{p.phones.length - 1} more</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{p.eventIds.length}</div>
                        {latestEvent ? (
                          <div className="max-w-[200px] truncate text-xs text-muted-foreground">{latestEvent.event_title}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm max-w-[220px]">
                        <div className="line-clamp-2">{p.roles.join(', ') || '—'}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{day(p.lastActive)}</TableCell>
                      <TableCell>
                        {p.recontactOk ? (
                          <Badge variant="success">Agreed</Badge>
                        ) : (
                          <Badge variant="warning" title="Signed up before KIGH asked about future opportunities">
                            Ask first
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View history & contact"
                          onClick={() => setSelected(p)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ContactDetailDialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={
          selected
            ? `${selected.eventIds.length} event${selected.eventIds.length === 1 ? '' : 's'} · first volunteered ${day(selected.firstActive)}`
            : undefined
        }
        contact={selected ? { name: selected.name, phone: selected.phones[0] ?? null, email: selected.emails[0] ?? null } : null}
        draft={draft}
        fields={
          selected
            ? [
                {
                  label: 'Contact permission',
                  value: selected.recontactOk
                    ? 'Agreed to be contacted about future volunteer opportunities'
                    : 'Ask first: signed up before KIGH asked about future opportunities',
                },
                { label: selected.emails.length > 1 ? 'Emails' : 'Email', value: selected.emails.join('\n') },
                { label: selected.phones.length > 1 ? 'Phones' : 'Phone', value: selected.phones.join('\n') },
                { label: 'History', value: selected.records.map(historyLine).join('\n') },
              ]
            : []
        }
      />
    </>
  )
}
