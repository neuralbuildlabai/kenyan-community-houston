import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, HeartHandshake } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { SERVICE_AVAILABILITY_OPTIONS } from '@/lib/serveOpportunities'
import type { ServiceInterestAvailability } from '@/lib/types'
import { toast } from 'sonner'

export function ServeApplyPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    area_of_interest: '',
    how_to_help: '',
    availability: 'occasional' as ServiceInterestAvailability,
    skills_experience: '',
    open_to_leadership_contact: '' as '' | 'yes' | 'no',
    notes: '',
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error('Please enter your full name and email.')
      return
    }
    if (!form.open_to_leadership_contact) {
      toast.error('Please let us know if you are open to leadership or committee contact.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('service_interests').insert({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      area_of_interest: form.area_of_interest.trim() || null,
      how_to_help: form.how_to_help.trim() || null,
      availability: form.availability,
      skills_experience: form.skills_experience.trim() || null,
      open_to_leadership_contact: form.open_to_leadership_contact === 'yes',
      notes: form.notes.trim() || null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Could not submit. Please try again or contact KIGH.')
      return
    }
    toast.success('Thank you! Your interest has been received.')
    navigate('/serve', { replace: true })
  }

  return (
    <>
      <SEOHead
        title="I Want to Serve — Volunteer interest"
        description="Share where you feel called to help. A KIGH representative may follow up about volunteer, committee, or leadership opportunities."
      />

      <div className="border-b bg-gradient-to-br from-primary/[0.06] via-background to-muted/40">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-6 text-muted-foreground">
            <Link to="/serve">
              <ArrowLeft className="h-4 w-4" />
              Back to Call to Serve
            </Link>
          </Button>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">I want to serve</h1>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Tell us where you feel called to help. A KIGH representative may follow up about volunteer, committee, or leadership opportunities.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <form onSubmit={onSubmit} className="space-y-6">
          <Card className="shadow-sm border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Your details</CardTitle>
              <CardDescription>All fields marked * are required.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name *</Label>
                <Input
                  id="full_name"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area">Area of interest</Label>
                <Input
                  id="area"
                  placeholder="e.g. Events committee, youth programs, welfare support…"
                  value={form.area_of_interest}
                  onChange={(e) => setForm((f) => ({ ...f, area_of_interest: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="how">How would you like to help?</Label>
                <Textarea
                  id="how"
                  rows={4}
                  placeholder="Tell us what draws you in — skills, ideas, or ways you have served before."
                  value={form.how_to_help}
                  onChange={(e) => setForm((f) => ({ ...f, how_to_help: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Availability *</Label>
                <Select
                  value={form.availability}
                  onValueChange={(v) => setForm((f) => ({ ...f, availability: v as ServiceInterestAvailability }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_AVAILABILITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="skills">Relevant skills or experience</Label>
                <Textarea
                  id="skills"
                  rows={3}
                  placeholder="Optional — e.g. accounting, event planning, youth mentoring, writing, design…"
                  value={form.skills_experience}
                  onChange={(e) => setForm((f) => ({ ...f, skills_experience: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Open to being contacted about a leadership or committee role? *</Label>
                <Select
                  value={form.open_to_leadership_contact || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, open_to_leadership_contact: v as 'yes' | 'no' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose one" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Anything else we should know — timing, preferences, or questions."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link to="/serve">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving} className="font-semibold min-w-[10rem]">
              {saving ? 'Submitting…' : 'Submit interest'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
