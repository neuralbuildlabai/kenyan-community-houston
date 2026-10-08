import { useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { buildFundraiserShareMessage, buildWhatsAppShareUrl } from '@/lib/fundraiserShare'
import { trackClick } from '@/lib/analytics'

/**
 * Share controls for a published fundraiser.
 *
 * `publicUrl` is always the permanent production address, never
 * `window.location.href` — this page is read from Vercel previews and from
 * `localhost` during review, and a link pasted into a WhatsApp group has to
 * outlive both.
 *
 * The copied URL is shown on the page as well as announced, so someone can
 * see what they are about to paste and fall back to selecting it by hand if
 * the clipboard API is unavailable (older mobile browsers, insecure
 * origins).
 */
export function FundraiserShareActions({
  title,
  goalAmount,
  publicUrl,
  headingId = 'fundraiser-share-heading',
}: {
  title: string
  goalAmount?: number | string | null
  publicUrl: string
  headingId?: string
}) {
  const [copied, setCopied] = useState(false)
  const message = buildFundraiserShareMessage({ title, goalAmount, url: publicUrl })
  const whatsAppUrl = buildWhatsAppShareUrl(message)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select the link above manually')
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      data-testid="fundraiser-share"
      className="rounded-2xl border border-border/60 bg-muted/20 p-5"
    >
      <h2 id={headingId} className="text-sm font-semibold text-foreground">
        Share this fundraiser
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Send the link to a WhatsApp group so neighbors can read it and give.
      </p>

      <p
        data-testid="fundraiser-share-url"
        className="mt-3 break-all rounded-lg border border-border/50 bg-background px-3 py-2 font-mono text-xs text-foreground sm:text-sm"
      >
        {publicUrl}
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="gap-2 sm:w-auto">
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="fundraiser-share-whatsapp"
            onClick={() => void trackClick('fundraiser_share_whatsapp', publicUrl)}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Share on WhatsApp
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2 sm:w-auto"
          onClick={() => void copyLink()}
          data-testid="fundraiser-copy-link"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-600" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copy link
            </>
          )}
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? 'Fundraiser link copied to clipboard' : ''}
      </p>
    </section>
  )
}
