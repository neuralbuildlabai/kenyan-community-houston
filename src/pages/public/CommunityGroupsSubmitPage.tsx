import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, ArrowLeft, ShieldCheck, Eye, Sparkles } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { COMMUNITY_GROUP_CATEGORIES } from '@/lib/constants'
import type { CommunityGroupCategory } from '@/lib/types'
import { generateSlug } from '@/lib/utils'
import { normalizeExternalUrl } from '@/lib/externalUrl'
import { sanitizePhoneInput, validatePhoneNumber } from '@/lib/phoneValidation'
import { toast } from 'sonner'

const CATEGORY_NONE = '__none__'

export function CommunityGroupsSubmitPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    organization_name: '',
    category: CATEGORY_NONE,
    description: '',
    website_url: '',
    public_email: '',
    public_phone: '',
    meeting_location: '',
    service_area: '',
    social_url: '',
    contact_person: '',
    submitter_name: '',
    submitter_email: '',
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.organization_name.trim() || form.category === CATEGORY_NONE || !form.description.trim()) {
      toast.error('Please complete organization name, category, and description.')
      return
    }
    if (!form.submitter_name.trim() || !form.submitter_email.trim()) {
      toast.error('Please add your name and email so we can follow up if needed.')
      return
    }
    const slug = `${generateSlug(form.organization_name)}-${Date.now().toString(36)}`

    const normalizedWebsite =
      form.website_url.trim() === '' ? null : normalizeExternalUrl(form.website_url)
    const normalizedSocial =
      form.social_url.trim() === '' ? null : normalizeExternalUrl(form.social_url)
    if (form.website_url.trim() !== '' && normalizedWebsite === null) {
      toast.error('Please enter a valid website URL (e.g. https://example.org).')
      return
    }
    if (form.social_url.trim() !== '' && normalizedSocial === null) {
      toast.error('Please enter a valid social media URL (e.g. https://facebook.com/your-group).')
      return
    }

    const publicPhoneRes = validatePhoneNumber(form.public_phone, { allowEmpty: true })
    if (!publicPhoneRes.ok) {
      toast.error(publicPhoneRes.reason)
      return
    }

    setLoading(true)
    const { error } = await supabase.from('community_groups').insert([
      {
        organization_name: form.organization_name.trim(),
        slug,
        category: form.category as CommunityGroupCategory,
        description: form.description.trim() || null,
        website_url: normalizedWebsite,
        public_email: form.public_email.trim() || null,
        public_phone: publicPhoneRes.value,
        meeting_location: form.meeting_location.trim() || null,
        service_area: form.service_area.trim() || null,
        social_url: normalizedSocial,
        contact_person: form.contact_person.trim() || null,
        submitter_name: form.submitter_name.trim(),
        submitter_email: form.submitter_email.trim(),
        notes: form.notes.trim() || null,
        status: 'pending',
      },
    ])
    setLoading(false)
    if (error) {
      toast.error(error.message || 'Submission failed. Please try again.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <>
        <SEOHead title="Submission received" description="Your community group listing was submitted for review." />
        <PublicPageHero
          eyebrow="Submission received"
          title="Thank you"
          subtitle="Your organization was submitted for review. KIGH volunteers will verify details before it appears on the public directory."
          primaryAction={
            <Button asChild>
              <Link to="/community-groups">Back to Community Groups</Link>
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
        title="Submit a Community Group"
        description="Submit a religious institution, benevolence group, welfare group, or community organization for the Greater Houston directory."
      />

      <PublicPageHero
        eyebrow="Community directory"
        title="Submit a group / institution"
        subtitle="Add a church, association, nonprofit, welfare circle, youth or cultural group so members can find you. Public-safe contact information only — submissions are reviewed before publication, and commercial businesses belong in the Business directory."
        primaryAction={
          <Button asChild variant="ghost" size="sm" className="gap-1 -ml-3">
            <Link to="/community-groups">
              <ArrowLeft className="h-4 w-4" /> Back to directory
            </Link>
          </Button>
        }
        tone="sage"
      />

      <section className="py-10 sm:py-14 lg:py-16">
        <div className="public-container grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="form-page-card space-y-10">
              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">
                  Organization basics
                </legend>
                <p className="-mt-2 text-sm text-muted-foreground">
                  These appear on the public listing once verified.
                </p>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="organization_name">Organization name *</Label>
                    <Input
                      id="organization_name"
                      value={form.organization_name}
                      onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label>Category *</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CATEGORY_NONE}>Select category</SelectItem>
                        {COMMUNITY_GROUP_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      A few sentences about who you serve and what you do.
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Public contact</legend>
                <p className="-mt-2 text-sm text-muted-foreground">
                  Channels community members can use to reach you.
                </p>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="kighsacc.org or https://example.org"
                      value={form.website_url}
                      onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      We&apos;ll add <code>https://</code> automatically if you leave it off.
                    </p>
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="social_url">Social media URL</Label>
                    <Input
                      id="social_url"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="facebook.com/your-group"
                      value={form.social_url}
                      onChange={(e) => setForm((f) => ({ ...f, social_url: e.target.value }))}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="public_email">Public email</Label>
                    <Input
                      id="public_email"
                      type="email"
                      value={form.public_email}
                      onChange={(e) => setForm((f) => ({ ...f, public_email: e.target.value }))}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="public_phone">Public phone</Label>
                    <Input
                      id="public_phone"
                      type="tel"
                      value={form.public_phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, public_phone: sanitizePhoneInput(e.target.value) }))
                      }
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">
                  Where you meet &amp; who you serve
                </legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="meeting_location">Meeting location</Label>
                    <Input
                      id="meeting_location"
                      value={form.meeting_location}
                      onChange={(e) => setForm((f) => ({ ...f, meeting_location: e.target.value }))}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="service_area">Service area</Label>
                    <Input
                      id="service_area"
                      placeholder="e.g. Southwest Houston, Katy, Fort Bend"
                      value={form.service_area}
                      onChange={(e) => setForm((f) => ({ ...f, service_area: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="contact_person">Contact person (optional)</Label>
                    <Input
                      id="contact_person"
                      value={form.contact_person}
                      onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">
                  Submitter (not shown publicly)
                </legend>
                <p className="-mt-2 text-sm text-muted-foreground">
                  So we can follow up if reviewers have questions.
                </p>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="submitter_name">Your name *</Label>
                    <Input
                      id="submitter_name"
                      value={form.submitter_name}
                      onChange={(e) => setForm((f) => ({ ...f, submitter_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="submitter_email">Your email *</Label>
                    <Input
                      id="submitter_email"
                      type="email"
                      value={form.submitter_email}
                      onChange={(e) => setForm((f) => ({ ...f, submitter_email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="notes">Notes for reviewers (optional)</Label>
                    <Textarea
                      id="notes"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Internal context only — not shown on the public directory."
                    />
                  </div>
                </div>
              </fieldset>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="submit" size="lg" className="w-full sm:w-auto min-w-[14rem]" disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit for review'}
                </Button>
                <p className="text-xs text-muted-foreground sm:max-w-md">
                  By submitting you confirm the information is accurate and may be displayed publicly
                  after review.
                </p>
              </div>
            </form>
          </div>

          {/* Side: Before you submit */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Before you submit
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                A trusted directory takes care
              </h2>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Non-commercial listings only.</span>{' '}
                    Businesses belong in the Business Directory.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Eye className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">No private data.</span> Do not
                    include private meeting links, member rosters, or personal phone numbers in the
                    public fields.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Reviewed before publishing.</span>{' '}
                    KIGH volunteers verify details so the directory stays trustworthy.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 text-xs text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">Need to update an existing listing?</p>
              <p>
                Email us at the contact address in the footer with your organization name and the
                changes you&apos;d like to make.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
