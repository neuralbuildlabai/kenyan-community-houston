import { useState } from 'react'
import { Copy, Check, ExternalLink, Heart } from 'lucide-react'
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
      <div className="relative border-b bg-gradient-to-br from-primary/8 via-background to-muted/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Ways to Support KIGH</h1>
              <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
                Your support helps KIGH organize community events, youth programs, cultural activities, newcomer resources, and community support initiatives across Greater Houston.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OPTIONS.map((o) => (
            <SupportCard key={o.provider} {...o} />
          ))}
        </div>

        <Card className="border-primary/15 bg-muted/25">
          <CardContent className="pt-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Please include your name and purpose in the payment note when possible, such as membership dues, event support, fundraiser, or general KIGH support.
            </p>
            <p className="text-foreground/90 border-l-2 border-primary/40 pl-4">
              These links open the selected payment provider. Please confirm the recipient handle before sending payment. KIGH support options are provided for community contributions and membership-related payments. Please contact KIGH leadership or the Treasurer for questions about payments, receipts, or official financial records.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
