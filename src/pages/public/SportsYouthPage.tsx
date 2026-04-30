import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { SportsCard } from '@/components/SportsCard'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { SPORTS_CATEGORIES } from '@/lib/constants'
import type { SportsPost } from '@/lib/types'

export function SportsYouthPage() {
  const [items, setItems] = useState<SportsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('sports_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (category) query = query.eq('category', category)
      if (search) query = query.ilike('title', `%${search}%`)

      const { data } = await query
      setItems((data as SportsPost[]) ?? [])
      setLoading(false)
    }
    load()
  }, [search, category])

  return (
    <>
      <SEOHead title="Sports & Youth" description="Sports news, youth programs, and community athletics from the Kenyan community in Houston." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sports & Youth</h1>
          <p className="text-muted-foreground">Athletics, youth programs, and sports news from the community</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={category === '' ? 'default' : 'outline'} size="sm" onClick={() => setCategory('')}>All</Button>
            {SPORTS_CATEGORIES.map((cat) => (
              <Button key={cat} variant={category === cat ? 'default' : 'outline'} size="sm" onClick={() => setCategory(cat)}>{cat}</Button>
            ))}
          </div>
        </div>

        {loading ? <PageLoader /> : items.length === 0 ? (
          <EmptyState icon={Trophy} title="No posts found" description="Check back for sports news and youth program updates." />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => <SportsCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </>
  )
}
