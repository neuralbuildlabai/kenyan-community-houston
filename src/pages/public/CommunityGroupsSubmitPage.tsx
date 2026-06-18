import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
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
import { BEST_CONTACT_METHOD_OPTIONS, type BestContactMethod } from '@/lib/communityGroupSubmission'
import { toast } from 'sonner'

const CATEGORY_NONE = '__none__'
const CONTACT_METHOD_NONE = '__none__'

type FormState = {
  organization_name: string
  category: typeof CATEGORY_NONE | CommunityGroupCategory
  description: string
  website_url: string
  social_url: string
  public_email: string
  public_phone: string
  public_contact_ok: boolean
  meeting_location: string
  service_area: string
  contact_person: string
  contact_person_name: string
  contact_person_role: string
  contact_person_email: string
  contact_person_phone: string
  best_contact_method: BestContactMethod | typeof CONTACT_METHOD_NONE
  submitter_name: string
  submitter_email: string
  notes: string
  authorized_submission: boolean
  community_social_interest: boolean
}

function emptyForm(): FormState {
  return {
    organization_name: '',
    category: CATEGORY_NONE,
    description: '',
    website_url: '',
    social_url: '',
    public_email: '',
    public_phone: '',
    public_contact_ok: false,
    meeting_location: '',
    service_area: '',
    contact_person: '',
    contact_person_name: '',
    contact_person_role: '',
    contact_person_email: '',
    contact_person_phone: '',
    best_contact_method: CONTACT_METHOD_NONE,
    submitter_name: '',
    submitter_email: '',
    notes: '',
    authorized_submission: false,
    community_social_interest: false,
  }
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="space-y-5 rounded-xl border border-border/40 bg-background/50 p-5 sm:p-6">
      <legend className="px-1 text-base font-semibold text-foreground">{title}</legend>
      {description ? <p className="-mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {children}
    </fieldset>
  )
}

export function CommunityGroupsSubmitPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.organization_name.trim() || form.category === CATEGORY_NONE || !form.description.trim()) {
      toast.error('Please complete organization name, category, and description.')
      return
    }
    if (!form.service_area.trim()) {
      toast.error('Please enter the area your organization serves.')
      return
    }
    if (
      !form.contact_person_name.trim() ||
      !form.contact_person_role.trim() ||
      !form.contact_person_email.trim() ||
      !form.contact_person_phone.trim() ||
      form.best_contact_method === CONTACT_METHOD_NONE
    ) {
      toast.error('Please complete all required contact person details.')
      return
    }
    if (!form.submitter_name.trim() || !form.submitter_email.trim()) {
      toast.error('Please add your name and email as the submitter.')
      return
    }
    if (!form.authorized_submission) {
      toast.error('Please confirm you are authorized to submit this organization\'s information.')
      return
    }

    const contactPhoneRes = validatePhoneNumber(form.contact_person_phone, { allowEmpty: false })
    if (!contactPhoneRes.ok) {
      toast.error(`Contact person phone: ${contactPhoneRes.reason}`)
      return
    }

    const normalizedWebsite =
      form.website_url.trim() === '' ? null : normalizeExternalUrl(form.website_url)
    const normalizedSocial =
      form.social_url.trim() === '' ? null : normalizeExternalUrl(form.social_url)
    if (form.website_url.trim() !== '' && normalizedWebsite === null) {
      toast.error('Please enter a valid website URL (e.g. https://example.org).')
      return
    }
    if (form.social_url.trim() !== '' && normalizedSocial === null) {
      toast.error('Please enter a valid social media URL.')
      return
    }

    const publicPhoneRes = validatePhoneNumber(form.public_phone, { allowEmpty: true })
    if (!publicPhoneRes.ok) {
      toast.error(publicPhoneRes.reason)
      return
    }

    const slug = `${generateSlug(form.organization_name)}-${Date.now().toString(36)}`

    setLoading(true)
    const { error } = await supabase.from('community_groups').insert([
      {
        organization_name: form.organization_name.trim(),
        slug,
        category: form.category as CommunityGroupCategory,
        description: form.description.trim(),
        website_url: normalizedWebsite,
        public_email: form.public_email.trim() || null,
        public_phone: publicPhoneRes.value,
        meeting_location: form.meeting_location.trim() || null,
        service_area: form.service_area.trim(),
        social_url: normalizedSocial,
        contact_person: form.contact_person.trim() || null,
        submitter_name: form.submitter_name.trim(),
        submitter_email: form.submitter_email.trim(),
        notes: form.notes.trim() || null,
        status: 'pending',
        submission_purpose: 'directory_listing',
        contact_person_name: form.contact_person_name.trim(),
        contact_person_role: form.contact_person_role.trim(),
        contact_person_email: form.contact_person_email.trim(),
        contact_person_phone: contactPhoneRes.value,
        best_contact_method: form.best_contact_method,
        authorized_submission: true,
        public_contact_ok: form.public_contact_ok,
        community_social_interest: form.community_social_interest,
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
      <div className="community-submit-page">
        <SEOHead
          title="Submission received"
          description="Your community organization was submitted for review."
        />
        <div className="public-container py-16 sm:py-24 text-center">
          <CheckCircle className="mx-auto h-14 w-14 text-primary/80" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Thank you</h1>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Your organization was submitted for review. KIGH volunteers will verify details before
            anything appears on the public directory.
          </p>
          <Button asChild className="mt-8">
            <Link to="/community-groups">Back to Community Directory</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="community-submit-page">
      <SEOHead
        title="Register a Community Group or Institution"
        description="Register Kenyan-led churches, associations, welfare groups, youth groups, cultural organizations, nonprofits, alumni groups, and community institutions across Greater Houston."
      />

      <header className="border-b border-border/20">
        <div className="public-container py-8 sm:py-10">
          <Button asChild variant="ghost" size="sm" className="mb-4 gap-1 -ml-3">
            <Link to="/community-groups">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to directory
            </Link>
          </Button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            Community Directory
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Register a Community Group or Institution
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Help us build a trusted directory of Kenyan-led churches, associations, welfare groups,
            youth groups, nonprofits, alumni groups, and community institutions across Greater
            Houston.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            KIGH membership is encouraged, but not required to register an organization.{' '}
            <Link to="/membership" className="font-medium text-primary underline underline-offset-2">
              Learn about membership
            </Link>
          </p>
        </div>
      </header>

      <section className="py-10 sm:py-14 lg:py-16">
        <div className="public-container grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-2">
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="community-submit-card space-y-8 rounded-2xl p-6 sm:p-8"
            >
              <FormSection title="Organization details">
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="organization_name">Organization name *</Label>
                    <Input
                      id="organization_name"
                      value={form.organization_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, organization_name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label>Category *</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, category: v as FormState['category'] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CATEGORY_NONE} disabled>
                          Select category
                        </SelectItem>
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
                      Who you serve, what you do, and how people can connect with your organization.
                    </p>
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Public contact"
                description="Only enter information you are comfortable showing publicly after approval."
              >
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="text"
                      inputMode="url"
                      placeholder="example.org"
                      value={form.website_url}
                      onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="social_url">Social media URL</Label>
                    <Input
                      id="social_url"
                      type="text"
                      inputMode="url"
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
                        setForm((f) => ({
                          ...f,
                          public_phone: sanitizePhoneInput(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={form.public_contact_ok}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, public_contact_ok: e.target.checked }))
                        }
                        className="mt-0.5 h-4 w-4 accent-primary"
                      />
                      <span>
                        This contact information may be shown publicly on the directory listing.
                      </span>
                    </label>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Location & service area">
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="meeting_location">Meeting location</Label>
                    <Input
                      id="meeting_location"
                      value={form.meeting_location}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, meeting_location: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="service_area">Service area *</Label>
                    <Input
                      id="service_area"
                      placeholder="Southwest Houston, Katy, Greater Houston…"
                      value={form.service_area}
                      onChange={(e) => setForm((f) => ({ ...f, service_area: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="contact_person">Contact person shown publicly</Label>
                    <Input
                      id="contact_person"
                      placeholder="Optional"
                      value={form.contact_person}
                      onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Contact person"
                description="For KIGH review and outreach. Not shown publicly unless also entered above."
              >
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="contact_person_name">Contact person name *</Label>
                    <Input
                      id="contact_person_name"
                      value={form.contact_person_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, contact_person_name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="contact_person_role">Contact person role/title *</Label>
                    <Input
                      id="contact_person_role"
                      value={form.contact_person_role}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, contact_person_role: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="contact_person_email">Contact person email *</Label>
                    <Input
                      id="contact_person_email"
                      type="email"
                      value={form.contact_person_email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, contact_person_email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="contact_person_phone">Contact person phone *</Label>
                    <Input
                      id="contact_person_phone"
                      type="tel"
                      value={form.contact_person_phone}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          contact_person_phone: sanitizePhoneInput(e.target.value),
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="best_contact_method">Best way to reach them *</Label>
                    <Select
                      value={form.best_contact_method}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          best_contact_method: v as FormState['best_contact_method'],
                        }))
                      }
                    >
                      <SelectTrigger id="best_contact_method">
                        <SelectValue placeholder="Select preferred method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CONTACT_METHOD_NONE} disabled>
                          Select preferred method
                        </SelectItem>
                        {BEST_CONTACT_METHOD_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="submitter_name">Submitter name *</Label>
                    <Input
                      id="submitter_name"
                      value={form.submitter_name}
                      onChange={(e) => setForm((f) => ({ ...f, submitter_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="submitter_email">Submitter email *</Label>
                    <Input
                      id="submitter_email"
                      type="email"
                      value={form.submitter_email}
                      onChange={(e) => setForm((f) => ({ ...f, submitter_email: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection title="Reviewer notes">
                <div className="form-field-stack">
                  <Label htmlFor="notes">Notes for reviewers</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional — include updates to an existing listing or other context."
                  />
                </div>
              </FormSection>

              <div className="rounded-xl border border-border/50 bg-muted/15 px-5 py-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.authorized_submission}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, authorized_submission: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 accent-primary"
                    required
                  />
                  <span>
                    I confirm that I am authorized to submit this organization&apos;s information,
                    or that these are appropriate public/community contact details for KIGH
                    follow-up and verification. *
                  </span>
                </label>
              </div>

              <div
                className="rounded-xl border border-primary/15 bg-primary/[0.04] px-5 py-4"
                data-testid="community-social-interest"
              >
                <p className="text-sm font-semibold text-foreground">
                  Interested in the Community Social?
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  If your organization would like to be considered for the upcoming community
                  social/session, let us know. Our team will follow up using the contact person
                  details provided above.
                </p>
                <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.community_social_interest}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, community_social_interest: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 accent-primary"
                    data-testid="community-social-interest-checkbox"
                  />
                  <span>Yes, our organization is interested in community social participation.</span>
                </label>
              </div>

              <div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full min-w-[14rem] sm:w-auto"
                  disabled={loading}
                >
                  {loading ? 'Submitting…' : 'Submit organization for review'}
                </Button>
              </div>
            </form>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="community-submit-sidebar-card rounded-2xl p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Before you submit
              </p>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                  <span>
                    Community groups, churches, associations, welfare groups, youth groups,
                    nonprofits, alumni groups, and institutions are welcome.
                  </span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                  <span>
                    Businesses should use the{' '}
                    <Link to="/businesses/submit" className="text-primary underline underline-offset-2">
                      Business Directory
                    </Link>
                    .
                  </span>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                  <span>Contact person details help us verify and follow up.</span>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                  <span>Listings are reviewed before publishing.</span>
                </li>
              </ul>
            </div>

            <div className="community-submit-sidebar-card rounded-2xl p-5 text-sm leading-relaxed text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">Need to update a listing?</p>
              <p>Use this form and note what should be changed in the reviewer notes.</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
