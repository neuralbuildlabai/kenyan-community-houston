import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, ExternalLink } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { VerificationBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageLoader } from '@/components/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FUNDRAISER_DISCLAIMER } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Fundraiser } from '@/lib/types'
import { trackClick, trackEntityView } from '@/lib/analytics'

export function FundraiserDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [item, setItem] = useState<Fundraiser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setItem(null)
      const { data } = await supabase
        .from('fundraisers')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()
      setItem(data as Fundraiser)
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (!item?.id) return
    void trackEntityView('fundraisers', item.id, item.title, `/community-support/${item.slug}`)
  }, [item?.id, item?.slug, item?.title])

  if (loading) return <PageLoader />

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Fundraiser Not Found</h1>
        <Button asChild><Link to="/community-support">Back to Community Support</Link></Button>
      </div>
    )
  }

  const progress = item.goal_amount ? Math.min((item.raised_amount / item.goal_amount) * 100, 100) : null

  return (
    <>
      <SEOHead title={item.title} description={item.summary} image={item.image_url ?? undefined} type="article" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1">
          <Link to="/community-support"><ArrowLeft className="h-4 w-4" /> Community Support</Link>
        </Button>

        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">{FUNDRAISER_DISCLAIMER}</AlertDescription>
        </Alert>

        {item.image_url && (
          <div className="mb-8 rounded-2xl overflow-hidden max-h-80 bg-muted">
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{item.category}</Badge>
              <VerificationBadge status={item.verification_status} />
            </div>
            <h1 className="text-3xl font-bold mb-4">{item.title}</h1>
            {item.summary && <p className="text-lg text-muted-foreground mb-4">{item.summary}</p>}
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {item.body}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border p-5 bg-muted/30 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">For</div>
                <div className="font-semibold">{item.beneficiary_name}</div>
              </div>

              {item.goal_amount && (
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{formatCurrency(item.raised_amount)} raised</span>
                    <span className="text-muted-foreground">of {formatCurrency(item.goal_amount)}</span>
                  </div>
                  <Progress value={progress ?? 0} className="h-2.5" />
                  <div className="text-xs text-muted-foreground mt-1">{Math.round(progress ?? 0)}% of goal</div>
                </div>
              )}

              {item.deadline && (
                <div>
                  <div className="text-sm text-muted-foreground">Deadline</div>
                  <div className="text-sm font-medium">{formatDate(item.deadline, 'MMMM d, yyyy')}</div>
                </div>
              )}

              {item.organizer_name && (
                <div>
                  <div className="text-sm text-muted-foreground">Organized by</div>
                  <div className="text-sm font-medium">{item.organizer_name}</div>
                </div>
              )}
            </div>

            {item.donation_url && (
              <Button asChild className="w-full gap-2">
                <a
                  href={item.donation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void trackClick('fundraiser_donate', `/community-support/${item.slug}`, { fundraiser_id: item.id })}
                >
                  <ExternalLink className="h-4 w-4" /> Donate / Support
                </a>
              </Button>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
