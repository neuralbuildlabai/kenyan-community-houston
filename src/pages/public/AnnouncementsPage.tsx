import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { EditorialAnnouncementRow } from '@/components/public/EditorialAnnouncementRow'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PublicSection } from '@/components/public/PublicSection'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { ANNOUNCEMENT_CATEGORIES, categoryValuesMatchingCanonical } from '@/lib/constants'
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

      if (category) query = query.in('category', categoryValuesMatchingCanonical(category))
      if (search) query = query.ilike('title', `%${search}%`)

      const { data } = await query
      setItems((data as Announcement[]) ?? [])
      setLoading(false)
    }
    load()
  }, [search, category])

  const filterIsActive = category !== '' || search.trim().length > 0

  const { featured, rest } = useMemo(() => {
    if (filterIsActive || items.length === 0) {
      return { featured: null as Announcement | null, rest: items }
    }
    const pinnedOrFeatured =
      items.find((a) => a.is_pinned) ??
      items.find((a) => a.is_featured) ??
      items[0] ??
      null
    return {
      featured: pinnedOrFeatured,
      rest: pinnedOrFeatured ? items.filter((a) => a.id !== pinnedOrFeatured.id) : items,
    }
  }, [items, filterIsActive])

  return (
    <>
      <SEOHead
        title="Announcements"
        description="Community news, updates, and important announcements from the Kenyan community in Houston."
      />

      <PublicPageHero
        eyebrow="Community news"
        title="Announcements"
        subtitle="Official updates, community notices, and important news from Kenyan Community Houston."
        primaryAction={
          <Button asChild size="sm">
            <Link to="/announcements/submit">Submit an announcement</Link>
          </Button>
        }
        tone="default"
      />

      <section className="sticky top-16 z-20 border-b border-border/50 bg-background/85 backdrop-blur">
        <div className="public-container py-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements…"
              className="h-11 pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search announcements"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
            <Button
              variant={category === '' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full h-8 px-3.5"
              onClick={() => setCategory('')}
              role="tab"
              aria-selected={category === ''}
            >
              All
            </Button>
            {ANNOUNCEMENT_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                size="sm"
                className="rounded-full h-8 px-3.5"
                onClick={() => setCategory(cat)}
                role="tab"
                aria-selected={category === cat}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <PublicSection className="!py-10 sm:!py-12 lg:!py-14">
        <p className="mb-6 text-sm text-muted-foreground">
          {loading
            ? 'Loading announcements…'
            : `${items.length} announcement${items.length === 1 ? '' : 's'}`}
        </p>

        {loading ? (
          <PageLoader />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements found"
            description={
              filterIsActive
                ? 'Try a different category or clear the search box.'
                : 'Check back soon for community updates.'
            }
            action={
              filterIsActive ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('')
                    setCategory('')
                  }}
                >
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="space-y-10">
            {featured ? (
              <section aria-labelledby="announcements-latest-heading">
                <header className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Latest
                  </p>
                  <h2
                    id="announcements-latest-heading"
                    className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    Featured announcement
                  </h2>
                </header>
                <EditorialAnnouncementRow announcement={featured} presentation="featured" />
              </section>
            ) : null}

            <section aria-labelledby="announcements-rest-heading">
              <header className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                  Updates
                </p>
                <h2
                  id="announcements-rest-heading"
                  className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                  {filterIsActive ? 'Matching announcements' : 'More from the community'}
                </h2>
              </header>
              <div className="space-y-3">
                {rest.map((a) => (
                  <EditorialAnnouncementRow key={a.id} announcement={a} />
                ))}
              </div>
            </section>
          </div>
        )}
      </PublicSection>
    </>
  )
}
