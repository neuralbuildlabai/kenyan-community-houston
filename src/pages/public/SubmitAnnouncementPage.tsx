import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { ANNOUNCEMENT_CATEGORIES } from '@/lib/constants'
import { generateSlug } from '@/lib/utils'
import { toast } from 'sonner'

type CalendarFields = {
  calendar_start_date: string
  calendar_end_date: string
  calendar_start_time: string
  calendar_end_time: string
  calendar_location: string
  calendar_address: string
  calendar_flyer_url: string
  calendar_registration_url: string
}

const emptyCalendar = (): CalendarFields => ({
  calendar_start_date: '',
  calendar_end_date: '',
  calendar_start_time: '',
  calendar_end_time: '',
  calendar_location: '',
  calendar_address: '',
  calendar_flyer_url: '',
  calendar_registration_url: '',
})

export function SubmitAnnouncementPage() {
  const [form, setForm] = useState({
    title: '',
    category: '',
    summary: '',
    body: '',
    author_name: '',
    external_url: '',
  })
  const [includeInCalendar, setIncludeInCalendar] = useState(false)
  const [calendarIsRecurring, setCalendarIsRecurring] = useState(false)
  const [calendarRecurrenceUntil, setCalendarRecurrenceUntil] = useState('')
  const [calendar, setCalendar] = useState<CalendarFields>(() => emptyCalendar())
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.category || !form.body) {
      toast.error('Please fill in all required fields')
      return
    }
    if (includeInCalendar) {
      if (!calendar.calendar_start_date?.trim()) {
        toast.error('Please add an event start date for the calendar.')
        return
      }
      if (!calendar.calendar_location?.trim()) {
        toast.error('Please add a location / venue for the calendar.')
        return
      }
      if (calendarIsRecurring && calendarRecurrenceUntil.trim()) {
        if (calendarRecurrenceUntil <= calendar.calendar_start_date) {
          toast.error('Recurrence end date must be after the first event date.')
          return
        }
      }
    }

    setLoading(true)
    const slug = generateSlug(form.title)
    const payload: Record<string, unknown> = {
      ...form,
      slug,
      external_url: form.external_url || null,
      summary: form.summary || '',
      status: 'pending',
      tags: [],
      include_in_calendar: includeInCalendar,
      calendar_start_date: includeInCalendar ? calendar.calendar_start_date || null : null,
      calendar_end_date: includeInCalendar ? calendar.calendar_end_date || null : null,
      calendar_start_time: includeInCalendar ? calendar.calendar_start_time || null : null,
      calendar_end_time: includeInCalendar ? calendar.calendar_end_time || null : null,
      calendar_location: includeInCalendar ? calendar.calendar_location.trim() : null,
      calendar_address: includeInCalendar ? calendar.calendar_address.trim() || null : null,
      calendar_flyer_url: includeInCalendar ? calendar.calendar_flyer_url.trim() || null : null,
      calendar_registration_url: includeInCalendar ? calendar.calendar_registration_url.trim() || null : null,
      calendar_is_recurring: includeInCalendar && calendarIsRecurring,
      calendar_recurrence_frequency: includeInCalendar && calendarIsRecurring ? 'weekly' : null,
      calendar_recurrence_until: includeInCalendar && calendarIsRecurring && calendarRecurrenceUntil.trim()
        ? calendarRecurrenceUntil
        : null,
      calendar_recurrence_count: null,
    }

    const { error } = await supabase.from('announcements').insert([payload])
    setLoading(false)
    if (error) toast.error(error.message || 'Submission failed. Please try again.')
    else setSubmitted(true)
  }

  const setCal = (k: keyof CalendarFields, v: string) => setCalendar((c) => ({ ...c, [k]: v }))

  if (submitted)
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Announcement Submitted!</h2>
        <p className="text-muted-foreground">We will review it and publish when it meets our guidelines.</p>
      </div>
    )

  return (
    <>
      <SEOHead title="Submit an Announcement" description="Submit a community announcement for review." />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit an Announcement</h1>
          <p className="text-muted-foreground">All submissions are reviewed before publication.</p>
        </div>
        <form onSubmit={handleSubmit} className="form-page-card space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            <div className="sm:col-span-2 form-field-stack">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-field-stack">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={form.category || undefined} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field-stack">
              <Label htmlFor="author_name">Your Name</Label>
              <Input id="author_name" value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label htmlFor="summary">Summary (optional)</Label>
              <Input id="summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="One-line summary" />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label htmlFor="body">
                Full Announcement <span className="text-destructive">*</span>
              </Label>
              <Textarea id="body" rows={7} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label htmlFor="external_url">External Link (optional)</Label>
              <Input id="external_url" type="url" value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://…" />
            </div>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-secondary/40 via-muted/25 to-background/80 px-5 py-5 space-y-4 shadow-inner">
            <div className="flex items-start gap-3">
              <Checkbox
                id="also_event"
                checked={includeInCalendar}
                onCheckedChange={(v) => {
                  const on = v === true
                  setIncludeInCalendar(on)
                  if (!on) {
                    setCalendar(emptyCalendar())
                    setCalendarIsRecurring(false)
                    setCalendarRecurrenceUntil('')
                  }
                }}
                className="mt-1"
              />
              <div className="space-y-1 min-w-0">
                <Label htmlFor="also_event" className="text-base font-semibold cursor-pointer leading-snug">
                  Is this also an event?
                </Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Yes — add this to the public calendar after approval (church services, recurring meetups, one-off gatherings).
                </p>
              </div>
            </div>

            {includeInCalendar && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 pt-3 border-t border-border/45">
                <p className="sm:col-span-2 text-xs text-muted-foreground leading-relaxed">
                  For recurring events, submit the next date and mention the recurrence in the announcement.
                </p>
                <div className="form-field-stack">
                  <Label htmlFor="calendar_start_date">
                    Event start date <span className="text-destructive">*</span>
                  </Label>
                  <Input id="calendar_start_date" type="date" value={calendar.calendar_start_date} onChange={(e) => setCal('calendar_start_date', e.target.value)} />
                </div>
                <div className="form-field-stack">
                  <Label htmlFor="calendar_end_date">End date (optional)</Label>
                  <Input id="calendar_end_date" type="date" value={calendar.calendar_end_date} onChange={(e) => setCal('calendar_end_date', e.target.value)} />
                </div>
                <div className="form-field-stack">
                  <Label htmlFor="calendar_start_time">Start time</Label>
                  <Input id="calendar_start_time" type="time" value={calendar.calendar_start_time} onChange={(e) => setCal('calendar_start_time', e.target.value)} />
                </div>
                <div className="form-field-stack">
                  <Label htmlFor="calendar_end_time">End time (optional)</Label>
                  <Input id="calendar_end_time" type="time" value={calendar.calendar_end_time} onChange={(e) => setCal('calendar_end_time', e.target.value)} />
                </div>
                <div className="sm:col-span-2 form-field-stack">
                  <Label htmlFor="calendar_location">
                    Location / venue label <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="calendar_location"
                    value={calendar.calendar_location}
                    onChange={(e) => setCal('calendar_location', e.target.value)}
                    placeholder="St Nicholas Catholic Church"
                  />
                </div>
                <div className="sm:col-span-2 form-field-stack">
                  <Label htmlFor="calendar_address">Street address (optional)</Label>
                  <Input id="calendar_address" value={calendar.calendar_address} onChange={(e) => setCal('calendar_address', e.target.value)} placeholder="Street, city, TX" />
                </div>
                <div className="sm:col-span-2 form-field-stack">
                  <Label htmlFor="calendar_flyer_url">Flyer / Poster Link</Label>
                  <Input
                    id="calendar_flyer_url"
                    type="url"
                    value={calendar.calendar_flyer_url}
                    onChange={(e) => setCal('calendar_flyer_url', e.target.value)}
                    placeholder="https://…"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Paste a public image or flyer link. Upload support will be added after review.
                  </p>
                </div>
                <div className="sm:col-span-2 form-field-stack">
                  <Label htmlFor="calendar_registration_url">Registration / RSVP link (optional)</Label>
                  <Input
                    id="calendar_registration_url"
                    type="url"
                    value={calendar.calendar_registration_url}
                    onChange={(e) => setCal('calendar_registration_url', e.target.value)}
                    placeholder="https://…"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">If blank, your general external link above may be used when the event is published.</p>
                </div>

                <div className="sm:col-span-2 flex items-start gap-3 pt-1 border-t border-border/35">
                  <Checkbox
                    id="cal_repeat"
                    checked={calendarIsRecurring}
                    onCheckedChange={(v) => {
                      const on = v === true
                      setCalendarIsRecurring(on)
                      if (!on) setCalendarRecurrenceUntil('')
                    }}
                    className="mt-1"
                  />
                  <div className="space-y-3 min-w-0 flex-1">
                    <Label htmlFor="cal_repeat" className="text-base font-semibold cursor-pointer leading-snug">
                      Does this repeat weekly?
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      When checked, reviewers can publish a weekly series after approval. If you leave &quot;Repeat until&quot; empty,
                      upcoming occurrences are generated for about the next six months.
                    </p>
                    {calendarIsRecurring && (
                      <div className="form-field-stack max-w-md">
                        <Label htmlFor="calendar_recurrence_until">Repeat until (optional)</Label>
                        <Input
                          id="calendar_recurrence_until"
                          type="date"
                          value={calendarRecurrenceUntil}
                          onChange={(e) => setCalendarRecurrenceUntil(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full sm:w-auto min-w-[12rem]" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit for Review'}
          </Button>
        </form>
      </div>
    </>
  )
}
