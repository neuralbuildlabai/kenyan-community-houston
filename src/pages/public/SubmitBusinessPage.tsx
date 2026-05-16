import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { trackSubmissionCreated } from '@/lib/analytics'
import { BUSINESS_CATEGORIES } from '@/lib/constants'
import { generateSlug } from '@/lib/utils'
import { sanitizePhoneInput, validatePhoneNumber } from '@/lib/phoneValidation'
import { toast } from 'sonner'

export function SubmitBusinessPage() {
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    services: '',
    address: '',
    city: 'Houston',
    state: 'TX',
    zip: '',
    phone: '',
    email: '',
    website: '',
    owner_name: '',
    owner_contact: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.category || !form.description) {
      toast.error('Please fill in all required fields')
      return
    }
    const phoneRes = validatePhoneNumber(form.phone, { allowEmpty: true })
    if (!phoneRes.ok) {
      toast.error(phoneRes.reason)
      return
    }
    setLoading(true)
    const { error } = await supabase.from('businesses').insert([
      {
        ...form,
        phone: phoneRes.value ?? '',
        slug: generateSlug(form.name),
        status: 'pending',
        tier: 'basic',
      },
    ])
    setLoading(false)
    if (error) toast.error('Submission failed. Please try again.')
    else {
      void trackSubmissionCreated('business')
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <>
        <SEOHead title="Business submitted" description="Your business listing was submitted for review." />
        <PublicPageHero
          eyebrow="Submission received"
          title="Business Submitted!"
          subtitle="We'll review your listing and publish it within 1–3 business days. We'll reach out if we need clarification."
          primaryAction={
            <Button asChild>
              <Link to="/businesses">Back to directory</Link>
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
        title="List Your Business"
        description="Submit your Kenyan-owned or community-friendly business for the Houston directory."
      />

      <PublicPageHero
        eyebrow="Local guide"
        title="List Your Business"
        subtitle="Help neighbors across Greater Houston find Kenyan-owned and community-friendly businesses they can trust. Free basic listings — reviewed before publication so the directory stays accurate and respectful."
        primaryAction={
          <Button asChild variant="ghost" size="sm" className="-ml-3 gap-1">
            <Link to="/businesses">
              <ArrowLeft className="h-4 w-4" /> Back to directory
            </Link>
          </Button>
        }
        tone="forest"
      />

      <section className="py-10 sm:py-14 lg:py-16">
        <div className="public-container grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="form-page-card space-y-10">
              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Business basics</legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="name">
                      Business Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label>
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="description">
                      Business Description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="services">Services Offered</Label>
                    <Textarea
                      id="services"
                      rows={3}
                      value={form.services}
                      onChange={(e) => setForm({ ...form, services: e.target.value })}
                      placeholder="List your services…"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Public contact</legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })
                      }
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="email">Business Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="https://…"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Location</legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={form.zip}
                      onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">
                  Owner (not shown publicly)
                </legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="owner_name">Owner / Contact Name</Label>
                    <Input
                      id="owner_name"
                      value={form.owner_name}
                      onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="owner_contact">Owner Contact (private)</Label>
                    <Input
                      id="owner_contact"
                      value={form.owner_contact}
                      onChange={(e) => setForm({ ...form, owner_contact: e.target.value })}
                    />
                  </div>
                </div>
              </fieldset>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full min-w-[12rem] sm:w-auto"
                  disabled={loading}
                >
                  {loading ? 'Submitting…' : 'Submit for Review'}
                </Button>
                <p className="text-xs text-muted-foreground sm:max-w-md">
                  Basic listings are free. Verified and featured listings require an in-person
                  check.
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
                A premium local guide
              </h2>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Real businesses only.</span>{' '}
                    Active phone, email, or website so neighbors can actually reach you.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Tell your story.</span> A few
                    clear sentences and a list of services helps customers choose you with
                    confidence.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 text-xs text-muted-foreground leading-relaxed">
              <p>
                Need to update an existing listing? Contact KIGH via the{' '}
                <Link to="/contact" className="link-editorial">
                  Contact page
                </Link>{' '}
                with your business name and the changes you&apos;d like.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
