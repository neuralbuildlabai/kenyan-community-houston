import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, ArrowLeft } from 'lucide-react'
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

    setLoading(true)
    const { error } = await supabase.from('community_groups').insert([
      {
        organization_name: form.organization_name.trim(),
        slug,
        category: form.category as CommunityGroupCategory,
        description: form.description.trim() || null,
        website_url: form.website_url.trim() || null,
        public_email: form.public_email.trim() || null,
        public_phone: form.public_phone.trim() || null,
        meeting_location: form.meeting_location.trim() || null,
        service_area: form.service_area.trim() || null,
        social_url: form.social_url.trim() || null,
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
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <SEOHead title="Submission received" description="Your community group listing was submitted for review." />
        <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
        <p className="text-muted-foreground mb-6">
          Your organization was submitted for review. KIGH volunteers will verify details before it may appear on the public directory.
        </p>
        <Button asChild variant="outline">
          <Link to="/community-groups">Back to Community Groups</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <SEOHead
        title="Submit a Community Group"
        description="Submit a religious institution, benevolence group, welfare group, or community organization for the Greater Houston directory."
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1 -ml-1">
          <Link to="/community-groups">
            <ArrowLeft className="h-4 w-4" /> Community Groups
          </Link>
        </Button>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit a Group / Institution</h1>
          <p className="text-muted-foreground leading-relaxed">
            Non-commercial listings only. Submissions are reviewed before publication. Do not include private meeting links or sensitive personal data in the public fields.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="organization_name">Organization name *</Label>
              <Input
                id="organization_name"
                value={form.organization_name}
                onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))}
                required
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
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
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website_url">Website URL</Label>
              <Input id="website_url" type="url" placeholder="https://…" value={form.website_url} onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social_url">Social media URL</Label>
              <Input id="social_url" type="url" placeholder="https://…" value={form.social_url} onChange={(e) => setForm((f) => ({ ...f, social_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="public_email">Public email</Label>
              <Input id="public_email" type="email" value={form.public_email} onChange={(e) => setForm((f) => ({ ...f, public_email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="public_phone">Public phone</Label>
              <Input id="public_phone" type="tel" value={form.public_phone} onChange={(e) => setForm((f) => ({ ...f, public_phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting_location">Meeting location</Label>
              <Input id="meeting_location" value={form.meeting_location} onChange={(e) => setForm((f) => ({ ...f, meeting_location: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service_area">Service area</Label>
              <Input id="service_area" placeholder="e.g. Southwest Houston, Katy, Fort Bend" value={form.service_area} onChange={(e) => setForm((f) => ({ ...f, service_area: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="contact_person">Contact person (optional)</Label>
              <Input id="contact_person" value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="submitter_name">Your name *</Label>
              <Input id="submitter_name" value={form.submitter_name} onChange={(e) => setForm((f) => ({ ...f, submitter_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="submitter_email">Your email *</Label>
              <Input id="submitter_email" type="email" value={form.submitter_email} onChange={(e) => setForm((f) => ({ ...f, submitter_email: e.target.value }))} required />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes for reviewers (optional)</Label>
              <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Internal context only — not shown on the public directory." />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit for review'}
          </Button>
        </form>
      </div>
    </>
  )
}
