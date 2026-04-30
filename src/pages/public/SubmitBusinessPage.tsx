import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { BUSINESS_CATEGORIES } from '@/lib/constants'
import { generateSlug } from '@/lib/utils'
import { toast } from 'sonner'

export function SubmitBusinessPage() {
  const [form, setForm] = useState({
    name: '', category: '', description: '', services: '',
    address: '', city: 'Houston', state: 'TX', zip: '',
    phone: '', email: '', website: '', owner_name: '', owner_contact: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.category || !form.description) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('businesses').insert([{
      ...form,
      slug: generateSlug(form.name),
      status: 'pending',
      tier: 'basic',
    }])
    setLoading(false)
    if (error) toast.error('Submission failed. Please try again.')
    else setSubmitted(true)
  }

  if (submitted) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Business Submitted!</h2>
      <p className="text-muted-foreground">We'll review your listing and publish it within 1–3 business days.</p>
    </div>
  )

  return (
    <>
      <SEOHead title="List Your Business" description="Submit your Kenyan-owned or community-friendly business for the Houston directory." />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">List Your Business</h1>
          <p className="text-muted-foreground">Get discovered by the Kenyan community in Houston. Free basic listing.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="name">Business Name <span className="text-destructive">*</span></Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Business Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="description">Business Description <span className="text-destructive">*</span></Label>
              <Textarea id="description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="services">Services Offered</Label>
              <Textarea id="services" rows={3} value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="List your services…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="owner_name">Owner / Contact Name</Label>
              <Input id="owner_name" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="owner_contact">Owner Contact (private)</Label>
              <Input id="owner_contact" value={form.owner_contact} onChange={(e) => setForm({ ...form, owner_contact: e.target.value })} />
            </div>
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit for Review'}</Button>
        </form>
      </div>
    </>
  )
}
