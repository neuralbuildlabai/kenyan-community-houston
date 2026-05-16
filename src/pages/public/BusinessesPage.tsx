import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Search, ShieldCheck, Sparkles, Users } from 'lucide-react'
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
        subtitle="A growing, community-curated guide to Kenyan-owned and community-friendly businesses across Greater Houston — restaurants, services, professionals, and shops trusted by neighbors."
        primaryAction={
          <Button asChild size="sm">
            <Link to="/businesses/submit">List your business</Link>
          </Button>
        }
        tone="forest"
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
        ) : items.length === 0 && filterIsActive ? (
          <EmptyState
            icon={Building2}
            title="No businesses match those filters"
            description="Try a different category or clear the search box."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('')
                  setCategory('')
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <section
            aria-labelledby="businesses-launch-heading"
            data-testid="businesses-launch-panel"
            className="overflow-hidden rounded-3xl border border-emerald-900/15 bg-gradient-to-br from-emerald-900/[0.06] via-card to-amber-200/[0.18] dark:to-amber-900/10 shadow-sm"
          >
            <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-900/85 dark:text-emerald-300/85">
                  Help build this directory
                </p>
                <h2
                  id="businesses-launch-heading"
                  className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                  A trusted local guide, written by the people who use it
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  This directory will grow as community members submit Kenyan-owned and
                  community-friendly businesses across Greater Houston. Submissions are reviewed by
                  moderators so listings remain accurate, respectful, and useful to neighbors who
                  rely on word of mouth.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/businesses/submit">List a business</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/new-to-houston">Newcomer resources</Link>
                  </Button>
                </div>
              </div>
              <ul className="space-y-4 text-sm text-foreground/85 lg:border-l lg:border-border/60 lg:pl-10">
                <li className="flex gap-3">
                  <Users className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
                  <span>
                    <span className="font-medium text-foreground">Built by the community.</span>{' '}
                    Listings come from members, business owners, and neighbors who know which
                    services have served them well.
                  </span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
                  <span>
                    <span className="font-medium text-foreground">Reviewed submissions.</span>{' '}
                    Moderators check that information is accurate, respectful, and appropriate for
                    a public community directory before it is published.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
                  <span>
                    <span className="font-medium text-foreground">Free to list.</span>{' '}
                    Community-friendly businesses are welcome whether you're a long-running
                    storefront or a newer venture starting out.
                  </span>
                </li>
              </ul>
            </div>
          </section>
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
