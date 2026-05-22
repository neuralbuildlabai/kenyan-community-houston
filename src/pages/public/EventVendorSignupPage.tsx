import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Copy, MapPin, Store } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageLoader } from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import type { Event, VendorCategory } from '@/lib/types'
import { isEventPast } from '@/lib/eventDate'
import { formatDate, isValidEmail } from '@/lib/utils'
import {
  sanitizePhoneInput,
  validatePhoneNumber,
  PHONE_VALIDATION_USER_MESSAGE,
} from '@/lib/phoneValidation'
import {
  validateCommunityContent,
  validatePublicCommunityContent,
} from '@/lib/communityModeration'
import {
  VENDOR_PAYMENT_HANDLES,
  formatVendorFee,
  resolveVendorFeeCents,
  vendorCategoryLabel,
} from '@/lib/eventVendorSignup'

/**
 * Translates an RPC error message string into something a vendor
 * actually wants to read. The DB raises these error codes; see
 * migration 050 for the canonical list.
 */
function rpcErrorToMessage(err: { message?: string } | null): string {
  const raw = (err?.message ?? '').trim()
  if (/duplicate_signup/i.test(raw)) {
    return 'You already signed up as a vendor for this event with this phone or email.'
  }
  if (/vendor_signup_closed/i.test(raw)) {
    return 'Vendor signup has closed for this event.'
  }
  if (/vendor_signup_not_enabled/i.test(raw)) {
    return 'Vendor signup is not open for this event.'
  }
  if (/invalid_phone/i.test(raw)) {
    return PHONE_VALIDATION_USER_MESSAGE
  }
  if (/invalid_email/i.test(raw)) {
    return 'Please enter a valid email address.'
  }
  if (/business_name_required/i.test(raw)) {
    return 'Please enter your business name (2–200 characters).'
  }
  if (/contact_name_required/i.test(raw)) {
    return 'Please enter the contact name (2–120 characters).'
  }
  if (/invalid_category/i.test(raw)) {
    return 'Please select a vendor category.'
  }
  if (/invalid_description/i.test(raw)) {
    return 'Please revise your product/service description so it follows community guidelines.'
  }
  if (/invalid_business_name/i.test(raw)) {
    return 'Please revise your business name so it follows community guidelines.'
  }
  return raw || 'Something went wrong. Please try again.'
}

type VendorSignupSuccess = {
  signupId: string
  feeCents: number
  category: VendorCategory
}

/**
 * Public vendor signup (`/events/:slug/vendor`).
 *
 * Vendors do not need to be members. No login is required when the
 * event is published, vendor signup is enabled, and signup is still
 * open. Mirrors the volunteer signup flow at `/volunteer`, but adds
 * a fee tier (food vs. other) and a post-submit "send payment to
 * one of these handles" screen. Payment is collected out-of-band;
 * the admin marks it received in admin tooling (Phase 2).
 */
