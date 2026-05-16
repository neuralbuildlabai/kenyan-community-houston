import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, ShieldCheck, Eye, Sparkles } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { SubmissionMediaUploadField } from '@/components/public/SubmissionMediaUploadField'
import { supabase } from '@/lib/supabase'
import { EVENT_CATEGORIES } from '@/lib/constants'
import { uploadSubmissionMedia } from '@/lib/submissionMediaUpload'
import { trackSubmissionCreated } from '@/lib/analytics'
import { generateSlug } from '@/lib/utils'
import { toast } from 'sonner'

export function SubmitEventPage() {
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    address: '',
    is_free: true,
    ticket_price: '',
    ticket_url: '',
    flyer_url: '',
    organizer_name: '',
    organizer_contact: '',
    organizer_website: '',
    tags_raw: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [flyerUploadUrl, setFlyerUploadUrl] = useState<string | null>(null)
  const [flyerFileName, setFlyerFileName] = useState<string | null>(null)
  const [flyerUploading, setFlyerUploading] = useState(false)
  const [flyerUploadError, setFlyerUploadError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.category || !form.start_date || !form.location) {
      toast.error('Please fill in all required fields')
      return
    }
    if (flyerUploading) {
      toast.error('Wait for the flyer upload to finish.')
      return
    }
    setLoading(true)
    const slug = generateSlug(form.title)
    const tags = form.tags_raw.split(',').map((t) => t.trim()).filter(Boolean)
    const { error } = await supabase.from('events').insert([
      {
        title: form.title,
        slug,
        category: form.category,
        description: form.description,
        start_date: form.start_date,
        end_date: form.end_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location,
        address: form.address || null,
        is_free: form.is_free,
        ticket_price:
          !form.is_free && form.ticket_price ? parseFloat(form.ticket_price) : null,
        ticket_url: form.ticket_url || null,
        flyer_url: flyerUploadUrl?.trim() || form.flyer_url.trim() || null,
        organizer_name: form.organizer_name || null,
        organizer_contact: form.organizer_contact || null,
        organizer_website: form.organizer_website || null,
        tags,
        status: 'pending',
      },
    ])
    setLoading(false)
    if (error) {
      toast.error('Submission failed. Please try again.')
    } else {
      void trackSubmissionCreated('event')
      setSubmitted(true)
    }
  }

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  async function handleFlyerFile(file: File) {
    setFlyerUploadError(null)
    setFlyerUploading(true)
    const result = await uploadSubmissionMedia(supabase, file)
    setFlyerUploading(false)
    if ('error' in result) {
      setFlyerUploadUrl(null)
      setFlyerFileName(null)
      setFlyerUploadError(result.error)
      return
    }
    setFlyerUploadUrl(result.publicUrl)
    setFlyerFileName(file.name)
  }

  function clearFlyerUpload() {
    setFlyerUploadUrl(null)
    setFlyerFileName(null)
    setFlyerUploadError(null)
  }

  if (submitted) {
    return (
      <>
        <SEOHead title="Event submitted" description="Your event was submitted for review." />
        <PublicPageHero
          eyebrow="Submission received"
          title="Event Submitted!"
          subtitle="Your event is under review by KIGH moderators and will be published once approved."
          primaryAction={
            <Button asChild>
              <Link to="/events">Back to Events</Link>
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
        title="Submit an Event"
        description="Submit a Kenyan community event in Houston for review and publication."
      />

      <PublicPageHero
        eyebrow="Community calendar"
        title="Submit an Event"
        subtitle="Share an upcoming gathering with neighbors across Greater Houston. A strong listing tells visitors clearly when, where, who it's for, and how to take part. Reviewed by KIGH moderators before publication."
        primaryAction={
          <Button asChild variant="ghost" size="sm" className="-ml-3 gap-1">
            <Link to="/events">
              <ArrowLeft className="h-4 w-4" /> Back to events
            </Link>
          </Button>
        }
        tone="tint"
      />

      <section className="py-10 sm:py-14 lg:py-16">
        <div className="public-container grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="form-page-card space-y-10">
              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Event basics</legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="title">
                      Event Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                      placeholder="Community Picnic 2025"
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label>
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select onValueChange={(v) => set('category', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="location">
                      Venue / Location <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => set('location', e.target.value)}
                      placeholder="Sugar Land Town Square"
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="address">Full Address</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => set('address', e.target.value)}
                      placeholder="2277 Lone Star Dr, Sugar Land, TX"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Date &amp; time</legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="start_date">
                      Start Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={form.start_date}
                      onChange={(e) => set('start_date', e.target.value)}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={form.end_date}
                      onChange={(e) => set('end_date', e.target.value)}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={form.start_time}
                      onChange={(e) => set('start_time', e.target.value)}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={form.end_time}
                      onChange={(e) => set('end_time', e.target.value)}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Description</legend>
                <div className="form-field-stack">
                  <Label htmlFor="description">Event Description</Label>
                  <Textarea
                    id="description"
                    rows={5}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Describe your event for the community…"
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Tickets &amp; RSVP</legend>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.is_free}
                    onCheckedChange={(v) => set('is_free', v)}
                    id="is_free"
                  />
                  <Label htmlFor="is_free">Free Event</Label>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  {!form.is_free && (
                    <div className="form-field-stack">
                      <Label htmlFor="ticket_price">Ticket Price ($)</Label>
                      <Input
                        id="ticket_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.ticket_price}
                        onChange={(e) => set('ticket_price', e.target.value)}
                        placeholder="25.00"
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="ticket_url">Ticket / RSVP Link</Label>
                    <Input
                      id="ticket_url"
                      type="url"
                      value={form.ticket_url}
                      onChange={(e) => set('ticket_url', e.target.value)}
                      placeholder="https://eventbrite.com/…"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Flyer / artwork</legend>
                <SubmissionMediaUploadField
                  inputId="flyer_file"
                  label="Upload flyer / poster"
                  selectedFileName={flyerFileName}
                  uploadedUrl={flyerUploadUrl}
                  uploading={flyerUploading}
                  error={flyerUploadError}
                  onPickFile={handleFlyerFile}
                  onClear={clearFlyerUpload}
                  disabled={loading}
                />
                <div className="form-field-stack">
                  <Label htmlFor="flyer_url">Flyer / Poster Link</Label>
                  <Input
                    id="flyer_url"
                    type="url"
                    value={form.flyer_url}
                    onChange={(e) => set('flyer_url', e.target.value)}
                    placeholder="https://…"
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Upload an image or paste a public link. Uploaded file takes precedence.
                  </p>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Organizer</legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="organizer_name">Your Name / Organization</Label>
                    <Input
                      id="organizer_name"
                      value={form.organizer_name}
                      onChange={(e) => set('organizer_name', e.target.value)}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="organizer_contact">Contact (phone/email)</Label>
                    <Input
                      id="organizer_contact"
                      value={form.organizer_contact}
                      onChange={(e) => set('organizer_contact', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="tags_raw">Tags (comma separated)</Label>
                    <Input
                      id="tags_raw"
                      value={form.tags_raw}
                      onChange={(e) => set('tags_raw', e.target.value)}
                      placeholder="family, outdoor, food"
                    />
                  </div>
                </div>
              </fieldset>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full min-w-[14rem] sm:w-auto"
                  disabled={loading || flyerUploading}
                >
                  {loading ? 'Submitting…' : 'Submit Event for Review'}
                </Button>
                <p className="text-xs text-muted-foreground sm:max-w-md">
                  Events are usually published within 1–2 business days after review.
                </p>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Before you submit
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                What makes a strong listing
              </h2>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Accurate date, time, and venue.</span>{' '}
                    Confirm the full address and start time so neighbors arrive at the right place
                    on the right day.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Eye className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Clear description.</span> A short
                    paragraph about who is hosting, who the event is for, and what to expect helps
                    families decide whether to attend.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Flyer if available.</span> A
                    flyer or simple poster makes the listing more inviting and helps members
                    recognize the event when they share it.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 text-xs text-muted-foreground leading-relaxed">
              <p>
                Submitting a recurring church service or weekly meetup? Use{' '}
                <Link to="/announcements/submit" className="link-editorial">
                  Submit an Announcement
                </Link>{' '}
                and tick &quot;Is this also an event?&quot; — reviewers can publish the full series for
                you.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
