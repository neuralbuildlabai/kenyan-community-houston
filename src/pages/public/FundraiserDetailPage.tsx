import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Eye } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { VerificationBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageLoader } from '@/components/LoadingSpinner'
import { FundraiserProgressPanel } from '@/components/fundraisers/FundraiserProgressPanel'
import { FundraiserDonationOptions } from '@/components/fundraisers/FundraiserDonationOptions'
import { FundraiserShareActions } from '@/components/fundraisers/FundraiserShareActions'
import { FundraiserCollectionsTable } from '@/components/fundraisers/FundraiserCollectionsTable'
import { formatDate, statusLabel } from '@/lib/utils'
import { FUNDRAISER_DISCLAIMER } from '@/lib/constants'
import { isInternalFundraiser } from '@/lib/fundraiserFunding'
import { summarizeFundraiserCollections, type PublicCollectionRow } from '@/lib/fundraiserCollections'
import { fundraiserPublicUrl } from '@/lib/fundraiserShare'
import {
  fetchFundraiserPreviewBySlug,
  fetchPublicCollections,
  fetchPublishedFundraiserBySlug,
  type PublicFundraiser,
} from '@/lib/fundraisersPublic'
import { trackEntityView } from '@/lib/analytics'
import { useAuth } from '@/contexts/AuthContext'

const KIGH_ORGANIZER_NAME = 'Kenyans in Greater Houston (KIGH)'

/**
 * The permanent public page for one fundraiser — the thing a WhatsApp link
 * lands on. Reachable by anyone: no account, no sign-in, nothing between
 * arriving and donating.
 *
 * Only published fundraisers resolve. A draft, pending or rejected
 * submission falls through to the not-found panel below, and the RLS policy
 * on `fundraisers` refuses the row regardless of what this page asks for.
 *
 * Page order follows the reading order a donor needs: who and what, then
 * how far along, then how to give, then how to pass it on, then the detail
 * and the receipts. Donation options appear exactly once.
 */
export function FundraiserDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { isAdmin, loading: authLoading } = useAuth()
  const [item, setItem] = useState<PublicFundraiser | null>(null)
  const [collections, setCollections] = useState<PublicCollectionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setItem(null)
      setCollections([])
      // Admins get the unfiltered read so they can check a submission
      // before approving it. For everyone else the second call does not
      // exist, and RLS would refuse it anyway.
      let fundraiser = slug ? await fetchPublishedFundraiserBySlug(slug) : null
      if (!fundraiser && slug && isAdmin) {
        fundraiser = await fetchFundraiserPreviewBySlug(slug)
      }
      if (cancelled) return
      setItem(fundraiser)
      if (fundraiser) {
        const rows = await fetchPublicCollections(fundraiser.id)
        if (!cancelled) setCollections(rows)
      }
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [slug, isAdmin, authLoading])

  useEffect(() => {
    if (!item?.id) return
    void trackEntityView('fundraisers', item.id, item.title, `/community-support/${item.slug}`)
  }, [item?.id, item?.slug, item?.title])

  if (loading || authLoading) return <PageLoader />

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <SEOHead title="Fundraiser Not Found" noIndex />
        <h1 className="text-2xl font-bold mb-3">Fundraiser Not Found</h1>
        <Button asChild>
          <Link to="/community-support">Back to Community Support</Link>
        </Button>
      </div>
    )
  }

  const internal = isInternalFundraiser(item.funding_mode)
  const organizer = internal ? KIGH_ORGANIZER_NAME : item.organizer_name
  const summary = summarizeFundraiserCollections(collections, item.goal_amount)
  const publicUrl = fundraiserPublicUrl(item.slug)
  const published = item.status === 'published'

  return (
    <>
      <SEOHead
        title={item.title}
        description={item.summary ?? undefined}
        image={item.image_url ?? undefined}
        canonicalUrl={published ? publicUrl : undefined}
        noIndex={!published}
        type="article"
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1">
          <Link to="/community-support">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Community Support
          </Link>
        </Button>

        {!published ? (
          <Alert className="mb-6 border-sky-200 bg-sky-50" data-testid="fundraiser-admin-preview">
            <Eye className="h-4 w-4 text-sky-600" aria-hidden />
            <AlertDescription className="text-sm text-sky-900">
              Admin preview — this fundraiser is <strong>{statusLabel(item.status)}</strong> and the
              public cannot reach this page. Approve it to publish and get a shareable link.
            </AlertDescription>
          </Alert>
        ) : null}

        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
          <AlertDescription className="text-amber-800 text-sm">
            {FUNDRAISER_DISCLAIMER}
          </AlertDescription>
        </Alert>

        {item.image_url && (
          <div className="mb-8 max-h-80 overflow-hidden rounded-2xl bg-muted">
            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
          </div>
        )}

        {/* 1 — title and organizer */}
        <header>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{item.category}</Badge>
            <VerificationBadge status={item.verification_status} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
          {organizer ? (
            <p data-testid="fundraiser-organizer" className="mt-2 text-sm text-muted-foreground">
              Organized by {internal ? 'KIGH' : organizer}
            </p>
          ) : null}
          {/* 2 — short summary */}
          {item.summary ? (
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{item.summary}</p>
          ) : null}
        </header>

        <div className="mt-8 space-y-6">
          {/* 3 — progress and goal status */}
          <FundraiserProgressPanel summary={summary} />

          {/* 4 — donation options */}
          <FundraiserDonationOptions fundraiser={item} />

          {/* 5 — share. Withheld until publication: the link would 404 for
              everyone the admin sent it to. */}
          {published ? (
            <FundraiserShareActions
              title={item.title}
              goalAmount={item.goal_amount}
              publicUrl={publicUrl}
            />
          ) : null}
        </div>

        {/* 6 — full details */}
        {item.body ? (
          <div className="prose prose-sm mt-10 max-w-none whitespace-pre-wrap leading-relaxed text-foreground/90">
            {item.body}
          </div>
        ) : null}

        <dl className="mt-8 grid grid-cols-1 gap-4 border-t border-border/60 pt-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">For</dt>
            <dd className="font-medium">{item.beneficiary_name}</dd>
          </div>
          {item.deadline ? (
            <div>
              <dt className="text-muted-foreground">Deadline</dt>
              <dd className="font-medium">{formatDate(item.deadline, 'MMMM d, yyyy')}</dd>
            </div>
          ) : null}
        </dl>

        {/* 7 — collections and last updated */}
        <div className="mt-10">
          <FundraiserCollectionsTable summary={summary} />
        </div>
      </div>
    </>
  )
}
