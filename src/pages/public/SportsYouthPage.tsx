import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Search, Dribbble, Users2, Flag, ArrowUpRight } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { SportsCard } from '@/components/SportsCard'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PublicSection } from '@/components/public/PublicSection'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { SPORTS_CATEGORIES, PUBLIC_CONTACT_EMAIL } from '@/lib/constants'
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

  const filterIsActive = category !== '' || search.trim().length > 0

  const { featured, rest } = useMemo(() => {
    if (filterIsActive || items.length === 0) {
      return { featured: null as SportsPost | null, rest: items }
    }
    const top = items[0] ?? null
    return { featured: top, rest: top ? items.slice(1) : items }
  }, [items, filterIsActive])

  return (
    <>
      <SEOHead
        title="Sports & Youth"
        description="Sports news, youth programs, and community athletics from the Kenyan community in Houston."
      />

      <PublicPageHero
        eyebrow="Active &amp; future-facing"
        title="Sports &amp; youth"
        subtitle="Athletics, youth development, and family-friendly community activities. Updates from teams, coaches, and parents across Greater Houston."
        primaryAction={
          <Button asChild size="sm">
            <a href={`mailto:${PUBLIC_CONTACT_EMAIL}?subject=Sports%20%26%20Youth%20update`}>
              Submit an update
            </a>
          </Button>
        }
        tone="tint"
      />

      <PublicSection className="!py-10 sm:!py-12 lg:!py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            {/* Filter toolbar */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search updates…"
                  className="h-11 pl-9 bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search sports and youth updates"
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
                {SPORTS_CATEGORIES.map((cat) => (
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

            {/* Featured update */}
            {featured ? (
              <section aria-labelledby="sports-featured-heading">
                <header className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Featured update
                  </p>
                  <h2
                    id="sports-featured-heading"
                    className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    On the field this week
                  </h2>
                </header>
                <SportsCard post={featured} />
              </section>
            ) : null}

            {/* Updates list */}
            <section aria-labelledby="sports-updates-heading">
              <header className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                    Updates
                  </p>
                  <h2
                    id="sports-updates-heading"
                    className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                  >
                    {filterIsActive ? 'Matching updates' : 'Latest updates'}
                  </h2>
                </div>
              </header>

              {loading ? (
                <PageLoader />
              ) : rest.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title={featured ? 'No additional updates yet' : 'No updates yet'}
                  description={
                    filterIsActive
                      ? 'Try a different category or clear the search.'
                      : 'Check back for sports news and youth program updates.'
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
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {rest.map((p) => (
                    <SportsCard key={p.id} post={p} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Program areas
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                What we support
              </h2>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <Dribbble className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Adult leagues:</span> soccer,
                    basketball, and tournament play across Houston.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Users2 className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Youth programs:</span> mentorship,
                    skills clinics, and family-friendly community days.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Flag className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Cultural sports:</span> Track and
                    field, athletics, and Kenya Day celebrations.
                  </span>
                </li>
              </ul>
              <Button asChild size="sm" className="mt-5">
                <Link to="/contact">
                  Get in touch <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 text-sm text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">Have an update to share?</p>
              <p>
                Coaches, captains, and parents — send team news, scores, or upcoming youth
                activities to the KIGH team.
              </p>
              <p className="mt-3">
                <a
                  href={`mailto:${PUBLIC_CONTACT_EMAIL}?subject=Sports%20%26%20Youth%20update`}
                  className="link-editorial"
                >
                  Email {PUBLIC_CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </aside>
        </div>
      </PublicSection>
    </>
  )
}
