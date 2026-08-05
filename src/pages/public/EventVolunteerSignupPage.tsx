import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Calendar, MapPin, ArrowLeft, HeartHandshake, ShieldCheck } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageLoader } from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'
import { isEventPast } from '@/lib/eventDate'
import { formatDate, isValidEmail } from '@/lib/utils'
import { sanitizePhoneInput, validatePhoneNumber, PHONE_VALIDATION_USER_MESSAGE } from '@/lib/phoneValidation'
import { validateCommunityContent, validatePublicCommunityContent } from '@/lib/communityModeration'
import { VOLUNTEER_ROLE_GROUPS, VOLUNTEER_ROLE_OTHER_VALUE } from '@/lib/eventVolunteerSignup'

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
  if (/membership_requires_email/i.test(raw)) {
    return 'Please add your email so KIGH can follow up about membership.'
  }
  if (/invalid_note/i.test(raw)) {
    return 'Please revise your role or note so it follows community guidelines.'
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
 *
 * The "role" field is a dropdown (VOLUNTEER_ROLE_GROUPS) rather than free text so
 * admins get clean, filterable role labels instead of typo'd variants. It covers
 * both guest presenters (teachers, counselors, advisors) and day-of event helpers,
 * so one link/form serves either kind of event. Picking "Other" reveals a short
 * write-in field.
 *
 * Membership interest (migration 071): a separate, fully optional opt-in. Checking
 * "Become a KIGH member" reveals dues + constitution copy and a distinct "I accept"
 * checkbox. A pending public.members row is only created when that Accept checkbox
 * is explicitly checked too — never from the interest checkbox alone. See
 * create_event_volunteer_signup (migration 071) for the server-side guard.
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
  const [customRole, setCustomRole] = useState('')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [wantsMembership, setWantsMembership] = useState(false)
  const [membershipTermsAccepted, setMembershipTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [membershipRequested, setMembershipRequested] = useState(false)
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
    if (isEventPast(event)) return
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
    const isOtherRole = role === VOLUNTEER_ROLE_OTHER_VALUE
    const r = (isOtherRole ? customRole : role).trim()
    if (isOtherRole && r.length < 2) {
      setError('Please describe your role, or choose one from the list.')
      return
    }
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
      setError('Please confirm KIGH may contact you about this event.')
      return
    }
    if (wantsMembership) {
      if (!em) {
        setError('Please add your email so KIGH can follow up about membership.')
        return
      }
      if (!membershipTermsAccepted) {
        setError('Please check "I accept" under membership, or uncheck the membership box to skip it.')
        return
      }
    }

    setSubmitting(true)
    const { error: rpcErr } = await supabase.rpc('create_event_volunteer_signup', {
      p_event_id: event.id,
      p_full_name: name,
      p_phone: phoneRes.value,
      p_email: em || null,
      p_volunteer_role: r || null,
      p_availability_note: n || null,
      p_wants_membership: wantsMembership,
      p_membership_terms_accepted: wantsMembership && membershipTermsAccepted,
    })
    setSubmitting(false)
    if (rpcErr) {
      setError(rpcErrorToMessage(rpcErr))
      return
    }
    setMembershipRequested(wantsMembership && membershipTermsAccepted)
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

  if (isEventPast(event)) {
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

        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 sm:p-8 space-y-6 shadow-[0_1px_2px_rgb(23_25_20/0.04),0_20px_44px_-28px_rgb(23_25_20/0.25)]">
          {/* Kenya flag accent */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{
              background:
                'linear-gradient(90deg,#0a0a0a 0%,#0a0a0a 32%,#be123c 32%,#be123c 50%,#fff 50%,#fff 52%,#15803d 52%,#15803d 100%)',
            }}
          />

          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80 mb-1">
                Kenyans in Greater Houston
              </p>
              <h1 className="text-2xl font-bold text-foreground leading-tight tracking-tight">Volunteer for this event</h1>
              <p className="text-lg font-medium text-foreground mt-1">{event.title}</p>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
                  {formatDate(event.start_date, 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                  {event.is_virtual ? 'Virtual / online' : event.location}
                </div>
              </div>
              {volunteerCount != null && volunteerCount > 0 ? (
                <p className="text-sm text-muted-foreground mt-3">Volunteers signed up: {volunteerCount}</p>
              ) : null}
            </div>
          </div>

          {event.volunteer_signup_instructions ? (
            <div className="rounded-xl border border-kenyan-gold-200/80 bg-kenyan-gold-50/60 p-4 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {event.volunteer_signup_instructions}
            </div>
          ) : null}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
            Your contact details are visible only to KIGH organizers.
          </p>

          {done ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm text-foreground space-y-2">
              <p className="font-semibold text-base">Thank you — you're signed up.</p>
              <p className="text-muted-foreground">A KIGH organizer will reach out with next steps.</p>
              {membershipRequested ? (
                <p className="text-muted-foreground">
                  Your membership application has been started. Dues ($20/year) can be sent anytime via{' '}
                  <Link to="/support" className="font-medium text-primary underline underline-offset-2">
                    Support KIGH
                  </Link>
                  ; a representative will follow up to complete your file.
                </p>
              ) : null}
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
                  placeholder="+17135551234"
                  required
                />
              </div>
              <div className="form-field-stack">
                <Label htmlFor="vol-email">Email</Label>
                <Input id="vol-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="form-field-stack">
                <Label htmlFor="vol-role">Your role</Label>
                <Select
                  value={role || undefined}
                  onValueChange={(v) => {
                    setRole(v)
                    if (v !== VOLUNTEER_ROLE_OTHER_VALUE) setCustomRole('')
                  }}
                >
                  <SelectTrigger id="vol-role">
                    <SelectValue placeholder="Select a role (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOLUNTEER_ROLE_GROUPS.map((group) => (
                      <SelectGroup key={group.heading}>
                        <SelectLabel>{group.heading}</SelectLabel>
                        {group.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    <SelectGroup>
                      <SelectItem value={VOLUNTEER_ROLE_OTHER_VALUE}>Other — write in</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {role === VOLUNTEER_ROLE_OTHER_VALUE ? (
                  <Input
                    className="mt-2"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Your role or topic"
                    maxLength={120}
                    autoFocus
                  />
                ) : null}
              </div>
              <div className="form-field-stack">
                <Label htmlFor="vol-note">Notes</Label>
                <Textarea
                  id="vol-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Session topic, availability… (optional)"
                />
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-3.5 transition-colors has-[:checked]:border-primary/30 has-[:checked]:bg-primary/[0.04]">
                <Checkbox id="vol-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <Label htmlFor="vol-consent" className="text-sm font-normal leading-snug cursor-pointer">
                  KIGH may contact me about this event. *
                </Label>
              </div>

              <div className="rounded-xl border p-3.5 space-y-3 transition-colors has-[:checked]:border-primary/30 has-[:checked]:bg-primary/[0.04]">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="vol-member-interest"
                    checked={wantsMembership}
                    onCheckedChange={(v) => {
                      const checked = v === true
                      setWantsMembership(checked)
                      if (!checked) setMembershipTermsAccepted(false)
                    }}
                    className="mt-0.5"
                  />
                  <div>
                    <Label htmlFor="vol-member-interest" className="text-sm font-medium leading-snug cursor-pointer">
                      Become a KIGH member
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Optional · $20/year dues</p>
                  </div>
                </div>

                {wantsMembership ? (
                  <div className="ml-7 space-y-3 rounded-lg border border-primary/20 bg-background/60 p-3.5">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Dues are payable via{' '}
                      <Link to="/support" className="font-medium text-primary underline underline-offset-2">
                        Support KIGH
                      </Link>
                      . A representative will follow up to complete your application.
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="vol-member-accept"
                        checked={membershipTermsAccepted}
                        onCheckedChange={(v) => setMembershipTermsAccepted(v === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="vol-member-accept" className="text-sm font-normal leading-snug cursor-pointer">
                        I accept the{' '}
                        <Link to="/governance" className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                          Constitution &amp; Bylaws
                        </Link>{' '}
                        and consent to be contacted about membership. *
                      </Label>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Requires an email above.</p>
                  </div>
                ) : null}
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full font-semibold shadow-md" size="lg" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit signup'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
