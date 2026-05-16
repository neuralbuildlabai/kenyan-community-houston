import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, ShieldCheck, Eye } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubmissionMediaUploadField } from '@/components/public/SubmissionMediaUploadField'
import { supabase } from '@/lib/supabase'
import { ANNOUNCEMENT_CATEGORIES } from '@/lib/constants'
import { uploadSubmissionMedia } from '@/lib/submissionMediaUpload'
import { trackSubmissionCreated } from '@/lib/analytics'
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
    image_url: '',
  })
  const [includeInCalendar, setIncludeInCalendar] = useState(false)
  const [calendarIsRecurring, setCalendarIsRecurring] = useState(false)
  const [calendarRecurrenceUntil, setCalendarRecurrenceUntil] = useState('')
  const [calendar, setCalendar] = useState<CalendarFields>(() => emptyCalendar())
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [announcementImageUploadUrl, setAnnouncementImageUploadUrl] = useState<string | null>(null)
  const [announcementImageFileName, setAnnouncementImageFileName] = useState<string | null>(null)
  const [announcementImageUploading, setAnnouncementImageUploading] = useState(false)
  const [announcementImageError, setAnnouncementImageError] = useState<string | null>(null)
  const [calendarFlyerUploadUrl, setCalendarFlyerUploadUrl] = useState<string | null>(null)
  const [calendarFlyerFileName, setCalendarFlyerFileName] = useState<string | null>(null)
  const [calendarFlyerUploading, setCalendarFlyerUploading] = useState(false)
  const [calendarFlyerError, setCalendarFlyerError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.category || !form.body) {
      toast.error('Please fill in all required fields')
      return
    }
    if (announcementImageUploading || calendarFlyerUploading) {
      toast.error('Wait for uploads to finish.')
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
      image_url: announcementImageUploadUrl?.trim() || form.image_url.trim() || null,
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
      calendar_flyer_url: includeInCalendar
        ? calendarFlyerUploadUrl?.trim() || calendar.calendar_flyer_url.trim() || null
        : null,
      calendar_registration_url: includeInCalendar
        ? calendar.calendar_registration_url.trim() || null
        : null,
      calendar_is_recurring: includeInCalendar && calendarIsRecurring,
      calendar_recurrence_frequency:
        includeInCalendar && calendarIsRecurring ? 'weekly' : null,
      calendar_recurrence_until:
        includeInCalendar && calendarIsRecurring && calendarRecurrenceUntil.trim()
          ? calendarRecurrenceUntil
          : null,
      calendar_recurrence_count: null,
    }

    const { error } = await supabase.from('announcements').insert([payload])
    setLoading(false)
    if (error) toast.error(error.message || 'Submission failed. Please try again.')
    else {
      void trackSubmissionCreated('announcement')
      setSubmitted(true)
    }
  }

  const setCal = (k: keyof CalendarFields, v: string) =>
    setCalendar((c) => ({ ...c, [k]: v }))

  async function handleAnnouncementImageFile(file: File) {
    setAnnouncementImageError(null)
    setAnnouncementImageUploading(true)
    const result = await uploadSubmissionMedia(supabase, file)
    setAnnouncementImageUploading(false)
    if ('error' in result) {
      setAnnouncementImageUploadUrl(null)
      setAnnouncementImageFileName(null)
      setAnnouncementImageError(result.error)
      return
    }
    setAnnouncementImageUploadUrl(result.publicUrl)
    setAnnouncementImageFileName(file.name)
  }

  function clearAnnouncementImageUpload() {
    setAnnouncementImageUploadUrl(null)
    setAnnouncementImageFileName(null)
    setAnnouncementImageError(null)
  }

  async function handleCalendarFlyerFile(file: File) {
    setCalendarFlyerError(null)
    setCalendarFlyerUploading(true)
    const result = await uploadSubmissionMedia(supabase, file)
    setCalendarFlyerUploading(false)
    if ('error' in result) {
      setCalendarFlyerUploadUrl(null)
      setCalendarFlyerFileName(null)
      setCalendarFlyerError(result.error)
      return
    }
    setCalendarFlyerUploadUrl(result.publicUrl)
    setCalendarFlyerFileName(file.name)
  }

  function clearCalendarFlyerUpload() {
    setCalendarFlyerUploadUrl(null)
    setCalendarFlyerFileName(null)
    setCalendarFlyerError(null)
  }

  const uploadsBusy = announcementImageUploading || calendarFlyerUploading

  if (submitted) {
    return (
      <>
        <SEOHead title="Announcement submitted" description="Your announcement was submitted for review." />
        <PublicPageHero
          eyebrow="Submission received"
          title="Announcement Submitted!"
          subtitle="We will review your announcement and publish it once it meets community guidelines."
          primaryAction={
            <Button asChild>
              <Link to="/announcements">Back to Announcements</Link>
            </Button>
          }
          tone="tint"
        />
        <div className="public-container py-12 text-center">
          <CheckCircle className="mx-auto h-14 w-14 text-primary/80" />
        </div>
      </>
    )
  }

  return (
    <>
      <SEOHead
        title="Submit an Announcement"
        description="Submit a community announcement for review."
      />

      <PublicPageHero
        eyebrow="Community news"
        title="Submit an Announcement"
        subtitle="Share community news, official updates, or notices. All submissions are reviewed before publication."
        primaryAction={
          <Button asChild variant="ghost" size="sm" className="-ml-3 gap-1">
            <Link to="/announcements">
              <ArrowLeft className="h-4 w-4" /> Back to announcements
            </Link>
          </Button>
        }
        tone="default"
      />

      <section className="py-10 sm:py-14 lg:py-16">
        <div className="public-container grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="form-page-card space-y-10">
              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Announcement</legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="title">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label>
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.category || undefined}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
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
                    <Input
                      id="author_name"
                      value={form.author_name}
                      onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="summary">Summary (optional)</Label>
                    <Input
                      id="summary"
                      value={form.summary}
                      onChange={(e) => setForm({ ...form, summary: e.target.value })}
                      placeholder="One-line summary"
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="body">
                      Full Announcement <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="body"
                      rows={7}
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="external_url">External Link (optional)</Label>
                    <Input
                      id="external_url"
                      type="url"
                      value={form.external_url}
                      onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                      placeholder="https://…"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Image (optional)</legend>
                <SubmissionMediaUploadField
                  inputId="announcement_image_file"
                  label="Announcement image"
                  selectedFileName={announcementImageFileName}
                  uploadedUrl={announcementImageUploadUrl}
                  uploading={announcementImageUploading}
                  error={announcementImageError}
                  onPickFile={handleAnnouncementImageFile}
                  onClear={clearAnnouncementImageUpload}
                  disabled={loading}
                />
                <div className="form-field-stack">
                  <Label htmlFor="image_url">Image link (optional)</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://…"
                  />
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Paste a public image URL if you are not uploading a file. Uploaded file takes
                    precedence.
                  </p>
                </div>
              </fieldset>

              <fieldset className="space-y-5 rounded-2xl border border-primary/15 bg-gradient-to-br from-secondary/40 via-muted/25 to-background/80 px-5 py-5 shadow-inner">
                <legend className="-ml-1 px-1 text-base font-semibold text-foreground">
                  Calendar event (optional)
                </legend>
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
                        clearCalendarFlyerUpload()
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="min-w-0 space-y-1">
                    <Label htmlFor="also_event" className="cursor-pointer text-base font-semibold leading-snug">
                      Is this also an event?
                    </Label>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Yes — add this to the public calendar after approval (church services,
                      recurring meetups, one-off gatherings).
                    </p>
                  </div>
                </div>

                {includeInCalendar && (
                  <div className="grid grid-cols-1 gap-x-4 gap-y-5 border-t border-border/45 pt-5 sm:grid-cols-2">
                    <p className="sm:col-span-2 text-xs leading-relaxed text-muted-foreground">
                      For recurring events, submit the next date and mention the recurrence in the
                      announcement.
                    </p>
                    <div className="form-field-stack">
                      <Label htmlFor="calendar_start_date">
                        Event start date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="calendar_start_date"
                        type="date"
                        value={calendar.calendar_start_date}
                        onChange={(e) => setCal('calendar_start_date', e.target.value)}
                      />
                    </div>
                    <div className="form-field-stack">
                      <Label htmlFor="calendar_end_date">End date (optional)</Label>
                      <Input
                        id="calendar_end_date"
                        type="date"
                        value={calendar.calendar_end_date}
                        onChange={(e) => setCal('calendar_end_date', e.target.value)}
                      />
                    </div>
                    <div className="form-field-stack">
                      <Label htmlFor="calendar_start_time">Start time</Label>
                      <Input
                        id="calendar_start_time"
                        type="time"
                        value={calendar.calendar_start_time}
                        onChange={(e) => setCal('calendar_start_time', e.target.value)}
                      />
                    </div>
                    <div className="form-field-stack">
                      <Label htmlFor="calendar_end_time">End time (optional)</Label>
                      <Input
                        id="calendar_end_time"
                        type="time"
                        value={calendar.calendar_end_time}
                        onChange={(e) => setCal('calendar_end_time', e.target.value)}
                      />
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
                      <Input
                        id="calendar_address"
                        value={calendar.calendar_address}
                        onChange={(e) => setCal('calendar_address', e.target.value)}
                        placeholder="Street, city, TX"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <SubmissionMediaUploadField
                        inputId="calendar_flyer_file"
                        label="Upload flyer / poster (calendar)"
                        selectedFileName={calendarFlyerFileName}
                        uploadedUrl={calendarFlyerUploadUrl}
                        uploading={calendarFlyerUploading}
                        error={calendarFlyerError}
                        onPickFile={handleCalendarFlyerFile}
                        onClear={clearCalendarFlyerUpload}
                        disabled={loading}
                      />
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
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        Upload a flyer or paste a public link for the calendar event. Reviewed before
                        publication.
                      </p>
                    </div>
                    <div className="sm:col-span-2 form-field-stack">
                      <Label htmlFor="calendar_registration_url">
                        Registration / RSVP link (optional)
                      </Label>
                      <Input
                        id="calendar_registration_url"
                        type="url"
                        value={calendar.calendar_registration_url}
                        onChange={(e) => setCal('calendar_registration_url', e.target.value)}
                        placeholder="https://…"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        If blank, your general external link above may be used when the event is
                        published.
                      </p>
                    </div>

                    <div className="sm:col-span-2 flex items-start gap-3 border-t border-border/35 pt-3">
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
                      <div className="min-w-0 flex-1 space-y-3">
                        <Label htmlFor="cal_repeat" className="cursor-pointer text-base font-semibold leading-snug">
                          Does this repeat weekly?
                        </Label>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          When checked, reviewers can publish a weekly series after approval. If
                          &quot;Repeat until&quot; is empty, upcoming occurrences are generated for about
                          six months.
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
              </fieldset>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full min-w-[12rem] sm:w-auto"
                  disabled={loading || uploadsBusy}
                >
                  {loading ? 'Submitting…' : 'Submit for Review'}
                </Button>
                <p className="text-xs text-muted-foreground sm:max-w-md">
                  Announcements are typically reviewed within 1–2 business days.
                </p>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Submission guidelines
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                Keep announcements official
              </h2>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Community-focused.</span> News,
                    notices, programs, and updates from groups or KIGH leadership.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Eye className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">No commercial promotions.</span>{' '}
                    Businesses belong in the Business Directory.
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
