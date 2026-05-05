import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
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
    title: '', category: '', description: '', start_date: '', end_date: '',
    start_time: '', end_time: '', location: '', address: '',
    is_free: true, ticket_price: '', ticket_url: '', flyer_url: '',
    organizer_name: '', organizer_contact: '', organizer_website: '',
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
    const { error } = await supabase.from('events').insert([{
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
      ticket_price: !form.is_free && form.ticket_price ? parseFloat(form.ticket_price) : null,
      ticket_url: form.ticket_url || null,
      flyer_url: flyerUploadUrl?.trim() || form.flyer_url.trim() || null,
      organizer_name: form.organizer_name || null,
      organizer_contact: form.organizer_contact || null,
      organizer_website: form.organizer_website || null,
      tags,
      status: 'pending',
    }])
    setLoading(false)
    if (error) { toast.error('Submission failed. Please try again.') }
    else {
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

  if (submitted) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Event Submitted!</h2>
      <p className="text-muted-foreground">Your event is under review and will be published after moderation.</p>
    </div>
  )

  return (
    <>
      <SEOHead title="Submit an Event" description="Submit a Kenyan community event in Houston for review and publication." />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit an Event</h1>
          <p className="text-muted-foreground">All submissions are reviewed before publication.</p>
        </div>
        <form onSubmit={handleSubmit} className="form-page-card space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            <div className="sm:col-span-2 form-field-stack">
              <Label htmlFor="title">Event Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Community Picnic 2025" />
            </div>
            <div className="form-field-stack">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select onValueChange={(v) => set('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="form-field-stack">
              <Label htmlFor="location">Venue / Location <span className="text-destructive">*</span></Label>
              <Input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Sugar Land Town Square" />
            </div>
            <div className="form-field-stack">
              <Label htmlFor="address">Full Address</Label>
              <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="2277 Lone Star Dr, Sugar Land, TX" />
            </div>
            <div className="form-field-stack">
              <Label htmlFor="start_date">Start Date <span className="text-destructive">*</span></Label>
              <Input id="start_date" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="form-field-stack">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
            <div className="form-field-stack">
              <Label htmlFor="start_time">Start Time</Label>
              <Input id="start_time" type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
            </div>
            <div className="form-field-stack">
              <Label htmlFor="end_time">End Time</Label>
              <Input id="end_time" type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label htmlFor="description">Event Description</Label>
              <Textarea id="description" rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe your event…" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_free} onCheckedChange={(v) => set('is_free', v)} id="is_free" />
              <Label htmlFor="is_free">Free Event</Label>
            </div>
            {!form.is_free && (
              <div className="form-field-stack">
                <Label htmlFor="ticket_price">Ticket Price ($)</Label>
                <Input id="ticket_price" type="number" min="0" step="0.01" value={form.ticket_price} onChange={(e) => set('ticket_price', e.target.value)} placeholder="25.00" />
              </div>
            )}
            <div className="form-field-stack">
              <Label htmlFor="ticket_url">Ticket / RSVP Link</Label>
              <Input id="ticket_url" type="url" value={form.ticket_url} onChange={(e) => set('ticket_url', e.target.value)} placeholder="https://eventbrite.com/…" />
            </div>
            <div className="sm:col-span-2">
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
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label htmlFor="flyer_url">Flyer / Poster Link</Label>
              <Input
                id="flyer_url"
                type="url"
                value={form.flyer_url}
                onChange={(e) => set('flyer_url', e.target.value)}
                placeholder="https://…"
              />
            </div>
            <p className="sm:col-span-2 text-[11px] text-muted-foreground leading-relaxed">
              Upload a flyer image or paste a public flyer link. Submissions are reviewed before publication.
            </p>
            <div className="form-field-stack">
              <Label htmlFor="organizer_name">Your Name / Organization</Label>
              <Input id="organizer_name" value={form.organizer_name} onChange={(e) => set('organizer_name', e.target.value)} />
            </div>
            <div className="form-field-stack">
              <Label htmlFor="organizer_contact">Contact (phone/email)</Label>
              <Input id="organizer_contact" value={form.organizer_contact} onChange={(e) => set('organizer_contact', e.target.value)} />
            </div>
            <div className="sm:col-span-2 form-field-stack">
              <Label htmlFor="tags_raw">Tags (comma separated)</Label>
              <Input id="tags_raw" value={form.tags_raw} onChange={(e) => set('tags_raw', e.target.value)} placeholder="family, outdoor, food" />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto min-w-[14rem]" disabled={loading || flyerUploading}>
            {loading ? 'Submitting…' : 'Submit Event for Review'}
          </Button>
        </form>
      </div>
    </>
  )
}
