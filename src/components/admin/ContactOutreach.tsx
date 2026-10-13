import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Copy, Mail, MessageCircle, MessageSquare, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  mailtoLink,
  outreachPhoneDigits,
  personalize,
  smsLink,
  uniqueEmails,
  uniquePhones,
  whatsAppLink,
  type OutreachContact,
} from '@/lib/contactOutreach'

export type OutreachDraft = { subject: string; message: string }

/**
 * Remembers the admin's last outreach message per list in this browser, so the
 * WhatsApp group link only has to be pasted once. Convenience only — a blank
 * draft is fine if storage is unavailable.
 */
export function useOutreachDraft(storageKey: string, defaults: OutreachDraft) {
  const [draft, setDraft] = useState<OutreachDraft>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<OutreachDraft>) }
    } catch {
      /* storage blocked */
    }
    return defaults
  })
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(draft))
    } catch {
      /* storage blocked */
    }
  }, [storageKey, draft])
  return [draft, setDraft] as const
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`Copied ${what}`)
  } catch {
    toast.error('Could not copy — your browser blocked clipboard access')
  }
}

/**
 * Bulk outreach for whatever rows the current filters show. Opens the admin's
 * own mail app (everyone in BCC) or copies numbers/emails to paste into a
 * WhatsApp group, broadcast list, or group text. Nothing is sent by the site.
 */
export function OutreachPanel({
  contacts,
  draft,
  onDraftChange,
  audienceLabel,
}: {
  contacts: OutreachContact[]
  draft: OutreachDraft
  onDraftChange: (d: OutreachDraft) => void
  audienceLabel: string
}) {
  const [open, setOpen] = useState(false)
  const emails = uniqueEmails(contacts)
  const phones = uniquePhones(contacts)
  // Bulk messages can't be personalized, so drop the {name} placeholder.
  const bulkBody = draft.message.replace(/\s*\{name\}/g, '')

  function emailEveryone() {
    const url = mailtoLink({ bcc: emails, subject: draft.subject, body: bulkBody })
    if (url) {
      window.location.href = url
    } else {
      void copy(emails.join(', '), `${emails.length} emails — paste them into BCC`)
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <div className="font-medium">Message {audienceLabel}</div>
          <div className="text-xs text-muted-foreground">
            {contacts.length} in the current filter · {emails.length} with email · {phones.length} with phone
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open ? (
        <div className="space-y-4 border-t px-4 py-4">
          <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
            <div className="form-field-stack">
              <Label className="text-xs">Email subject</Label>
              <Input
                value={draft.subject}
                onChange={(e) => onDraftChange({ ...draft, subject: e.target.value })}
              />
            </div>
            <div className="form-field-stack">
              <Label className="text-xs">
                Message — paste your WhatsApp group invite link here. <code>{'{name}'}</code> becomes the first name on 1:1 sends.
              </Label>
              <Textarea
                rows={4}
                value={draft.message}
                onChange={(e) => onDraftChange({ ...draft, message: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="gap-1.5" disabled={!emails.length} onClick={emailEveryone}>
              <Mail className="h-3.5 w-3.5" /> Email everyone (BCC)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!emails.length}
              onClick={() => void copy(emails.join(', '), `${emails.length} emails`)}
            >
              <Copy className="h-3.5 w-3.5" /> Copy emails
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!phones.length}
              onClick={() => void copy(phones.join('\n'), `${phones.length} phone numbers`)}
            >
              <Copy className="h-3.5 w-3.5" /> Copy phone numbers
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!bulkBody.trim()}
              onClick={() => void copy(bulkBody, 'message')}
            >
              <Copy className="h-3.5 w-3.5" /> Copy message
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            WhatsApp: post the message (with your group invite link) in a broadcast list, or open a person below and
            tap WhatsApp to send it 1:1. Narrow the list with the filters above first — e.g. one event, confirmed only.
          </p>
        </div>
      ) : null}
    </div>
  )
}

/** Opens one person's full signup, comments untruncated, with 1:1 contact buttons. */
export function ContactDetailDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  contact,
  fields,
  draft,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  contact: OutreachContact | null
  fields: { label: string; value: ReactNode }[]
  draft: OutreachDraft
}) {
  if (!contact) return null
  const message = personalize(draft.message, contact.name)
  const wa = whatsAppLink(contact.phone, message)
  const sms = smsLink(contact.phone, message)
  const digits = outreachPhoneDigits(contact.phone)
  const mail = contact.email
    ? mailtoLink({ to: [contact.email], subject: draft.subject, body: message }) ??
      mailtoLink({ to: [contact.email], subject: draft.subject })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.label}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words">{f.value || '—'}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {wa ? (
            <Button size="sm" className="gap-1.5" asChild>
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </Button>
          ) : null}
          {sms ? (
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a href={sms}>
                <MessageSquare className="h-3.5 w-3.5" /> Text
              </a>
            </Button>
          ) : null}
          {mail ? (
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a href={mail}>
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            </Button>
          ) : null}
          {digits ? (
            <Button size="sm" variant="ghost" className="gap-1.5" asChild>
              <a href={`tel:+${digits}`}>
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Buttons open your own WhatsApp, Messages, or mail app with the message from “Message …” above filled in.
        </p>
      </DialogContent>
    </Dialog>
  )
}
