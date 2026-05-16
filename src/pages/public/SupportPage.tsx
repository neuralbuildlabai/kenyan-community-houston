import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const OPTIONS = [
  {
    provider: 'Cash App',
    label: 'KIGH Cash App',
    handle: '$KighTreasurer',
    copy: '$KighTreasurer',
    href: 'https://cash.app/$KighTreasurer',
    openLabel: 'Open Cash App',
  },
  {
    provider: 'Venmo',
    label: 'Venmo',
    handle: '@KIGH_Treasurer',
    copy: '@KIGH_Treasurer',
    href: 'https://venmo.com/u/KIGH_Treasurer',
    openLabel: 'Open Venmo',
  },
  {
    provider: 'PayPal',
    label: 'PayPal',
    handle: '@KighTreasurer',
    copy: '@KighTreasurer',
    href: 'https://www.paypal.com/paypalme/KighTreasurer',
    openLabel: 'Open PayPal',
  },
] as const

function SupportCard({
  label,
  handle,
  copy,
  href,
  openLabel,
  provider,
}: {
  label: string
  handle: string
  copy: string
  href: string
  openLabel: string
  provider: string
}) {
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

export function SupportPage() {
  return (
    <>
      <SEOHead
        title="Ways to Support KIGH"
        description="Official ways to support Kenyans in Greater Houston programs through approved treasury handles."
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Ways to support KIGH
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Official channels for community contributions.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OPTIONS.map((o) => (
            <SupportCard key={o.provider} {...o} />
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground leading-relaxed max-w-2xl">
          Please include your name and purpose in the payment note when possible.
          Confirm the recipient handle before sending payment, and contact the
          Treasurer for questions about receipts or official records.
        </p>
      </div>
    </>
  )
}
