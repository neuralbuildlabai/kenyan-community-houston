import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock, Pin } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/LoadingSpinner'
import { formatCategoryLabel } from '@/lib/communityCategories'
import { formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Announcement } from '@/lib/types'

export function AnnouncementDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [item, setItem] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()
      setItem(data as Announcement)
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <PageLoader />

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Announcement Not Found</h1>
        <Button asChild><Link to="/announcements">Back to Announcements</Link></Button>
      </div>
    )
  }

  return (
    <>
      <SEOHead title={item.title} description={item.summary} image={item.image_url ?? undefined} type="article" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1">
          <Link to="/announcements"><ArrowLeft className="h-4 w-4" /> All Announcements</Link>
        </Button>

        {item.image_url && (
          <div className="mb-8 rounded-2xl overflow-hidden max-h-72 bg-muted">
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{formatCategoryLabel(item.category)}</Badge>
          {item.is_pinned && <Badge variant="green" className="gap-1"><Pin className="h-3 w-3" /> Pinned</Badge>}
          {item.is_featured && <Badge variant="gold">Featured</Badge>}
        </div>

        <h1 className="text-3xl font-bold mb-3">{item.title}</h1>

        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6 pb-6 border-b">
          <span className="font-medium">{item.author_name}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {item.published_at ? formatDate(item.published_at, 'MMM d, yyyy') : 'Recently posted'}
          </span>
        </div>

        {item.summary && <p className="text-lg text-muted-foreground leading-relaxed mb-6">{item.summary}</p>}

        <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {item.body}
        </div>

        {item.external_url && (
          <div className="mt-8">
            <a
              href={item.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Read more →
            </a>
          </div>
        )}
      </div>
    </>
  )
}
