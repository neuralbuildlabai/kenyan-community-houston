import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck, Eye } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { trackSubmissionCreated } from '@/lib/analytics'
import { FUNDRAISER_CATEGORIES, FUNDRAISER_DISCLAIMER } from '@/lib/constants'
import { generateSlug } from '@/lib/utils'
import { toast } from 'sonner'

export function SubmitFundraiserPage() {
  const [form, setForm] = useState({
    title: '',
    category: '',
    summary: '',
    body: '',
    beneficiary_name: '',
    organizer_name: '',
    organizer_contact: '',
    goal_amount: '',
    donation_url: '',
    deadline: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.category || !form.beneficiary_name) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('fundraisers').insert([
      {
        title: form.title,
        slug: generateSlug(form.title),
        category: form.category,
        summary: form.summary || null,
        body: form.body || null,
        beneficiary_name: form.beneficiary_name,
        organizer_name: form.organizer_name || null,
        organizer_contact: form.organizer_contact || null,
        goal_amount: form.goal_amount ? parseFloat(form.goal_amount) : null,
        raised_amount: 0,
        donation_url: form.donation_url || null,
        deadline: form.deadline || null,
        status: 'pending',
        verification_status: 'unverified',
      },
    ])
    setLoading(false)
    if (error) toast.error('Submission failed. Please try again.')
    else {
      void trackSubmissionCreated('fundraiser')
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <>
        <SEOHead title="Fundraiser submitted" description="Your community support listing was submitted for review." />
        <PublicPageHero
          eyebrow="Submission received"
          title="Fundraiser Submitted!"
          subtitle="We'll review your submission. Verification may take additional time — we may reach out for documentation."
          primaryAction={
            <Button asChild>
              <Link to="/community-support">Back to Community Support</Link>
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
        title="Submit a Fundraiser"
        description="Submit a community fundraiser or support campaign for review."
      />

      <PublicPageHero
        eyebrow="Community support"
        title="Submit a Fundraiser"
        subtitle="Share a community support update or fundraising drive. All submissions go through moderation before publication."
        primaryAction={
          <Button asChild variant="ghost" size="sm" className="-ml-3 gap-1">
            <Link to="/community-support">
              <ArrowLeft className="h-4 w-4" /> Back to community support
            </Link>
          </Button>
        }
        tone="tint"
      />

      <section className="py-10 sm:py-14 lg:py-16">
        <div className="public-container grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-2">
            <Alert className="mb-8 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-900">
                {FUNDRAISER_DISCLAIMER}
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="form-page-card space-y-10">
              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Basics</legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="title">
                      Fundraiser Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
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
                        {FUNDRAISER_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="beneficiary_name">
                      Beneficiary Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="beneficiary_name"
                      value={form.beneficiary_name}
                      onChange={(e) =>
                        setForm({ ...form, beneficiary_name: e.target.value })
                      }
                      placeholder="Who is this for?"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">
                  Organizer (private)
                </legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="organizer_name">Organizer Name</Label>
                    <Input
                      id="organizer_name"
                      value={form.organizer_name}
                      onChange={(e) => setForm({ ...form, organizer_name: e.target.value })}
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="organizer_contact">Organizer Contact (private)</Label>
                    <Input
                      id="organizer_contact"
                      value={form.organizer_contact}
                      onChange={(e) =>
                        setForm({ ...form, organizer_contact: e.target.value })
                      }
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Goal &amp; timing</legend>
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className="form-field-stack">
                    <Label htmlFor="goal_amount">Goal Amount ($)</Label>
                    <Input
                      id="goal_amount"
                      type="number"
                      min="0"
                      step="1"
                      value={form.goal_amount}
                      onChange={(e) => setForm({ ...form, goal_amount: e.target.value })}
                      placeholder="5000"
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="deadline">Deadline (optional)</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2 form-field-stack">
                    <Label htmlFor="donation_url">Donation / GoFundMe Link</Label>
                    <Input
                      id="donation_url"
                      type="url"
                      value={form.donation_url}
                      onChange={(e) => setForm({ ...form, donation_url: e.target.value })}
                      placeholder="https://gofundme.com/…"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Story</legend>
                <div className="space-y-5">
                  <div className="form-field-stack">
                    <Label htmlFor="summary">Short Summary</Label>
                    <Input
                      id="summary"
                      value={form.summary}
                      onChange={(e) => setForm({ ...form, summary: e.target.value })}
                      placeholder="One sentence about this fundraiser"
                    />
                  </div>
                  <div className="form-field-stack">
                    <Label htmlFor="body">Full Details</Label>
                    <Textarea
                      id="body"
                      rows={6}
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="Provide full details about the situation and how funds will be used…"
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
                  KIGH may request supporting documents (e.g. medical letter) before publishing.
                </p>
              </div>
            </form>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                What we look for
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                Honesty &amp; clarity
              </h2>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Verifiable.</span> Beneficiary
                    name and a clear story about how funds will be used.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Eye className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Transparent.</span> If you have an
                    external donation link (GoFundMe, Givebutter), include it so neighbors can see
                    progress directly.
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
