import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { ANNOUNCEMENT_CATEGORIES } from '@/lib/constants'
import { generateSlug } from '@/lib/utils'
import { toast } from 'sonner'

export function SubmitAnnouncementPage() {
  const [form, setForm] = useState({ title: '', category: '', summary: '', body: '', author_name: '', external_url: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.category || !form.body) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('announcements').insert([{
      ...form,
      slug: generateSlug(form.title),
      external_url: form.external_url || null,
      status: 'pending',
    }])
    setLoading(false)
    if (error) toast.error('Submission failed. Please try again.')
    else setSubmitted(true)
  }

  if (submitted) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Announcement Submitted!</h2>
      <p className="text-muted-foreground">We'll review it and publish if it meets our guidelines.</p>
    </div>
  )

  return (
    <>
      <SEOHead title="Submit an Announcement" description="Submit a community announcement for review." />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit an Announcement</h1>
          <p className="text-muted-foreground">All submissions are reviewed before publication.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{ANNOUNCEMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="author_name">Your Name</Label>
              <Input id="author_name" value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="summary">Summary (optional)</Label>
              <Input id="summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="One-line summary" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="body">Full Announcement <span className="text-destructive">*</span></Label>
              <Textarea id="body" rows={7} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="external_url">External Link (optional)</Label>
              <Input id="external_url" type="url" value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit for Review'}</Button>
        </form>
      </div>
    </>
  )
}
