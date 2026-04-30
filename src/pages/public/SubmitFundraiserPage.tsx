import { useState } from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { FUNDRAISER_CATEGORIES, FUNDRAISER_DISCLAIMER } from '@/lib/constants'
import { generateSlug } from '@/lib/utils'
import { toast } from 'sonner'

export function SubmitFundraiserPage() {
  const [form, setForm] = useState({
    title: '', category: '', summary: '', body: '',
    beneficiary_name: '', organizer_name: '', organizer_contact: '',
    goal_amount: '', donation_url: '', deadline: '',
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
    const { error } = await supabase.from('fundraisers').insert([{
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
    }])
    setLoading(false)
    if (error) toast.error('Submission failed. Please try again.')
    else setSubmitted(true)
  }

  if (submitted) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Fundraiser Submitted!</h2>
      <p className="text-muted-foreground">We'll review your submission. Verification may take additional time.</p>
    </div>
  )

  return (
    <>
      <SEOHead title="Submit a Fundraiser" description="Submit a community fundraiser or support campaign for review." />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Submit a Fundraiser</h1>
          <p className="text-muted-foreground">All submissions go through moderation before publication.</p>
        </div>
        <Alert className="mb-8 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">{FUNDRAISER_DISCLAIMER}</AlertDescription>
        </Alert>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="title">Fundraiser Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{FUNDRAISER_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="beneficiary_name">Beneficiary Name <span className="text-destructive">*</span></Label>
              <Input id="beneficiary_name" value={form.beneficiary_name} onChange={(e) => setForm({ ...form, beneficiary_name: e.target.value })} placeholder="Who is this for?" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organizer_name">Organizer Name</Label>
              <Input id="organizer_name" value={form.organizer_name} onChange={(e) => setForm({ ...form, organizer_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organizer_contact">Organizer Contact (private)</Label>
              <Input id="organizer_contact" value={form.organizer_contact} onChange={(e) => setForm({ ...form, organizer_contact: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal_amount">Goal Amount ($)</Label>
              <Input id="goal_amount" type="number" min="0" step="1" value={form.goal_amount} onChange={(e) => setForm({ ...form, goal_amount: e.target.value })} placeholder="5000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Input id="deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="donation_url">Donation / GoFundMe Link</Label>
              <Input id="donation_url" type="url" value={form.donation_url} onChange={(e) => setForm({ ...form, donation_url: e.target.value })} placeholder="https://gofundme.com/…" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="summary">Short Summary</Label>
              <Input id="summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="One sentence about this fundraiser" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="body">Full Details</Label>
              <Textarea id="body" rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Provide full details about the situation and how funds will be used…" />
            </div>
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit for Review'}</Button>
        </form>
      </div>
    </>
  )
}
