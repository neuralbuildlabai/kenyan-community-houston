import { useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type PollShareSectionProps = {
  slug: string
}

/** Share block with copyable poll URL. */
export function PollShareSection({ slug }: PollShareSectionProps) {
  const [copied, setCopied] = useState(false)
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/polls/${slug}`
      : `/polls/${slug}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select the URL manually')
    }
  }

  return (
    <section
      className="rounded-2xl border border-border/60 bg-muted/20 p-5 sm:p-6"
      aria-labelledby="poll-share-heading"
      data-testid="poll-share"
    >
      <div className="flex items-start gap-3">
        <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 id="poll-share-heading" className="text-sm font-semibold text-foreground">
              Share this poll
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send this link so neighbors can vote from any device.
            </p>
          </div>
          <p
            className="break-all rounded-lg border border-border/50 bg-background px-3 py-2 font-mono text-sm text-foreground"
            data-testid="poll-share-url"
          >
            {url}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void copyLink()}
            data-testid="poll-copy-link"
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
      </div>
    </section>
  )
}
