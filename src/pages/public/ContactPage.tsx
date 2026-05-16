import { useState } from 'react'
import { Mail, MapPin, CheckCircle, Clock, ShieldCheck } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import {
  PUBLIC_CONTACT_EMAIL,
  KIGH_NONPROFIT_CREDIBILITY_STATEMENT,
} from '@/lib/constants'
import { sanitizePhoneInput, validatePhoneNumber } from '@/lib/phoneValidation'
import { toast } from 'sonner'

const INQUIRY_TYPES = [
  'General Inquiry',
  'Event Submission',
  'Business Listing',
  'Fundraiser',
  'Report Content',
  'Partnership',
  'Membership / Join',
  'Other',
]

const INQUIRY_TYPE_TO_DB_TYPE: Record<string, string> = {
  'General Inquiry': 'general',
  'Event Submission': 'event_submission',
  'Business Listing': 'business_inquiry',
  'Fundraiser': 'fundraiser',
  'Report Content': 'other',
  'Partnership': 'other',
  'Membership / Join': 'other',
  'Other': 'other',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    inquiry_type: '',
    message: '',
    company_website: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields')
      return
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }
    if (form.message.trim().length < 5) {
      toast.error('Please write a short message before submitting')
      return
    }
    if (form.company_website.trim() !== '') {
      setSubmitted(true)
      return
    }

    const phoneRes = validatePhoneNumber(form.phone, { allowEmpty: true })
    if (!phoneRes.ok) {
      toast.error(phoneRes.reason)
      return
    }

    setLoading(true)
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: phoneRes.value,
      subject: form.subject.trim() || form.inquiry_type || 'Contact form',
      message: form.message.trim(),
      inquiry_type: form.inquiry_type || null,
      type: INQUIRY_TYPE_TO_DB_TYPE[form.inquiry_type] ?? 'general',
      status: 'new',
      honeypot: form.company_website,
    }

    const { error } = await supabase.from('contact_submissions').insert([payload])
    setLoading(false)
    if (error) {
      toast.error('Failed to send message. Please try again.')
    } else {
      setSubmitted(true)
    }
  }

  return (
    <>
      <SEOHead
        title="Contact / Join"
        description="Reach out to the Kenyan Community Houston team for inquiries, event submissions, or to get involved."
      />

      <PublicPageHero
        eyebrow="We&apos;d love to hear from you"
        title="Contact us"
        subtitle="Share a question, suggestion, or partnership idea — KIGH volunteers respond to community inquiries personally."
        tone="tint"
      />

      <section className="py-10 sm:py-14 lg:py-16">
        <div className="public-container grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
          {/* Info / contact options */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Reach the team
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                Contact options
              </h2>
              <ul className="mt-5 space-y-5">
                <li className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Email</div>
                    <a
                      href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {PUBLIC_CONTACT_EMAIL}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Service area</div>
                    <div className="text-sm text-muted-foreground">
                      Greater Houston, Texas
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Response time</div>
                    <div className="text-sm text-muted-foreground">
                      Most inquiries answered within 2–3 business days.
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 text-xs text-muted-foreground leading-relaxed">
              <p className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                <span>{KIGH_NONPROFIT_CREDIBILITY_STATEMENT}</span>
              </p>
            </div>
          </aside>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="form-page-card flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle className="mb-4 h-14 w-14 text-primary/80" />
                <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
                  Message Sent!
                </h2>
                <p className="max-w-md text-muted-foreground">
                  Thank you for reaching out. A KIGH volunteer will review your message and respond
                  within a few business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form-page-card space-y-8">
                <fieldset className="space-y-5">
                  <legend className="text-base font-semibold text-foreground">Your details</legend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="form-field-stack">
                      <Label htmlFor="name">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Jane Mwangi"
                      />
                    </div>
                    <div className="form-field-stack">
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="jane@example.com"
                      />
                    </div>
                    <div className="form-field-stack">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })
                        }
                        placeholder="+1 (713) 000-0000"
                      />
                    </div>
                    <div className="form-field-stack">
                      <Label>Inquiry Type</Label>
                      <Select onValueChange={(v) => setForm({ ...form, inquiry_type: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {INQUIRY_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-5">
                  <legend className="text-base font-semibold text-foreground">Your message</legend>
                  <div className="form-field-stack">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Brief subject"
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="message">
                      Message <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us how we can help…"
                    />
                  </div>
                </fieldset>

                {/* Honeypot — hidden from humans but present in DOM. */}
                <div aria-hidden="true" className="hidden">
                  <Label htmlFor="company_website">Company website</Label>
                  <Input
                    id="company_website"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.company_website}
                    onChange={(e) => setForm({ ...form, company_website: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button type="submit" size="lg" className="w-full sm:w-auto px-8" disabled={loading}>
                    {loading ? 'Sending…' : 'Send Message'}
                  </Button>
                  <p className="text-xs text-muted-foreground sm:max-w-sm">
                    By submitting, you agree to be contacted at the email or phone number provided.
                    We never share contact details with third parties.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
