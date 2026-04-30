import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { SportsPost } from '@/lib/types'

export function SportsDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [item, setItem] = useState<SportsPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('sports_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()
      setItem(data as SportsPost)
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <PageLoader />
  if (!item) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-3">Post Not Found</h1>
      <Button asChild><Link to="/sports-youth">Back to Sports & Youth</Link></Button>
    </div>
  )

  return (
    <>
      <SEOHead title={item.title} description={item.summary} image={item.image_url ?? undefined} type="article" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1">
          <Link to="/sports-youth"><ArrowLeft className="h-4 w-4" /> Sports & Youth</Link>
        </Button>
        {item.image_url && (
          <div className="mb-8 rounded-2xl overflow-hidden max-h-72 bg-muted">
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="secondary">{item.category}</Badge>
          {item.sport && <Badge variant="outline">{item.sport}</Badge>}
        </div>
        <h1 className="text-3xl font-bold mb-3">{item.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6 pb-6 border-b">
          <span className="font-medium">{item.author_name}</span>
          {item.published_at && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />{formatDate(item.published_at, 'MMM d, yyyy')}
              </span>
            </>
          )}
        </div>
        {item.summary && <p className="text-lg text-muted-foreground leading-relaxed mb-4">{item.summary}</p>}
        <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">{item.body}</div>
      </div>
    </>
  )
}
