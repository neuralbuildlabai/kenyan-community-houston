import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle, ExternalLink, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PageLoader } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FundraiserProgressPanel } from '@/components/fundraisers/FundraiserProgressPanel'
import { summarizeReportedTotal } from '@/lib/fundraiserCollections'
import { ORGANIZER_REPORTED_SOURCE_LABEL } from '@/lib/fundraiserFunding'
import { fundraiserPath } from '@/lib/fundraiserShare'
import { safeExternalHref } from '@/lib/externalUrl'
import {
  fetchManagedFundraiser,
  manageTokenFromHash,
  parseReportedAmount,
  updateManagedFundraiser,
  type ManagedFundraiser,
} from '@/lib/fundraiserManage'

/**
 * The organizer's private page for an independent fundraiser: update the
 * amount raised and open or close donations. Reached only through the link
 * emailed when the fundraiser is published; the token lives in the URL hash.
 */
export function ManageFundraiserPage() {
  const { hash } = useLocation()
  const token = manageTokenFromHash(hash)
  const [item, setItem] = useState<ManagedFundraiser | null>(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [closed, setClosed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetchManagedFundraiser(token)
      .then((data) => {
        if (cancelled) return
        setItem(data)
        if (data) {
          setAmount(String(data.raised_amount ?? 0))
          setClosed(Boolean(data.donations_closed))
        }
      })
      .catch((e: unknown) => !cancelled && setLoadError(e instanceof Error ? e.message : 'Could not load'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [token])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    const value = parseReportedAmount(amount)
    if (value === null) {
      toast.error('Enter the amount raised as a number, for example 1250.')
      return
    }
    setSaving(true)
    try {
      const updated = await updateManagedFundraiser(token, value, closed)
      setItem(updated)
      setAmount(String(updated.raised_amount ?? value))
      toast.success('Saved. The public page now shows the new total.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const invalid = !token || (!item && !loadError)
  const published = item?.status === 'published'
  const donationHref = safeExternalHref(item?.donation_url ?? null)

  return (
    <>
      <SEOHead title="Manage your fundraiser" noIndex />
      <PublicPageHero
        eyebrow="Independent fundraiser"
        title={item ? item.title : 'Manage your fundraiser'}
        subtitle="Keep your fundraiser's total up to date. KIGH lists your fundraiser but does not hold the money, so the figure people see comes from you."
        tone="tint"
      />

      <section className="py-10 sm:py-14">
        <div className="public-container mx-auto max-w-xl space-y-6">
          {invalid || loadError ? (
            <Alert data-testid="manage-invalid-link">
              <KeyRound className="h-4 w-4" aria-hidden />
              <AlertDescription className="text-sm">
                {loadError ??
                  'This link is not valid or has been replaced by a newer one. Use the most recent link KIGH emailed you, or reply to that email for a new one.'}
              </AlertDescription>
            </Alert>
          ) : item ? (
            <>
              <FundraiserProgressPanel
                summary={summarizeReportedTotal(item.raised_amount, item.goal_amount, item.collections_updated_at)}
                sourceLabel={ORGANIZER_REPORTED_SOURCE_LABEL}
              />

              {item.can_update ? (
                <form onSubmit={save} className="form-page-card space-y-6" data-testid="manage-fundraiser-form">
                  <div className="form-field-stack">
                    <Label htmlFor="raised_amount">Total raised so far ($)</Label>
                    <Input
                      id="raised_amount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="1250"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the full running total from your fundraising page, not just today&apos;s donations.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <Switch id="donations_closed" checked={closed} onCheckedChange={setClosed} />
                    <div className="space-y-1">
                      <Label htmlFor="donations_closed" className="cursor-pointer">
                        Donations closed
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Turn on when you have stopped accepting donations. The page stays up and thanks donors.
                      </p>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving} className="gap-2">
                    <CheckCircle className="h-4 w-4" aria-hidden />
                    {saving ? 'Saving…' : 'Save update'}
                  </Button>
                </form>
              ) : (
                <Alert>
                  <AlertDescription className="text-sm">
                    This fundraiser can no longer be updated. Contact KIGH if something needs changing.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-3 text-sm">
                {published ? (
                  <Link to={fundraiserPath(item.slug)} className="link-editorial">
                    View the public page
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    Not published yet: the public page appears once an admin approves it.
                  </span>
                )}
                {donationHref ? (
                  <a href={donationHref} target="_blank" rel="noopener noreferrer" className="link-editorial inline-flex items-center gap-1">
                    Your fundraising page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                ) : null}
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Keep this link private: anyone who has it can update your fundraiser. If it leaks, reply to
                your KIGH email and we will send you a new one, which stops this one working.
              </p>
            </>
          ) : null}
        </div>
      </section>
    </>
  )
}
