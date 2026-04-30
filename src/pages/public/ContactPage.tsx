import { useState } from 'react'
import { Mail, MapPin, CheckCircle } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const INQUIRY_TYPES = ['General Inquiry', 'Event Submission', 'Business Listing', 'Fundraiser', 'Report Content', 'Partnership', 'Membership / Join', 'Other']

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', inquiry_type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('contact_submissions').insert([{ ...form, status: 'new' }])
    setLoading(false)
    if (error) {
      toast.error('Failed to send message. Please try again.')
    } else {
      setSubmitted(true)
    }
  }

  return (
    <>
      <SEOHead title="Contact / Join" description="Reach out to the Kenyan Community Houston team for inquiries, event submissions, or to get involved." />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Contact / Join Us</h1>
          <p className="text-muted-foreground">We'd love to hear from you. Fill in the form below and we'll get back to you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Info */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">Location</div>
                <div className="text-sm text-muted-foreground">Houston, Texas, USA</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">Email</div>
                <a href="mailto:info@kenyancommunityhouston.com" className="text-sm text-primary hover:underline">
                  info@kenyancommunityhouston.com
                </a>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-5">
              <h3 className="font-semibold mb-2">How to get involved</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>📅 Submit an event for the community</li>
                <li>🏢 List your business in the directory</li>
                <li>❤️ Submit a community fundraiser</li>
                <li>📣 Share a community announcement</li>
                <li>🤝 Partner with us or volunteer</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle className="h-14 w-14 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Message Sent!</h2>
                <p className="text-muted-foreground max-w-sm">
                  Thank you for reaching out. We'll review your message and respond as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Mwangi" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (713) 000-0000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Inquiry Type</Label>
                    <Select onValueChange={(v) => setForm({ ...form, inquiry_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {INQUIRY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief subject" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="message"
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us how we can help…"
                  />
                </div>

                <Button type="submit" className="w-full sm:w-auto px-8" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Message'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
