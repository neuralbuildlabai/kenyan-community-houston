import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { EditorialBusinessRow } from '@/components/public/EditorialBusinessRow'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PublicSection } from '@/components/public/PublicSection'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { BUSINESS_CATEGORIES } from '@/lib/constants'
import type { Business } from '@/lib/types'

export function BusinessesPage() {
  const [items, setItems] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('businesses')
        .select('*')
        .eq('status', 'published')
        .order('tier', { ascending: false })
        .order('name', { ascending: true })

      if (category) query = query.eq('category', category)
      if (search) query = query.ilike('name', `%${search}%`)

      const { data } = await query
      setItems((data as Business[]) ?? [])
      setLoading(false)
    }
    load()
  }, [search, category])

  const { featured, rest } = useMemo(() => {
    const featuredTiers: ReadonlyArray<string> = ['sponsor', 'featured', 'verified']
    const featuredItems = items.filter((b) => featuredTiers.includes(b.tier))
    const restItems = items.filter((b) => !featuredItems.includes(b))
    return { featured: featuredItems.slice(0, 3), rest: restItems }
  }, [items])

  const filterIsActive = category !== '' || search.trim().length > 0

  return (
    <>
      <SEOHead
        title="Business Directory"
        description="Find Kenyan-owned and community-friendly businesses in Houston."
      />

      <PublicPageHero
        eyebrow="Local guide"
        title="Business directory"
        subtitle="A community-curated guide to Kenyan-owned and community-friendly businesses across Greater Houston."
        primaryAction={
          <Button asChild size="sm">
            <Link to="/businesses/submit">List your business</Link>
          </Button>
        }
        tone="tint"
      />

      <section className="sticky top-16 z-20 border-b border-border/50 bg-background/85 backdrop-blur">
        <div className="public-container py-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search businesses by name…"
              className="h-11 pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search businesses"
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
            {BUSINESS_CATEGORIES.map((cat) => (
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
            ? 'Loading directory…'
            : `${items.length} listing${items.length === 1 ? '' : 's'}`}
        </p>

        {loading ? (
          <PageLoader />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No businesses found"
            description={
              filterIsActive
                ? 'Try a different category or clear the search box.'
                : 'Be the first to list your business — community-friendly businesses are welcome.'
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
              ) : (
                <Button asChild>
                  <Link to="/businesses/submit">List your business</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-12">
            {!filterIsActive && featured.length > 0 ? (
              <section aria-labelledby="businesses-featured-heading">
                <header className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Featured
                  </p>
                  <h2
                    id="businesses-featured-heading"
                    className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    Verified &amp; featured
                  </h2>
                </header>
                <div className="space-y-3">
                  {featured.map((b) => (
                    <EditorialBusinessRow key={b.id} business={b} />
                  ))}
                </div>
              </section>
            ) : null}

            <section aria-labelledby="businesses-list-heading">
              <header className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                    Directory
                  </p>
                  <h2
                    id="businesses-list-heading"
                    className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    {filterIsActive ? 'Matching listings' : 'All listings'}
                  </h2>
                </div>
              </header>
              <div className="space-y-3">
                {(filterIsActive ? items : rest).map((b) => (
                  <EditorialBusinessRow key={b.id} business={b} />
                ))}
              </div>
            </section>
          </div>
        )}
      </PublicSection>
    </>
  )
}
