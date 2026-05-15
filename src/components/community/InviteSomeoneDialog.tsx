import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  buildInviteMessage,
  buildWhatsAppInviteUrl,
  isValidWhatsAppNormalizedDigits,
  normalizeWhatsAppPhone,
  PUBLIC_SITE_URL,
} from '@/lib/memberDemographics'

type Props = {
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost'
  /** When false, only signed-in users see the trigger (e.g. profile). */
  showTriggerWhenLoggedOut?: boolean
}

export function InviteSomeoneDialog({
  triggerVariant = 'outline',
  showTriggerWhenLoggedOut = true,
}: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canTrack = !!user

  function resetForm() {
    setRecipientName('')
    setRecipientPhone('')
    setPersonalNote('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Sign in to generate a tracked invite.')
      return
    }
    const digits = normalizeWhatsAppPhone(recipientPhone)
    if (!digits) {
      toast.error('Phone number is required.')
      return
    }
    if (!isValidWhatsAppNormalizedDigits(digits)) {
      toast.error('Enter a valid phone number (7–15 digits after removing formatting).')
      return
    }
    const note = personalNote.trim()
    if (note.length > 300) {
      toast.error('Personal note must be 300 characters or fewer.')
      return
    }
    const message = buildInviteMessage({
      recipientName: recipientName.trim() || null,
      personalNote: note || null,
      siteUrl: PUBLIC_SITE_URL,
    })
    const url = buildWhatsAppInviteUrl(digits, message)
    const rawPhone = recipientPhone.trim()
    setSubmitting(true)
    const { error } = await supabase.from('member_invites').insert({
      invited_by: user.id,
      recipient_name: recipientName.trim() || null,
      recipient_phone: rawPhone,
      normalized_phone: digits,
      personal_note: note || null,
      invite_message: message,
      channel: 'whatsapp',
      status: 'opened_whatsapp',
    })
    setSubmitting(false)
    if (error) {
      toast.error('Could not save your invite attempt. Please try again.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.success('WhatsApp opened with your invite message. Please tap Send in WhatsApp to complete the invite.')
    resetForm()
    setOpen(false)
  }

  if (!user && !showTriggerWhenLoggedOut) {
    return null
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant={triggerVariant} className="gap-2">
          <MessageCircle className="h-4 w-4" />
          Invite Someone
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite someone via WhatsApp</DialogTitle>
          <DialogDescription>
            The website does not send SMS or messages for you. We open WhatsApp on your device with a prefilled note so
            you can send the invite personally. Tracked attempts are marked as &quot;opened WhatsApp,&quot; not delivered.
          </DialogDescription>
        </DialogHeader>

        {!canTrack ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Please sign in to generate a tracked invite so the team can see outreach activity safely — without exposing
              your invite on public pages.
            </p>
            <Button asChild>
              <Link to="/login?next=%2Fchat">Sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-recipient-name">Recipient name (optional)</Label>
              <Input
                id="invite-recipient-name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                autoComplete="name"
                maxLength={120}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-recipient-phone">Recipient phone *</Label>
              <Input
                id="invite-recipient-phone"
                type="tel"
                inputMode="tel"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                autoComplete="tel"
                placeholder="+1 713 555 0100"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">US or international formats accepted; we normalize digits for WhatsApp.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-personal-note">Personal note (optional)</Label>
              <Textarea
                id="invite-personal-note"
                rows={3}
                maxLength={300}
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground text-right">{personalNote.length} / 300</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Open WhatsApp'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
