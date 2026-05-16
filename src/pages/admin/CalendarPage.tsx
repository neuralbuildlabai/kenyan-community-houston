import { useEffect, useState } from 'react'
import { Plus, Pencil, Eye, Archive, Trash2, Search, Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MapLink } from '@/components/MapLink'
import { supabase } from '@/lib/supabase'
import { CALENDAR_FILTER_CATEGORIES } from '@/lib/constants'
import {
  canonicalCategory,
  formatCategoryLabel,
  COMMUNITY_SUBMISSION_CATEGORIES,
  type CommunitySubmissionCategory,
} from '@/lib/communityCategories'
import { generateSlug } from '@/lib/utils'
import { formatDateShort } from '@/lib/utils'
import { toast } from 'sonner'
import { isoNow } from '@/lib/publishLifecycle'
import type { Event, EventStatus } from '@/lib/types'
import {
  buildVolunteerShareMessage,
  buildVolunteerSignupUrl,
  buildVolunteerWhatsAppShareUrl,
  generateVolunteerSignupSlug,
} from '@/lib/eventVolunteerSignup'

type EventRow = Event

const STATUSES: EventStatus[] = [
  'draft',
  'pending',
  'published',
  'unpublished',
  'archived',
  'cancelled',
  'rejected',
]

const defaultForm = () => ({
  id: '' as string | null,
  title: '',
  slug: '',
  short_description: '',
  description: '',
  category: COMMUNITY_SUBMISSION_CATEGORIES[0] as CommunitySubmissionCategory,
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  timezone: 'America/Chicago',
  location: '',
  address: '',
  city: '',
  state: 'TX',
  is_virtual: false,
  virtual_url: '',
  registration_url: '',
  image_url: '',
  flyer_url: '',
  ticket_url: '',
  is_free: true,
  ticket_price: '' as string,
  organizer_name: '',
  organizer_email: '',
  organizer_contact: '',
  capacity: '' as string,
  status: 'draft' as EventStatus,
  is_featured: false,
  tags_raw: '',
  /** Preserve first publication time when editing published events */
  published_at_prev: null as string | null,
  volunteer_signup_enabled: false,
  volunteer_signup_slug: '' as string,
  volunteer_signup_instructions: '',
  volunteer_slots_needed: '' as string,
  volunteer_signup_closes_at: '' as string,
})

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AdminCalendarPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(() => defaultForm())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('events').select('*').order('start_date', { ascending: false })
    setEvents((data as EventRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const displayed = events.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    if (categoryFilter !== 'all' && canonicalCategory(e.category) !== categoryFilter) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    if (timeFilter !== 'all') {
      const d = new Date(e.start_date + 'T12:00:00')
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      if (timeFilter === 'upcoming' && d < now) return false
      if (timeFilter === 'past' && d >= now) return false
    }
    return true
  })

  function openCreate() {
    setForm(defaultForm())
    setDialogOpen(true)
  }

  function openEdit(e: EventRow) {
    setForm({
      id: e.id,
      title: e.title,
      slug: e.slug,
      short_description: e.short_description ?? '',
      description: e.description ?? '',
      category: canonicalCategory(e.category),
      start_date: e.start_date,
      end_date: e.end_date ?? '',
      start_time: e.start_time ?? '',
      end_time: e.end_time ?? '',
      timezone: e.timezone ?? 'America/Chicago',
      location: e.location,
      address: e.address ?? '',
      city: e.city ?? '',
      state: e.state ?? 'TX',
      is_virtual: !!e.is_virtual,
      virtual_url: e.virtual_url ?? '',
      registration_url: e.registration_url ?? '',
      image_url: e.image_url ?? '',
      flyer_url: e.flyer_url ?? '',
      ticket_url: e.ticket_url ?? '',
      is_free: e.is_free,
      ticket_price: e.ticket_price != null ? String(e.ticket_price) : '',
      organizer_name: e.organizer_name ?? '',
      organizer_email: e.organizer_email ?? '',
      organizer_contact: e.organizer_contact ?? '',
      capacity: e.capacity != null ? String(e.capacity) : '',
      status: e.status,
      is_featured: !!e.is_featured,
      tags_raw: (e.tags ?? []).join(', '),
      published_at_prev: e.published_at ?? null,
      volunteer_signup_enabled: !!e.volunteer_signup_enabled,
      volunteer_signup_slug: e.volunteer_signup_slug ?? '',
      volunteer_signup_instructions: e.volunteer_signup_instructions ?? '',
      volunteer_slots_needed: e.volunteer_slots_needed != null ? String(e.volunteer_slots_needed) : '',
      volunteer_signup_closes_at: toDatetimeLocalValue(e.volunteer_signup_closes_at ?? undefined),
    })
    setDialogOpen(true)
  }

  async function saveEvent() {
    if (!form.title.trim() || !form.start_date || !form.location.trim()) {
      toast.error('Title, start date, and location are required')
      return
    }
    if (form.volunteer_signup_instructions.trim().length > 500) {
      toast.error('Volunteer instructions must be 500 characters or less')
      return
    }
    setSaving(true)
    let slug = (form.slug || generateSlug(form.title)).trim()
    if (!form.id) {
      const { data: clash } = await supabase.from('events').select('id').eq('slug', slug).maybeSingle()
      if (clash?.id) slug = `${slug}-${Date.now().toString(36)}`
    }

    const tags = form.tags_raw.split(',').map((t) => t.trim()).filter(Boolean)
    const now = isoNow()
    const published_at =
      form.status === 'published' ? (form.published_at_prev ?? now) : null

    const volunteer_signup_slug = form.volunteer_signup_enabled
      ? generateVolunteerSignupSlug({
          eventSlug: slug,
          eventTitle: form.title.trim(),
          existing: form.volunteer_signup_slug || null,
        })
      : form.volunteer_signup_slug.trim() || null

    const row = {
      title: form.title.trim(),
      slug,
      tags,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      category: form.category,
      start_date: form.start_date,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      timezone: form.timezone || 'America/Chicago',
      location: form.location.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || 'TX',
      is_virtual: form.is_virtual,
      virtual_url: form.virtual_url.trim() || null,
      registration_url: form.registration_url.trim() || null,
      image_url: form.image_url.trim() || null,
      flyer_url: form.flyer_url.trim() || form.image_url.trim() || null,
      ticket_url: form.ticket_url.trim() || null,
      is_free: form.is_free,
      ticket_price: !form.is_free && form.ticket_price ? parseFloat(form.ticket_price) : null,
      organizer_name: form.organizer_name.trim() || null,
      organizer_email: form.organizer_email.trim() || null,
      organizer_contact: form.organizer_contact.trim() || null,
      capacity: form.capacity ? parseInt(form.capacity, 10) : null,
      status: form.status,
      is_featured: form.is_featured,
      published_at,
      updated_at: now,
      organizer_website: null,
      volunteer_signup_enabled: form.volunteer_signup_enabled,
      volunteer_signup_slug,
      volunteer_signup_instructions: form.volunteer_signup_instructions.trim() || null,
      volunteer_slots_needed: form.volunteer_slots_needed.trim()
        ? parseInt(form.volunteer_slots_needed, 10)
        : null,
      volunteer_signup_closes_at: form.volunteer_signup_closes_at.trim()
        ? new Date(form.volunteer_signup_closes_at).toISOString()
        : null,
    }

    if (form.id) {
      const { error } = await supabase.from('events').update(row).eq('id', form.id)
      setSaving(false)
      if (error) toast.error(error.message)
      else {
        toast.success('Event updated')
        setDialogOpen(false)
        load()
      }
    } else {
      const { error } = await supabase.from('events').insert([row])
      setSaving(false)
      if (error) toast.error(error.message)
      else {
        toast.success('Event created')
        setDialogOpen(false)
        load()
      }
    }
  }

  async function archiveEvent(id: string) {
    const { error } = await supabase
      .from('events')
      .update({ status: 'archived', published_at: null, updated_at: isoNow() })
      .eq('id', id)
    if (error) toast.error('Failed to archive')
    else {
      toast.success('Archived')
      load()
    }
  }

  async function hardDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('events').delete().eq('id', deleteId)
    if (error) toast.error('Failed to delete')
    else {
      toast.success('Deleted')
      load()
    }
    setDeleteId(null)
  }

  function statusBadge(status: string) {
    const variant =
      status === 'published' ? 'default' : status === 'draft' ? 'secondary' : status === 'cancelled' ? 'destructive' : 'outline'
    return <Badge variant={variant as 'default' | 'secondary' | 'destructive' | 'outline'}>{status}</Badge>
  }

  const volunteerLinkSlugPreview = (form.slug.trim() || generateSlug(form.title) || 'event').trim()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendar & events</h1>
          <p className="text-muted-foreground text-sm">Create, publish, and archive community calendar events.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add event
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CALENDAR_FILTER_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden lg:table-cell">Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>
              ))
            ) : displayed.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No events match filters</TableCell></TableRow>
            ) : (
              displayed.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium max-w-[220px]">
                    <div className="truncate">{e.title}</div>
                    {!e.is_virtual && (e.address || e.location) ? (
                      <MapLink address={e.address} location={e.location} className="text-[11px] mt-1 font-normal" />
                    ) : null}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {e.is_featured ? <Badge variant="gold" className="text-[10px]">Featured</Badge> : null}
                      {e.is_recurring ? (
                        <Badge variant="outline" className="text-[10px] border-primary/35 text-primary">
                          Recurring
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDateShort(e.start_date)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{formatCategoryLabel(e.category)}</TableCell>
                  <TableCell>{statusBadge(e.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                        <a href={`/events/${e.slug}`} target="_blank" rel="noopener noreferrer"><Eye className="h-3.5 w-3.5" /></a>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => archiveEvent(e.id)} title="Archive">
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit event' : 'New event'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 py-2">
            <div className="sm:col-span-2 form-field-stack">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-field-stack">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto from title if empty" />
            </div>
            <div className="form-field-stack">
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as EventStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label>Short description</Label>
              <Input value={form.short_description} onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label>Full description</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-field-stack">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as CommunitySubmissionCategory }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CALENDAR_FILTER_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field-stack">
              <Label>Timezone</Label>
              <Input value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} />
            </div>
            <div className="form-field-stack">
              <Label>Start date *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="form-field-stack">
              <Label>End date</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div className="form-field-stack">
              <Label>Start time</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="form-field-stack">
              <Label>End time</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Switch checked={form.is_virtual} onCheckedChange={(v) => setForm((f) => ({ ...f, is_virtual: v }))} id="virt" />
              <Label htmlFor="virt">Virtual / online event</Label>
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label>Location label *</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder={form.is_virtual ? 'Zoom / platform name' : 'Venue name'} />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} disabled={form.is_virtual} />
            </div>
            <div className="form-field-stack">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="form-field-stack">
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label>Virtual join URL</Label>
              <Input value={form.virtual_url} onChange={(e) => setForm((f) => ({ ...f, virtual_url: e.target.value }))} placeholder="https://…" disabled={!form.is_virtual} />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label>Registration / RSVP URL</Label>
              <Input value={form.registration_url} onChange={(e) => setForm((f) => ({ ...f, registration_url: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label>Flyer URL (legacy)</Label>
              <Input value={form.flyer_url} onChange={(e) => setForm((f) => ({ ...f, flyer_url: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))} id="feat" />
              <Label htmlFor="feat">Featured on listings</Label>
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={form.is_free} onCheckedChange={(v) => setForm((f) => ({ ...f, is_free: v }))} id="free" />
              <Label htmlFor="free">Free event</Label>
            </div>
            {!form.is_free && (
              <div className="form-field-stack">
                <Label>Ticket price ($)</Label>
                <Input value={form.ticket_price} onChange={(e) => setForm((f) => ({ ...f, ticket_price: e.target.value }))} type="number" step="0.01" />
              </div>
            )}
            <div className="form-field-stack sm:col-span-2">
              <Label>Ticket / payment link</Label>
              <Input value={form.ticket_url} onChange={(e) => setForm((f) => ({ ...f, ticket_url: e.target.value }))} />
            </div>
            <div className="form-field-stack">
              <Label>Organizer name</Label>
              <Input value={form.organizer_name} onChange={(e) => setForm((f) => ({ ...f, organizer_name: e.target.value }))} />
            </div>
            <div className="form-field-stack">
              <Label>Organizer email</Label>
              <Input type="email" value={form.organizer_email} onChange={(e) => setForm((f) => ({ ...f, organizer_email: e.target.value }))} />
            </div>
            <div className="form-field-stack sm:col-span-2">
              <Label>Organizer contact (phone / other)</Label>
              <Input value={form.organizer_contact} onChange={(e) => setForm((f) => ({ ...f, organizer_contact: e.target.value }))} />
            </div>
            <div className="form-field-stack">
              <Label>Capacity</Label>
              <Input value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} type="number" min={0} />
            </div>
            <div className="form-field-stack sm:col-span-2">
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags_raw} onChange={(e) => setForm((f) => ({ ...f, tags_raw: e.target.value }))} />
            </div>

            <div className="sm:col-span-2 rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Volunteer signup</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Share this link with members who want to volunteer for this event.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={form.volunteer_signup_enabled}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, volunteer_signup_enabled: v }))}
                    id="vol-en"
                  />
                  <Label htmlFor="vol-en" className="text-sm">Enable</Label>
                </div>
              </div>
              {form.volunteer_signup_enabled ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label>Slots needed</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.volunteer_slots_needed}
                      onChange={(e) => setForm((f) => ({ ...f, volunteer_slots_needed: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label>Signup closes</Label>
                    <Input
                      type="datetime-local"
                      value={form.volunteer_signup_closes_at}
                      onChange={(e) => setForm((f) => ({ ...f, volunteer_signup_closes_at: e.target.value }))}
                    />
                  </div>
                  <div className="form-field-stack sm:col-span-2">
                    <Label>Instructions (max 500)</Label>
                    <Textarea
                      rows={2}
                      maxLength={500}
                      value={form.volunteer_signup_instructions}
                      onChange={(e) => setForm((f) => ({ ...f, volunteer_signup_instructions: e.target.value }))}
                      placeholder="Shown on the public volunteer page"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-xs text-muted-foreground">Shareable link</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input readOnly value={buildVolunteerSignupUrl(volunteerLinkSlugPreview)} className="font-mono text-xs" />
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="gap-1"
                          onClick={() => {
                            const u = buildVolunteerSignupUrl(volunteerLinkSlugPreview)
                            void navigator.clipboard.writeText(u).then(() => toast.success('Link copied'))
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-1" asChild>
                          <a href={buildVolunteerSignupUrl(volunteerLinkSlugPreview)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> Open
                          </a>
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-1" asChild>
                          <a
                            href={buildVolunteerWhatsAppShareUrl(
                              buildVolunteerShareMessage(form.title.trim() || 'this event', buildVolunteerSignupUrl(volunteerLinkSlugPreview))
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveEvent} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete event permanently?"
        description="Prefer archiving unless you need this removed from the database. This cannot be undone."
        onConfirm={hardDelete}
      />
    </div>
  )
}
