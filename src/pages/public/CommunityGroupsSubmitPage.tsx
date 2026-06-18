import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
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
import {
  BEST_CONTACT_METHOD_OPTIONS,
  JULY_INTRO_OPTIONS,
  JULY_INTEREST_OPTIONS,
  SUBMISSION_PURPOSE_OPTIONS,
  submissionPurposeIncludesJuly,
  type BestContactMethod,
  type CommunityGroupSubmissionPurpose,
  type JulyInterest,
  type JulyIntroInterest,
} from '@/lib/communityGroupSubmission'
import { toast } from 'sonner'

const CATEGORY_NONE = '__none__'
const PURPOSE_NONE = '__none__'
const CONTACT_METHOD_NONE = '__none__'
const JULY_INTEREST_NONE = '__none__'
const JULY_INTRO_NONE = '__none__'

type FormState = {
  submission_purpose: CommunityGroupSubmissionPurpose | typeof PURPOSE_NONE
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
  july_interest: JulyInterest | typeof JULY_INTEREST_NONE
  july_representative_name: string
  july_representative_contact: string
  july_estimated_attendees: string
  july_intro_interest: JulyIntroInterest | typeof JULY_INTRO_NONE
  july_topics: string
  july_notes: string
}

function emptyForm(): FormState {
  return {
    submission_purpose: PURPOSE_NONE,
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
    july_interest: JULY_INTEREST_NONE,
    july_representative_name: '',
    july_representative_contact: '',
    july_estimated_attendees: '',
    july_intro_interest: JULY_INTRO_NONE,
    july_topics: '',
    july_notes: '',
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

  const includesJuly =
    form.submission_purpose !== PURPOSE_NONE &&
    submissionPurposeIncludesJuly(form.submission_purpose)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.submission_purpose === PURPOSE_NONE) {
      toast.error('Please choose how your organization would like to be included.')
      return
    }
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

    if (includesJuly) {
      if (form.july_interest === JULY_INTEREST_NONE) {
        toast.error('Please indicate your interest in the July community social.')
        return
      }
      if (!form.july_representative_name.trim() || !form.july_representative_contact.trim()) {
        toast.error('Please provide a July representative name and contact.')
        return
      }
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
    const julyAttendees = form.july_estimated_attendees.trim()
      ? parseInt(form.july_estimated_attendees, 10)
      : null

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
        submission_purpose: form.submission_purpose,
        contact_person_name: form.contact_person_name.trim(),
        contact_person_role: form.contact_person_role.trim(),
        contact_person_email: form.contact_person_email.trim(),
        contact_person_phone: contactPhoneRes.value,
        best_contact_method: form.best_contact_method,
        authorized_submission: true,
        public_contact_ok: form.public_contact_ok,
        july_interest: includesJuly ? form.july_interest : null,
        july_representative_name: includesJuly ? form.july_representative_name.trim() : null,
        july_representative_contact: includesJuly ? form.july_representative_contact.trim() : null,
        july_estimated_attendees:
          includesJuly && julyAttendees !== null && !Number.isNaN(julyAttendees)
            ? julyAttendees
            : null,
        july_intro_interest:
          includesJuly && form.july_intro_interest !== JULY_INTRO_NONE
            ? form.july_intro_interest
            : null,
        july_topics: includesJuly ? form.july_topics.trim() || null : null,
        july_notes: includesJuly ? form.july_notes.trim() || null : null,
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

      {/* Header */}
      <header className="border-b border-border/30 bg-white/70 backdrop-blur-sm">
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
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Help us build a trusted directory of Kenyan-led churches, associations, welfare groups,
            youth groups, cultural organizations, nonprofits, alumni groups, and community
            institutions across Greater Houston. You do not have to be a KIGH member to register an
            organization, though membership is highly encouraged as it helps strengthen and support
            the wider community.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Once your organization is registered or updated, you may also indicate whether your group
            would like to participate in the July community social session.
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
              {/* July notice */}
              <div
                className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-5 py-4"
                role="note"
              >
                <p className="text-sm font-semibold text-amber-950">July Community Social</p>
                <p className="mt-1.5 text-sm leading-relaxed text-amber-900/85">
                  We are inviting registered community organizations to connect, share updates, and
                  strengthen collaboration. Please register or update your organization details
                  first, then let us know if your group would like to participate in the July
                  community social session.
                </p>
              </div>

              {/* Membership note */}
              <p className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                KIGH membership is not required to register an organization. However, we highly
                encourage members and organization leaders to{' '}
                <Link to="/membership" className="font-medium text-primary underline underline-offset-2">
                  join and support KIGH
                </Link>{' '}
                so we can continue building strong community programs, events, and services.
              </p>

              {/* Organization participation */}
              <FormSection
                title="Organization participation"
                description="Choose how your organization would like to be included."
              >
                <div className="form-field-stack">
                  <Label htmlFor="submission_purpose">Organization participation *</Label>
                  <Select
                    value={form.submission_purpose}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        submission_purpose: v as CommunityGroupSubmissionPurpose,
                      }))
                    }
                  >
                    <SelectTrigger id="submission_purpose">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PURPOSE_NONE} disabled>
                        Select an option
                      </SelectItem>
                      {SUBMISSION_PURPOSE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FormSection>

              {/* Organization basics */}
              <FormSection
                title="Organization basics"
                description="These details form your organization's directory record."
              >
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
                      Tell the community who you serve, what you do, and how people can connect with
                      your organization.
                    </p>
                  </div>
                </div>
              </FormSection>

              {/* Public contact */}
              <FormSection
                title="Public contact"
                description="Only enter contact information you are comfortable having shown publicly after the listing is approved."
              >
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="text"
                      inputMode="url"
                      placeholder="example.org or https://example.org"
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

              {/* Where you meet */}
              <FormSection title="Where you meet and who you serve">
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
                      placeholder="Southwest Houston, Katy, Sugar Land…"
                      value={form.service_area}
                      onChange={(e) => setForm((f) => ({ ...f, service_area: e.target.value }))}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Examples: Southwest Houston, Katy, Sugar Land, Cypress, Pearland, Fort Bend,
                      Greater Houston, or online.
                    </p>
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="contact_person">Contact person shown publicly</Label>
                    <Input
                      id="contact_person"
                      placeholder="Optional — only if this person should appear on the listing"
                      value={form.contact_person}
                      onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Internal contact */}
              <FormSection
                title="Internal contact / outreach contact"
                description="Internal contact details are used for review and outreach. They are not shown publicly unless also entered in the public contact fields."
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
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="notes">Notes for reviewers</Label>
                    <Textarea
                      id="notes"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Optional context for reviewers — not shown publicly."
                    />
                  </div>
                </div>
              </FormSection>

              {/* July participation — conditional */}
              {includesJuly ? (
                <FormSection
                  title="July Community Social Participation"
                  description="Let us know how your organization would like to be represented at the July community social session."
                >
                  <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                    <div className="sm:col-span-2 form-field-stack">
                      <Label htmlFor="july_interest">
                        Is your organization interested in attending the July community social? *
                      </Label>
                      <Select
                        value={form.july_interest}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            july_interest: v as FormState['july_interest'],
                          }))
                        }
                      >
                        <SelectTrigger id="july_interest">
                          <SelectValue placeholder="Select one" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={JULY_INTEREST_NONE} disabled>
                            Select one
                          </SelectItem>
                          {JULY_INTEREST_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="form-field-stack">
                      <Label htmlFor="july_representative_name">Representative name *</Label>
                      <Input
                        id="july_representative_name"
                        value={form.july_representative_name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, july_representative_name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-field-stack">
                      <Label htmlFor="july_representative_contact">
                        Representative phone/email *
                      </Label>
                      <Input
                        id="july_representative_contact"
                        value={form.july_representative_contact}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            july_representative_contact: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="form-field-stack">
                      <Label htmlFor="july_estimated_attendees">Estimated number of attendees</Label>
                      <Input
                        id="july_estimated_attendees"
                        type="number"
                        min={1}
                        value={form.july_estimated_attendees}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, july_estimated_attendees: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-field-stack">
                      <Label htmlFor="july_intro_interest">
                        Would your organization like to briefly introduce itself?
                      </Label>
                      <Select
                        value={form.july_intro_interest}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            july_intro_interest: v as FormState['july_intro_interest'],
                          }))
                        }
                      >
                        <SelectTrigger id="july_intro_interest">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={JULY_INTRO_NONE}>Not specified</SelectItem>
                          {JULY_INTRO_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 form-field-stack">
                      <Label htmlFor="july_topics">Any topics you would like discussed?</Label>
                      <Textarea
                        id="july_topics"
                        rows={2}
                        value={form.july_topics}
                        onChange={(e) => setForm((f) => ({ ...f, july_topics: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2 form-field-stack">
                      <Label htmlFor="july_notes">Notes for July planning team</Label>
                      <Textarea
                        id="july_notes"
                        rows={2}
                        value={form.july_notes}
                        onChange={(e) => setForm((f) => ({ ...f, july_notes: e.target.value }))}
                      />
                    </div>
                  </div>
                </FormSection>
              ) : null}

              {/* Authorization */}
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

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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

          {/* Guidance sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="community-submit-card rounded-2xl p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Before you submit
              </p>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
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
                    <span className="font-medium text-foreground">Commercial businesses</span>{' '}
                    should use the{' '}
                    <Link to="/businesses/submit" className="text-primary underline underline-offset-2">
                      Business Directory
                    </Link>
                    .
                  </span>
                </li>
                <li className="flex gap-3">
                  <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                  <span>
                    You do not have to be a KIGH member to register, though membership is highly
                    encouraged.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                  <span>Directory listings are reviewed before publishing.</span>
                </li>
                <li className="flex gap-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden />
                  <span>
                    Organizations interested in the July community social should register or update
                    their organization first, then select the July participation option.
                  </span>
                </li>
              </ul>
            </div>

            <div className="community-submit-card rounded-2xl p-5 text-sm leading-relaxed text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">Need to update an existing listing?</p>
              <p>
                Choose &ldquo;Update an existing organization listing&rdquo; in the form and provide
                the correct organization details. Our reviewers will verify the update before
                publishing changes.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
