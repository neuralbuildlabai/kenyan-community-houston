import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { AnnouncementCard } from '@/components/AnnouncementCard'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { ANNOUNCEMENT_CATEGORIES } from '@/lib/constants'
import type { Announcement } from '@/lib/types'

export function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('status', 'published')
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false })

      if (category) query = query.eq('category', category)
      if (search) query = query.ilike('title', `%${search}%`)

      const { data } = await query
      setItems((data as Announcement[]) ?? [])
      setLoading(false)
    }
    load()
  }, [search, category])

  return (
    <>
      <SEOHead title="Announcements" description="Community news, updates, and important announcements from the Kenyan community in Houston." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Announcements</h1>
          <p className="text-muted-foreground">Stay up to date with community news and updates</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search announcements…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={category === '' ? 'default' : 'outline'} size="sm" onClick={() => setCategory('')}>All</Button>
            {ANNOUNCEMENT_CATEGORIES.map((cat) => (
              <Button key={cat} variant={category === cat ? 'default' : 'outline'} size="sm" onClick={() => setCategory(cat)}>{cat}</Button>
            ))}
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{loading ? 'Loading…' : `${items.length} announcement${items.length !== 1 ? 's' : ''}`}</p>
          <Button asChild size="sm"><Link to="/submit/announcement">Submit Announcement</Link></Button>
        </div>

        {loading ? <PageLoader /> : items.length === 0 ? (
          <EmptyState icon={Megaphone} title="No announcements found" description="Check back soon for community updates." />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
          </div>
        )}
      </div>
    </>
  )
}
