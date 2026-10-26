import { useEffect, useState } from 'react'
import { Copy, Mail, MessageCircle, MessageSquare, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { smsLink, whatsAppLink } from '@/lib/contactOutreach'
import {
  MAX_REJECTION_NOTE_LENGTH,
  MIN_REJECTION_NOTE_LENGTH,
  REJECTABLE_TYPE_LABEL,
  REJECTION_PRESETS,
  rejectSubmission,
  type RejectableType,
  type RejectionResult,
} from '@/lib/submissionRejection'
import { isValidEmail } from '@/lib/fundraiserFunding'

/**
 * Reject a pending submission with a note that is saved on the item and
 * emailed to the submitter from the KIGH domain. With no email on file the
 * admin can type one in, or send the same note by WhatsApp / text afterwards.
 */
export function RejectSubmissionDialog({
  type,
  item,
  knownEmail,
  open,
  onOpenChange,
  onRejected,
}: {
  type: RejectableType
  item: { id: string; title: string } | null
  /** Email on file, when the caller already has it, so the admin can see who will get it. */
  knownEmail?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRejected: () => void
}) {
  const [note, setNote] = useState('')
  const [notify, setNotify] = useState(true)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<RejectionResult | null>(null)

  useEffect(() => {
    if (open) {
      setNote('')
      setNotify(true)
      setEmail('')
      setResult(null)
    }
  }, [open, item?.id])

  const kind = REJECTABLE_TYPE_LABEL[type]
  const trimmed = note.trim()
  const emailTyped = email.trim()
  const emailInvalid = emailTyped !== '' && !isValidEmail(emailTyped)

  async function submit() {
    if (!item) return
    if (trimmed.length < MIN_REJECTION_NOTE_LENGTH) {
      toast.error('Write a short note explaining why.')
      return
    }
    if (emailInvalid) {
      toast.error('That email address does not look right.')
      return
    }
    setSaving(true)
    try {
      const res = await rejectSubmission({ type, id: item.id, note: trimmed, notify, email: emailTyped || null })
      onRejected()
      if (res.emailed) {
        toast.success(`Rejected. The note was emailed to ${res.email}.`)
        onOpenChange(false)
      } else {
        toast.success('Rejected and the note saved.')
        setResult(res)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not reject')
    } finally {
      setSaving(false)
    }
  }

  async function copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Message copied')
    } catch {
      toast.error('Could not copy')
    }
  }

  const wa = result ? whatsAppLink(result.phone, result.message) : null
  const sms = result ? smsLink(result.phone, result.message) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="reject-submission-dialog">
        <DialogHeader>
          <DialogTitle>Reject {kind}</DialogTitle>
          <DialogDescription className="line-clamp-2">{item?.title}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              {notify
                ? 'There is no email on file, so nothing was emailed. Send the note another way:'
                : 'Rejected without emailing. You can still send the note yourself:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {wa ? (
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
                  </a>
                </Button>
              ) : null}
              {sms ? (
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={sms}>
                    <MessageSquare className="h-4 w-4" aria-hidden /> Text message
                  </a>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void copyMessage(result.message)}>
                <Copy className="h-4 w-4" aria-hidden /> Copy message
              </Button>
            </div>
            {!wa && !sms ? <p className="text-xs text-muted-foreground">No phone number on file either.</p> : null}
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Start from a common reason</p>
              <div className="flex flex-col gap-1.5">
                {REJECTION_PRESETS[type].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNote(preset)}
                    className="rounded-md border border-border/70 px-3 py-2 text-left text-xs leading-snug hover:bg-muted"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field-stack">
              <Label htmlFor="rejection-note">Note to the submitter</Label>
              <Textarea
                id="rejection-note"
                rows={5}
                maxLength={MAX_REJECTION_NOTE_LENGTH}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={`Why this ${kind} can't be published, and what would fix it.`}
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="rejection-notify" checked={notify} onCheckedChange={(v) => setNotify(v === true)} className="mt-0.5" />
              <Label htmlFor="rejection-notify" className="cursor-pointer text-sm font-normal leading-snug">
                Email this note to the submitter from the KIGH address (a copy goes to the KIGH inbox)
              </Label>
            </div>

            {notify ? (
              <div className="form-field-stack">
                <Label htmlFor="rejection-email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" aria-hidden /> Send to
                </Label>
                <Input
                  id="rejection-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={knownEmail ? knownEmail : 'Email on file, or type one'}
                  aria-invalid={emailInvalid}
                />
                <p className="text-xs text-muted-foreground">
                  {knownEmail
                    ? `Leave blank to use ${knownEmail}.`
                    : 'Leave blank to use the email on file. If there is none, type the submitter’s email here.'}
                </p>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="gap-1.5"
                onClick={() => void submit()}
                disabled={saving || trimmed.length < MIN_REJECTION_NOTE_LENGTH}
                data-testid="reject-submission-confirm"
              >
                <XCircle className="h-4 w-4" aria-hidden />
                {saving ? 'Rejecting…' : notify ? 'Reject and email' : 'Reject'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
