import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { activeKighSupportOptions, type KighSupportOption } from '@/lib/kighSupportOptions'

/**
 * Shared renderer for the official KIGH handles. `/support` uses the `cards`
 * variant; the fundraiser form preview and internal fundraiser pages use the
 * `compact` variant so a donation panel stays readable inside a sidebar or
 * between form fields. Both read `activeKighSupportOptions()`, so the copy
 * control and link behaviour never diverge between surfaces.
 */
function useCopyHandle(copy: string) {
  const [done, setDone] = useState(false)
  async function copyText() {
    try {
      await navigator.clipboard.writeText(copy)
      setDone(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setDone(false), 2000)
    } catch {
      toast.error('Could not copy — select the handle manually')
    }
  }
  return { done, copyText }
}

export function KighSupportHandleCard({
  label,
  handle,
  copy,
  href,
  openLabel,
  provider,
}: KighSupportOption) {
  const { done, copyText } = useCopyHandle(copy)
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 space-y-1">
        <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">{provider}</Badge>
        <CardTitle className="text-lg">{label}</CardTitle>
        <CardDescription className="text-base font-mono text-foreground font-medium pt-1">{handle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2 pt-0">
        <Button type="button" variant="outline" size="sm" className="gap-2 flex-1" onClick={copyText}>
          {done ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {done ? 'Copied' : 'Copy handle'}
        </Button>
        <Button asChild size="sm" className="gap-2 flex-1 font-semibold">
          <a href={href} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 shrink-0" />
            {openLabel}
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

function KighSupportHandleRow({ provider, handle, copy, href, openLabel }: KighSupportOption) {
  const { done, copyText } = useCopyHandle(copy)
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {provider}
          </p>
          <p className="truncate font-mono text-sm font-medium text-foreground">{handle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" onClick={copyText}>
            {done ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="text-xs">{done ? 'Copied' : 'Copy'}</span>
          </Button>
          <Button asChild size="sm" className="h-8 gap-1.5 px-2.5">
            <a href={href} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">{openLabel.replace(/^Open /, '')}</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function KighSupportHandles({ variant = 'cards' }: { variant?: 'cards' | 'compact' }) {
  const options = activeKighSupportOptions()
  if (options.length === 0) return null

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        {options.map((option) => (
          <KighSupportHandleRow key={option.provider} {...option} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => (
        <KighSupportHandleCard key={option.provider} {...option} />
      ))}
    </div>
  )
}