export function EventVendorSignupPage() {
  const { slug } = useParams<{ slug: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState<VendorCategory>('other')
  const [description, setDescription] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<VendorSignupSuccess | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fee is computed live from the selected category and the event's
  // configured fees, so users see the right number before submit.
  const liveFeeCents = useMemo(
    () => resolveVendorFeeCents(event ?? null, category),
    [event, category]
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      setEvent(null)
      setError(null)
      setSuccess(null)
      const { data, error: qErr } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (qErr) setError(qErr.message)
      setEvent((data as Event | null) ?? null)
      setLoading(false)
    }
    void load()
  }, [slug])

  const nowClosed =
    !!event?.vendor_signup_closes_at &&
    new Date(event.vendor_signup_closes_at) <= new Date()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!event?.id) return
    if (isEventPast(event.start_date)) return
    setError(null)

    const biz = businessName.trim()
    if (biz.length < 2 || biz.length > 200) {
      setError('Please enter your business name (2–200 characters).')
      return
    }
    const bizCheck = validateCommunityContent(biz)
    if (!bizCheck.ok) {
      setError(bizCheck.reason)
      return
    }

    const contact = contactName.trim()
    if (contact.length < 2 || contact.length > 120) {
      setError('Please enter the contact name (2–120 characters).')
      return
    }

    const em = email.trim()
    if (!em || !isValidEmail(em)) {
      setError('Please enter a valid email address.')
      return
    }

    const phoneRes = validatePhoneNumber(phone)
    if (!phoneRes.ok || !phoneRes.value) {
      setError(!phoneRes.ok ? phoneRes.reason : PHONE_VALIDATION_USER_MESSAGE)
      return
    }

    const desc = description.trim()
    if (desc) {
      const v = validatePublicCommunityContent(desc)
      if (!v.ok) {
        setError(v.reason)
        return
      }
    }

    setSubmitting(true)
    const { data, error: rpcErr } = await supabase.rpc('create_event_vendor_signup', {
      p_event_id: event.id,
      p_business_name: biz,
      p_contact_name: contact,
      p_email: em,
      p_phone: phoneRes.value,
      p_vendor_category: category,
      p_product_description: desc || null,
    })
    setSubmitting(false)

    if (rpcErr) {
      setError(rpcErrorToMessage(rpcErr))
      return
    }

    // The RPC returns a single-row table: [{ signup_id, fee_amount_cents, vendor_category }].
    // Supabase normalises this to an array; defend against an empty
    // response just in case the schema gets reshaped later.
    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      setError('Signup succeeded but we could not read the response. Please refresh.')
      return
    }
    setSuccess({
      signupId: row.signup_id as string,
      feeCents: (row.fee_amount_cents as number) ?? liveFeeCents,
      category: (row.vendor_category as VendorCategory) ?? category,
    })
  }

  function copyHandle(value: string) {
    try {
      void navigator.clipboard?.writeText(value)
    } catch {
      // Clipboard may be unavailable (older browsers, file:// in dev) —
      // the handle is also visible as text, so this is a soft failure.
    }
  }

  if (loading) return <PageLoader />

  if (!event) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <SEOHead title="Vendor signup" noIndex />
        <h1 className="mb-3 text-2xl font-bold">Event not found</h1>
        <p className="mb-6 text-muted-foreground">
          This vendor signup link may be invalid or the event is no longer published.
        </p>
        <Button asChild>
          <Link to="/events">Browse events</Link>
        </Button>
      </div>
    )
  }

  if (isEventPast(event.start_date)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <SEOHead title={`Vendor — ${event.title}`} noIndex />
        <h1 className="mb-3 text-2xl font-bold">Vendor signup closed</h1>
        <p className="mb-6 text-muted-foreground">
          This event has already taken place. Vendor signup is not available for past events.
        </p>
        <Button asChild variant="outline">
          <Link to={`/events/${event.slug}`}>Back to event</Link>
        </Button>
      </div>
    )
  }

  if (!event.vendor_signup_enabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <SEOHead title={`Vendor — ${event.title}`} noIndex />
        <h1 className="mb-3 text-2xl font-bold">Vendor signup</h1>
        <p className="mb-6 text-muted-foreground">Vendor signup is not open for this event.</p>
        <Button asChild variant="outline">
          <Link to={`/events/${event.slug}`}>Back to event</Link>
        </Button>
      </div>
    )
  }

  if (nowClosed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <SEOHead title={`Vendor — ${event.title}`} noIndex />
        <h1 className="mb-3 text-2xl font-bold">Vendor signup closed</h1>
        <p className="mb-6 text-muted-foreground">Vendor signup has closed for this event.</p>
        <Button asChild variant="outline">
          <Link to={`/events/${event.slug}`}>Back to event</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <SEOHead
        title={`Vendor signup — ${event.title}`}
        description="Sign up as a vendor for this KIGH community event."
        noIndex
      />

      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1">
          <Link to={`/events/${event.slug}`}>
            <ArrowLeft className="h-4 w-4" /> Back to event
          </Link>
        </Button>

        <div className="space-y-6 rounded-2xl border border-border/80 bg-muted/15 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight text-foreground">
                Sign up as a vendor
              </h1>
              <p className="mt-1 text-lg font-medium text-foreground">{event.title}</p>
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
            </div>
          </div>

          {event.vendor_signup_instructions ? (
            <div className="whitespace-pre-wrap rounded-lg border bg-background/80 p-4 text-sm text-muted-foreground">
              {event.vendor_signup_instructions}
            </div>
          ) : null}

          <div className="rounded-lg border border-kenyan-gold-200 bg-kenyan-gold-50/60 p-4 text-sm">
            <p className="font-semibold text-foreground">Vendor fees for this event</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                Food vendor:{' '}
                <span className="font-semibold text-foreground">
                  {formatVendorFee(resolveVendorFeeCents(event, 'food'))}
                </span>
              </li>
              <li>
                Other vendor (retail / services / nonprofit):{' '}
                <span className="font-semibold text-foreground">
                  {formatVendorFee(resolveVendorFeeCents(event, 'other'))}
                </span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Fees support event handling and logistics. Payment instructions appear after
              signup — you'll send the fee via CashApp, Venmo, or PayPal.
            </p>
          </div>

          {success ? (
            <VendorSuccessPanel
              eventSlug={event.slug}
              eventTitle={event.title}
              success={success}
              onCopy={copyHandle}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-field-stack">
                <Label htmlFor="vendor-business">Business name *</Label>
                <Input
                  id="vendor-business"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoComplete="organization"
                  required
                />
              </div>

              <div className="form-field-stack">
                <Label htmlFor="vendor-contact">Contact person *</Label>
                <Input
                  id="vendor-contact"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="form-field-stack">
                <Label htmlFor="vendor-email">Email *</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-field-stack">
                <Label htmlFor="vendor-phone">Phone *</Label>
                <Input
                  id="vendor-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                  autoComplete="tel"
                  placeholder="e.g. +17135551234"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  International format: optional +, then digits only (7–15 digits).
                </p>
              </div>

              <div className="form-field-stack">
                <Label htmlFor="vendor-category">Vendor category *</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as VendorCategory)}
                >
                  <SelectTrigger id="vendor-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">{vendorCategoryLabel('food')}</SelectItem>
                    <SelectItem value="other">{vendorCategoryLabel('other')}</SelectItem>
                  </SelectContent>
                </Select>
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="vendor-live-fee"
                >
                  Fee for this category:{' '}
                  <span className="font-semibold text-foreground">
                    {formatVendorFee(liveFeeCents)}
                  </span>
                </p>
              </div>

              <div className="form-field-stack">
                <Label htmlFor="vendor-description">Product / service description</Label>
                <Textarea
                  id="vendor-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will you be selling or offering? (optional)"
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
                data-testid="vendor-submit"
              >
                {submitting ? 'Submitting…' : 'Submit vendor signup'}
              </Button>

              <p className="text-xs text-muted-foreground">
                Your business name and product description may be shown publicly to other
                attendees. Your phone and email are visible only to KIGH organizers.
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

interface VendorSuccessPanelProps {
  eventSlug: string
  eventTitle: string
  success: VendorSignupSuccess
  onCopy: (value: string) => void
}

/**
 * The "you're in — now send the fee" screen. Renders the
 * computed fee (server-authoritative), payment handles, and a
 * gentle reminder. Vendor's signup is already saved at this
 * point; this panel is just instructions.
 */
function VendorSuccessPanel({
  eventSlug,
  eventTitle,
  success,
  onCopy,
}: VendorSuccessPanelProps) {
  const feeDisplay = formatVendorFee(success.feeCents)
  return (
    <div
      className="space-y-5 rounded-2xl border border-primary/30 bg-primary/5 p-5"
      data-testid="vendor-success"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Vendor signup received
        </p>
        <h2 className="mt-1 text-xl font-bold text-foreground">
          Thanks for signing up as a {vendorCategoryLabel(success.category).toLowerCase()}
          .
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your spot for <span className="font-semibold text-foreground">{eventTitle}</span>{' '}
          isn't fully confirmed until your fee arrives. Please send{' '}
          <span className="font-semibold text-foreground">{feeDisplay}</span> using one of
          the options below. A KIGH organizer will mark you as paid once funds are
          received.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">
          Send {feeDisplay} to one of these:
        </p>
        <ul className="space-y-2">
          {VENDOR_PAYMENT_HANDLES.map((h) => (
            <li
              key={h.network}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/80 p-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {h.label}
                </p>
                <p className="break-all text-sm font-semibold text-foreground">
                  {h.handle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => onCopy(h.handle)}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                {h.href ? (
                  <Button asChild size="sm" variant="secondary">
                    <a href={h.href} target="_blank" rel="noopener noreferrer">
                      Open
                    </a>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          When you send the fee, add a note with your business name so we can match the
          payment to your signup.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button asChild variant="outline">
          <Link to={`/events/${eventSlug}`}>Back to event</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/events">Browse more events</Link>
        </Button>
      </div>
    </div>
  )
}
