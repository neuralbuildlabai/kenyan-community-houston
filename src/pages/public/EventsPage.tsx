import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { EditorialEventRow } from '@/components/public/EditorialEventRow'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PublicSection } from '@/components/public/PublicSection'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { EVENT_CATEGORIES, categoryValuesMatchingCanonical } from '@/lib/constants'
import type { Event } from '@/lib/types'
import { isEventPast } from '@/lib/eventDate'
import { dedupeToNextOccurrenceOnly } from '@/lib/eventRecurrencePublic'

function compareOccurrence(a: Event, b: Event): number {
  const d = a.start_date.localeCompare(b.start_date)
  if (d !== 0) return d
  return (a.start_time ?? '').localeCompare(b.start_time ?? '')
}

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('start_date', { ascending: true })

      if (category) query = query.in('category', categoryValuesMatchingCanonical(category))
      if (search) query = query.ilike('title', `%${search}%`)

      const { data } = await query
      setEvents((data as Event[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [search, category])

  const { featured, upcoming, past } = useMemo(() => {
    const upcomingRows = events.filter((e) => !isEventPast(e.start_date))
    const pastRows = events.filter((e) => isEventPast(e.start_date))
    const upcomingSorted = dedupeToNextOccurrenceOnly(upcomingRows).sort(compareOccurrence)
    const pastSorted = [...pastRows].sort((a, b) => {
      const d = b.start_date.localeCompare(a.start_date)
      if (d !== 0) return d
      return (b.start_time ?? '').localeCompare(a.start_time ?? '')
    })
    // Pick the next featured event if available, otherwise the soonest upcoming.
    const featuredCandidate =
      upcomingSorted.find((e) => e.is_featured) ?? upcomingSorted[0] ?? null
    return {
      featured: featuredCandidate,
      upcoming: featuredCandidate
        ? upcomingSorted.filter((e) => e.id !== featuredCandidate.id)
        : upcomingSorted,
      past: pastSorted,
    }
  }, [events])

  const totalCount = upcoming.length + (featured ? 1 : 0)
  const filterIsActive = category !== '' || search.trim().length > 0

  return (
    <>
      <SEOHead title="Events" description="Find upcoming Kenyan community events in Houston and surrounding areas." />

      <PublicPageHero
        eyebrow="Community calendar"
        title="Events"
        subtitle="Cultural celebrations, faith gatherings, fundraisers, youth and family programs, and community moments hosted across Greater Houston. Open to the public — please respect each host's instructions."
        primaryAction={
          <Button asChild size="sm">
            <Link to="/events/submit">Submit an event</Link>
          </Button>
        }
        secondaryAction={
          <Button asChild size="sm" variant="outline">
            <Link to="/calendar">View calendar</Link>
          </Button>
        }
        tone="tint"
      />

      {/* Filter toolbar */}
      <section className="sticky top-16 z-20 border-b border-border/50 bg-background/85 backdrop-blur">
        <div className="public-container py-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events by title…"
              className="h-11 pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search events"
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
            {EVENT_CATEGORIES.map((cat) => (
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
            ? 'Loading events…'
            : `${totalCount} upcoming · ${past.length} past`}
        </p>

        {loading ? (
          <PageLoader />
        ) : !featured && upcoming.length === 0 && past.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events found"
            description={
              filterIsActive
                ? 'Try a different category or clear the search box.'
                : 'Check back soon — new events are added as the community submits them.'
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
                  <Link to="/events/submit">Submit the first event</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-14">
            {/* Featured + Upcoming */}
            {featured || upcoming.length > 0 ? (
              <section aria-labelledby="events-upcoming-heading">
                <header className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                      Coming up
                    </p>
                    <h2
                      id="events-upcoming-heading"
                      className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                    >
                      Upcoming events
                    </h2>
                  </div>
                </header>

                {featured ? (
                  <div className="mb-6">
                    <EditorialEventRow event={featured} presentation="featured" />
                  </div>
                ) : null}

                {upcoming.length > 0 ? (
                  <div className="space-y-3">
                    {upcoming.map((e) => (
                      <EditorialEventRow key={e.id} event={e} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No additional upcoming events match these filters.{' '}
                    <Link to="/calendar" className="link-editorial">
                      View the full calendar
                    </Link>
                    .
                  </p>
                )}
              </section>
            ) : null}

            {/* Past archive */}
            {past.length > 0 ? (
              <section
                aria-labelledby="events-past-heading"
                className="border-t border-border/50 pt-10"
              >
                <header className="mb-5 max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                    Archive
                  </p>
                  <h2
                    id="events-past-heading"
                    className="mt-1 text-xl font-semibold tracking-tight text-muted-foreground"
                  >
                    Past events
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground/90">
                    Completed gatherings. RSVPs and volunteer signups are closed for these dates.
                  </p>
                </header>
                <div className="space-y-2.5">
                  {past.slice(0, 12).map((e) => (
                    <EditorialEventRow key={e.id} event={e} presentation="archive" />
                  ))}
                </div>
                {past.length > 12 ? (
                  <p className="mt-5 text-xs text-muted-foreground">
                    Showing the most recent 12 of {past.length} past events.
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        )}
      </PublicSection>
    </>
  )
}
