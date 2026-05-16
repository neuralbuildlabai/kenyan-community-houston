import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check, ExternalLink, ShieldCheck, Mail, Info } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { PUBLIC_CONTACT_EMAIL } from '@/lib/constants'

/**
 * Official treasury & support handles. These are the only approved channels —
 * the page intentionally lists handle, copyable text, and a link side by side
 * so members can confirm what they're sending to before they send. The wording
 * stays calm: this page is not a fundraising drive, it's a reference for
 * neighbors who want to contribute when they choose to.
 */
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

      <div className="border-b border-primary/10 bg-gradient-to-br from-primary/[0.06] via-background to-kenyan-gold-500/[0.05]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              Treasury &amp; support handles
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ways to support KIGH
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              These are the official handles members can use when they choose to
              contribute toward KIGH events, welfare check-ins, youth and family programs,
              or general operations. There is no pressure to give — this page exists so
              that when a contribution is the right thing for you, you know exactly where
              it should go.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-10">
        <section aria-labelledby="support-handles-heading">
          <header className="mb-5 max-w-2xl">
            <h2
              id="support-handles-heading"
              className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              Official handles
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Each handle below belongs to the KIGH Treasurer on behalf of the organization.
              Copy the handle or open the app to confirm the recipient before you send.
            </p>
          </header>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {OPTIONS.map((o) => (
              <SupportCard key={o.provider} {...o} />
            ))}
          </div>
        </section>

        <section
          aria-labelledby="support-trust-heading"
          className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden"
        >
          <div className="border-b bg-muted/25 px-6 py-4">
            <h2
              id="support-trust-heading"
              className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2"
            >
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" aria-hidden />
              Before you send
            </h2>
          </div>
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <div className="flex gap-3">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground">Who these handles belong to</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  All three handles are held by the KIGH Treasurer on behalf of the
                  organization. They are not personal accounts.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground">What contributions are used for</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Community events, welfare and benevolence, youth and family programs,
                  and operational costs of running a 501(c)(3) community nonprofit.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground">Confirm the official handle</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  If anything looks off — a different handle, a forwarded screenshot, an
                  unfamiliar request — verify here on the site before sending. KIGH will
                  never pressure you privately to use a different handle.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Mail className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground">Treasury verification</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Questions about records, a specific transfer, or whether a request is
                  legitimate? Email{' '}
                  <a
                    href={`mailto:${PUBLIC_CONTACT_EMAIL}?subject=Treasury%20verification`}
                    className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                  >
                    {PUBLIC_CONTACT_EMAIL}
                  </a>{' '}
                  and ask for the Treasurer.
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          Please include your name and the purpose of the payment in the note when you can
          (for example, "Annual dues — Mwangi family" or "Picnic contribution"). Confirm
          the recipient handle before sending payment, and contact the Treasurer for
          questions about receipts or official records.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/membership">Membership registration</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/governance">Constitution &amp; bylaws</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/contact">Contact KIGH</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
