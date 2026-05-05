import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Globe, ArrowLeft, Building2 } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { TierBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import type { Business } from '@/lib/types'
import { MapLink } from '@/components/MapLink'
import { trackClick, trackEntityView } from '@/lib/analytics'
import { safeExternalHref, prettyExternalLabel } from '@/lib/externalUrl'

export function BusinessDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [item, setItem] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setItem(null)
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()
      setItem(data as Business)
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (!item?.id) return
    void trackEntityView('businesses', item.id, item.name, `/businesses/${item.slug}`)
  }, [item?.id, item?.slug, item?.name])

  if (loading) return <PageLoader />

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Business Not Found</h1>
        <Button asChild><Link to="/businesses">Back to Directory</Link></Button>
      </div>
    )
  }

  return (
    <>
      <SEOHead title={item.name} description={item.description} image={item.logo_url ?? undefined} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1">
          <Link to="/businesses"><ArrowLeft className="h-4 w-4" /> Business Directory</Link>
        </Button>

        <div className="flex items-start gap-5 mb-6">
          <div className="h-20 w-20 shrink-0 rounded-2xl border bg-muted overflow-hidden flex items-center justify-center">
            {item.logo_url ? (
              <img src={item.logo_url} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-9 w-9 text-muted-foreground/40" />
            )}
          </div>
          <div>
            <div className="mb-2 flex flex-wrap gap-2 items-center">
              <TierBadge tier={item.tier} />
              <Badge variant="secondary">{item.category}</Badge>
            </div>
            <h1 className="text-3xl font-bold">{item.name}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>

            {item.services && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Services</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.services}</p>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border p-5 space-y-3 bg-muted/30">
              {(item.address || item.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground space-y-1.5">
                    {item.address && <div>{item.address}</div>}
                    <div>{[item.city, item.state, item.zip].filter(Boolean).join(', ')}</div>
                    <MapLink
                      address={[item.address, item.city, item.state, item.zip].filter(Boolean).join(', ')}
                      location={item.name}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
              {item.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <a href={`tel:${item.phone}`} className="text-sm text-muted-foreground hover:text-foreground">{item.phone}</a>
                </div>
              )}
              {item.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a href={`mailto:${item.email}`} className="text-sm text-muted-foreground hover:text-foreground">{item.email}</a>
                </div>
              )}
              {safeExternalHref(item.website) && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-primary shrink-0" />
                  <a
                    href={safeExternalHref(item.website)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate"
                    onClick={() => void trackClick('business_website', `/businesses/${item.slug}`, { business_id: item.id })}
                  >
                    {prettyExternalLabel(item.website)}
                  </a>
                </div>
              )}
            </div>

            {safeExternalHref(item.website) && (
              <Button asChild className="w-full gap-2">
                <a href={safeExternalHref(item.website)!} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" /> Visit Website
                </a>
              </Button>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
