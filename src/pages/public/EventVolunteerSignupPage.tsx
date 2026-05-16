import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Calendar, MapPin, ArrowLeft, HeartHandshake } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { PageLoader } from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'
import { isEventPast } from '@/lib/eventDate'
import { formatDate, isValidEmail } from '@/lib/utils'
import { sanitizePhoneInput, validatePhoneNumber, PHONE_VALIDATION_USER_MESSAGE } from '@/lib/phoneValidation'
import { validateCommunityContent, validatePublicCommunityContent } from '@/lib/communityModeration'

function rpcErrorToMessage(err: { message?: string } | null): string {
  const raw = (err?.message ?? '').trim()
  if (/duplicate_signup/i.test(raw)) {
    return 'You already signed up to volunteer for this event.'
  }
  if (/volunteer_signup_closed/i.test(raw)) {
    return 'Volunteer signup has closed for this event.'
  }
  if (/volunteer_signup_not_enabled/i.test(raw)) {
    return 'Volunteer signup is not open for this event.'
  }
  if (/invalid_phone/i.test(raw)) {
    return PHONE_VALIDATION_USER_MESSAGE
  }
  if (/name_required/i.test(raw)) {
    return 'Please enter your full name (2–120 characters).'
  }
  if (/invalid_note/i.test(raw)) {
    return 'Please revise your role or availability note so it follows community guidelines.'
  }
  return raw || 'Something went wrong. Please try again.'
}

/**
 * Public volunteer signup (`/events/:slug/volunteer`).
 *
 * Volunteers do not need to be members. No login, membership registration, or approved
 * member status is required when the event is published, volunteer signup is enabled,
 * and signup is still open (if a close date is set). Organizer/admin tools handle PII;
 * volunteer phone numbers are not shown on the public event page.
 */
