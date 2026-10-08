import { Link } from 'react-router-dom'
import { ExternalLink, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KighSupportHandles } from '@/components/support/KighSupportHandles'
import { isInternalFundraiser, KIGH_ORGANIZED_LABEL } from '@/lib/fundraiserFunding'
import { hasActiveKighSupportOptions } from '@/lib/kighSupportOptions'
import { paymentNoteInstruction } from '@/lib/fundraiserShare'
import { safeExternalHref } from '@/lib/externalUrl'
import { trackClick } from '@/lib/analytics'
import type { PublicFundraiser } from '@/lib/fundraisersPublic'

/**
 * How to give. No account, no sign-in, no gate of any kind in front of
 * these controls — a donor should be able to land from a WhatsApp link and
 * reach a payment handle in one scroll. (Cash App, Venmo and PayPal apply
 * their own rules on their side; that is not this site's business.)
 *
 * Internal KIGH fundraisers render the live handles from the shared "Ways
 * to Support" config rather than anything copied onto the row, so retiring
 * a handle there retires it here on the next render. The payment note comes
 * from the fundraiser's own reference (or its title) — nothing about any
 * specific fundraiser is hardcoded in this component.
 */
export function FundraiserDonationOptions({
  fundraiser,
  headingId = 'fundraiser-donate-heading',
}: {
  fundraiser: PublicFundraiser
  headingId?: string
}) {
  const internal = isInternalFundraiser(fundraiser.funding_mode)
  const externalHref = safeExternalHref(fundraiser.donation_url)
  const handlesAvailable = hasActiveKighSupportOptions()

  if (fundraiser.donations_closed) {
    return (
      <section
        aria-labelledby={headingId}
        data-testid="fundraiser-donations-closed"
        className="rounded-2xl border border-border/60 bg-muted/30 p-5"
      >
        <h2 id={headingId} className="text-sm font-semibold text-foreground">
          Donations closed
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          KIGH has closed donations for this fundraiser. Thank you to everyone who gave.
        </p>
      </section>
    )
  }

  if (!internal) {
    if (!externalHref) return null
    return (
      <section
        aria-labelledby={headingId}
        data-testid="fundraiser-donate"
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
      >
        <h2 id={headingId} className="text-sm font-semibold text-foreground">
          Donate
        </h2>
        <Button asChild className="mt-3 w-full gap-2">
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="fundraiser-donate-external"
            onClick={() =>
              void trackClick('fundraiser_donate', `/community-support/${fundraiser.slug}`, {
                fundraiser_id: fundraiser.id,
              })
            }
          >
            <ExternalLink className="h-4 w-4" aria-hidden /> Donate / Support
          </a>
        </Button>
      </section>
    )
  }

  if (!handlesAvailable) return null

  return (
    <section
      aria-labelledby={headingId}
      data-testid="fundraiser-donate"
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-sm font-semibold text-foreground">
          Donate
        </h2>
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          {KIGH_ORGANIZED_LABEL}
        </Badge>
      </div>

      <p
        data-testid="fundraiser-payment-note"
        className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/40 px-3 py-2.5 text-sm leading-relaxed text-foreground"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden />
        {paymentNoteInstruction(fundraiser)}
      </p>

      <div className="mt-3">
        <KighSupportHandles variant="compact" />
      </div>

      <Link to="/support" className="mt-3 inline-block text-xs link-editorial">
        Verify these handles on Ways to Support
      </Link>
    </section>
  )
}
