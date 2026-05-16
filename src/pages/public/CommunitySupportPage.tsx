import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  Search,
  AlertTriangle,
  HeartHandshake,
  PhoneCall,
  HelpingHand,
  ArrowUpRight,
} from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { FundraiserCard } from '@/components/FundraiserCard'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PublicSection } from '@/components/public/PublicSection'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import {
  FUNDRAISER_CATEGORIES,
  FUNDRAISER_DISCLAIMER,
  PUBLIC_CONTACT_EMAIL,
} from '@/lib/constants'
import type { Fundraiser } from '@/lib/types'

export function CommunitySupportPage() {
  const [items, setItems] = useState<Fundraiser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('fundraisers')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (category) query = query.eq('category', category)
      if (search) query = query.ilike('title', `%${search}%`)

      const { data } = await query
      setItems((data as Fundraiser[]) ?? [])
      setLoading(false)
    }
    load()
  }, [search, category])

  const filterIsActive = category !== '' || search.trim().length > 0

  return (
    <>
      <SEOHead
        title="Community Support"
        description="Community support updates, volunteer opportunities, and ways to request help from the Kenyan community in Houston."
      />

      <PublicPageHero
        eyebrow="Standing with neighbors"
        title="Community support"
        subtitle="Welfare check-ins, volunteer coordination, and updates from families the community is rallying around. A place to ask for help when you need it and to lend a hand when you can."
        primaryAction={
          <Button asChild size="sm">
            <Link to="/community-support/submit">Submit a support update</Link>
          </Button>
        }
        secondaryAction={
          <Button asChild size="sm" variant="outline">
            <Link to="/serve">Volunteer with KIGH</Link>
          </Button>
        }
        tone="amber"
      />

      <PublicSection className="!py-10 sm:!py-12 lg:!py-14">
        <Alert className="mb-10 border-amber-200/80 bg-amber-50/70">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm leading-relaxed text-amber-900">
            {FUNDRAISER_DISCLAIMER}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <section className="lg:col-span-2" aria-labelledby="support-updates-heading">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Current updates
                </p>
                <h2
                  id="support-updates-heading"
                  className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                  Support updates
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Listings shared with the community. KIGH reviews submissions but cannot verify
                  every detail — please reach out directly to the families involved.
                </p>
              </div>
            </header>

            <div className="mb-6 space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search support updates…"
                  className="h-11 pl-9 bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search community support updates"
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
                {FUNDRAISER_CATEGORIES.map((cat) => (
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

            <p className="mb-5 text-sm text-muted-foreground">
              {loading
                ? 'Loading…'
                : `${items.length} update${items.length === 1 ? '' : 's'}`}
            </p>

            {loading ? (
              <PageLoader />
            ) : items.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No updates listed"
                description={
                  filterIsActive
                    ? 'Try a different category or clear the search.'
                    : 'Check back soon, or submit a community support update.'
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
                      <Link to="/community-support/submit">Submit a support update</Link>
                    </Button>
                  )
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {items.map((f) => (
                  <FundraiserCard key={f.id} fundraiser={f} />
                ))}
              </div>
            )}
          </section>

          {/* Sidebar: How to help / ask */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Get involved
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                Volunteer opportunities
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Lend a hand — visit a family, drive a meal train, sit with neighbors during hospital
                stays, or help organize a community gathering.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <HeartHandshake className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Welfare team:</span> meals, rides,
                    and check-ins for families.
                  </span>
                </li>
                <li className="flex gap-3">
                  <HelpingHand className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Newcomer support:</span> help new
                    arrivals settle in Houston.
                  </span>
                </li>
                <li className="flex gap-3">
                  <PhoneCall className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Hospital &amp; bereavement:</span>{' '}
                    coordinate community presence during difficult moments.
                  </span>
                </li>
              </ul>
              <Button asChild size="sm" className="mt-5 w-full sm:w-auto">
                <Link to="/serve/apply">
                  Sign up to serve <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Need support?
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                How to request help
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                If you or someone you know is going through a hard season, reach out. We can
                coordinate community support, share your update, or connect you with the right
                volunteer team.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/community-support/submit" className="link-editorial">
                    Submit a support update
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="link-editorial">
                    Contact community leadership
                  </Link>
                </li>
                <li>
                  <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="link-editorial">
                    Email {PUBLIC_CONTACT_EMAIL}
                  </a>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 text-xs text-muted-foreground leading-relaxed">
              <p>
                Kenyan Community Houston is a registered 501(c)(3) nonprofit organization serving
                Kenyans and friends of Kenya across the Houston area.
              </p>
            </div>
          </aside>
        </div>
      </PublicSection>
    </>
  )
}