export function EventVolunteerSignupPage() {
  const { slug } = useParams<{ slug: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [volunteerCount, setVolunteerCount] = useState<number | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setEvent(null)
      setError(null)
      setDone(false)
      const { data, error: qErr } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (qErr) setError(qErr.message)
      const ev = data as Event | null
      setEvent(ev)
      if (ev?.slug && ev.volunteer_signup_enabled) {
        const { data: n } = await supabase.rpc('public_event_volunteer_signup_count', {
          p_event_slug: ev.slug,
        })
        setVolunteerCount(typeof n === 'number' ? n : 0)
      } else {
        setVolunteerCount(null)
      }
      setLoading(false)
    }
    void load()
  }, [slug])

  const nowClosed =
    !!event?.volunteer_signup_closes_at && new Date(event.volunteer_signup_closes_at) <= new Date()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!event?.id) return
    if (isEventPast(event.start_date)) return
    setError(null)
    const name = fullName.trim()
    if (name.length < 2) {
      setError('Please enter your full name.')
      return
    }
    const phoneRes = validatePhoneNumber(phone)
    if (!phoneRes.ok || !phoneRes.value) {
      setError(!phoneRes.ok ? phoneRes.reason : PHONE_VALIDATION_USER_MESSAGE)
      return
    }
    const em = email.trim()
    if (em && !isValidEmail(em)) {
      setError('Please enter a valid email address or leave it blank.')
      return
    }
    const r = role.trim()
    if (r) {
      const vr = validateCommunityContent(r)
      if (!vr.ok) {
        setError(vr.reason)
        return
      }
    }
    const n = note.trim()
    if (n) {
      const vn = validatePublicCommunityContent(n)
      if (!vn.ok) {
        setError(vn.reason)
        return
      }
    }
    if (!consent) {
      setError('Please confirm you agree that KIGH may contact you about volunteering.')
      return
    }

    setSubmitting(true)
    const { error: rpcErr } = await supabase.rpc('create_event_volunteer_signup', {
      p_event_id: event.id,
      p_full_name: name,
      p_phone: phoneRes.value,
      p_email: em || null,
      p_volunteer_role: r || null,
      p_availability_note: n || null,
    })
    setSubmitting(false)
    if (rpcErr) {
      setError(rpcErrorToMessage(rpcErr))
      return
    }
    setDone(true)
  }

  if (loading) return <PageLoader />

  if (!event) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <SEOHead title="Volunteer signup" noIndex />
        <h1 className="text-2xl font-bold mb-3">Event not found</h1>
        <p className="text-muted-foreground mb-6">This volunteer link may be invalid or the event is no longer published.</p>
        <Button asChild>
          <Link to="/events">Browse events</Link>
        </Button>
      </div>
    )
  }

  if (isEventPast(event.start_date)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <SEOHead title={`Volunteer — ${event.title}`} noIndex />
        <h1 className="text-2xl font-bold mb-3">Volunteer signup closed</h1>
        <p className="text-muted-foreground mb-6">
          This event has already taken place. Volunteer signup is not available for past events.
        </p>
        <Button asChild variant="outline">
          <Link to={`/events/${event.slug}`}>Back to event</Link>
        </Button>
      </div>
    )
  }

  if (!event.volunteer_signup_enabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <SEOHead title={`Volunteer — ${event.title}`} noIndex />
        <h1 className="text-2xl font-bold mb-3">Volunteer signup</h1>
        <p className="text-muted-foreground mb-6">Volunteer signup is not open for this event.</p>
        <Button asChild variant="outline">
          <Link to={`/events/${event.slug}`}>Back to event</Link>
        </Button>
      </div>
    )
  }

  if (nowClosed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <SEOHead title={`Volunteer — ${event.title}`} noIndex />
        <h1 className="text-2xl font-bold mb-3">Volunteer signup closed</h1>
        <p className="text-muted-foreground mb-6">Volunteer signup has closed for this event.</p>
        <Button asChild variant="outline">
          <Link to={`/events/${event.slug}`}>Back to event</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <SEOHead title={`Volunteer — ${event.title}`} description="Sign up to volunteer for this KIGH community event." noIndex />

      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1">
          <Link to={`/events/${event.slug}`}>
            <ArrowLeft className="h-4 w-4" /> Back to event
          </Link>
        </Button>

        <div className="rounded-2xl border border-border/80 bg-muted/15 p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground leading-tight">Volunteer for this event</h1>
              <p className="text-lg font-medium text-foreground mt-1">{event.title}</p>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {formatDate(event.start_date, 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {event.is_virtual ? 'Virtual / online' : event.location}
                </div>
              </div>
              {volunteerCount != null && volunteerCount > 0 ? (
                <p className="text-sm text-muted-foreground mt-3">Volunteers signed up: {volunteerCount}</p>
              ) : null}
            </div>
          </div>

          {event.volunteer_signup_instructions ? (
            <div className="rounded-lg border bg-background/80 p-4 text-sm text-muted-foreground whitespace-pre-wrap">
              {event.volunteer_signup_instructions}
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Your name and phone number are visible only to authorized KIGH organizers.
          </p>

          {done ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
              Thank you for signing up to volunteer. A KIGH organizer may contact you with next steps.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-field-stack">
                <Label htmlFor="vol-name">Full name *</Label>
                <Input id="vol-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
              </div>
              <div className="form-field-stack">
                <Label htmlFor="vol-phone">Phone *</Label>
                <Input
                  id="vol-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                  autoComplete="tel"
                  placeholder="e.g. +17135551234"
                  required
                />
                <p className="text-xs text-muted-foreground">International format: optional +, then digits only (7–15 digits).</p>
              </div>
              <div className="form-field-stack">
                <Label htmlFor="vol-email">Email</Label>
                <Input id="vol-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="form-field-stack">
                <Label htmlFor="vol-role">Volunteer role / area of interest</Label>
                <Input id="vol-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Optional" />
              </div>
              <div className="form-field-stack">
                <Label htmlFor="vol-note">Availability note</Label>
                <Textarea id="vol-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox id="vol-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <Label htmlFor="vol-consent" className="text-sm font-normal leading-snug cursor-pointer">
                  I agree that KIGH may contact me about volunteering for this event. *
                </Label>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit signup'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
