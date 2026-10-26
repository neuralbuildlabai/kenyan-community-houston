import { useEffect, useState } from 'react'
import { Copy, KeyRound, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

/**
 * Re-issues an independent fundraiser's organizer link (migration 090).
 * Every issue replaces the previous link, so the admin is told that up front;
 * the link itself is only ever shown right after it is created.
 */
export function FundraiserManageLinkDialog({
  fundraiser,
  organizerEmail,
  issuedAt,
  open,
  onOpenChange,
  onIssued,
}: {
  fundraiser: { id: string; title: string } | null
  organizerEmail: string | null
  issuedAt: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onIssued: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (open) setUrl(null)
  }, [open, fundraiser?.id])

  async function issue(send: boolean) {
    if (!fundraiser) return
    setBusy(true)
    const { data, error } = await supabase.rpc('kigh_admin_fundraiser_manage_link', {
      p_id: fundraiser.id,
      p_send: send,
    })
    setBusy(false)
    if (error) {
      toast.error(error.message || 'Could not create the link')
      return
    }
    const res = data as { url: string; emailed: boolean; email: string | null }
    onIssued()
    if (send) {
      if (res.emailed) {
        toast.success(`New link emailed to ${res.email}`)
        onOpenChange(false)
      } else {
        toast.error('No organizer email on file, so nothing was sent. Copy the link instead.')
        setUrl(res.url)
      }
      return
    }
    setUrl(res.url)
    try {
      await navigator.clipboard.writeText(res.url)
      toast.success('New link copied')
    } catch {
      /* shown below for manual copy */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="fundraiser-manage-link-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" aria-hidden /> Organizer update link
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{fundraiser?.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            The organizer uses this private link to update the amount raised and close donations. KIGH does
            not hold the money for independent fundraisers.
          </p>
          <p>
            {issuedAt
              ? `Current link issued ${new Date(issuedAt).toLocaleString()}. Creating a new one stops the old one working.`
              : 'No link has been issued yet. One is emailed automatically when the fundraiser is published.'}
          </p>
          <p>
            Organizer email: <span className="font-medium text-foreground">{organizerEmail ?? 'none on file'}</span>
          </p>
          {url ? (
            <div className="flex gap-2">
              <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(url).then(() => toast.success('Copied'))}
                aria-label="Copy link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="gap-1.5" disabled={busy} onClick={() => void issue(false)}>
            <Copy className="h-4 w-4" aria-hidden /> New link to copy
          </Button>
          <Button className="gap-1.5" disabled={busy || !organizerEmail} onClick={() => void issue(true)}>
            <Mail className="h-4 w-4" aria-hidden /> Email new link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
