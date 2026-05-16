import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { EventCard } from '@/components/EventCard'
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

  const { upcoming, past } = useMemo(() => {
    const upcomingRows = events.filter((e) => !isEventPast(e.start_date))
    const pastRows = events.filter((e) => isEventPast(e.start_date))
    const upcomingSorted = dedupeToNextOccurrenceOnly(upcomingRows).sort(compareOccurrence)
    const pastSorted = [...pastRows].sort((a, b) => {
      const d = b.start_date.localeCompare(a.start_date)
      if (d !== 0) return d
      return (b.start_time ?? '').localeCompare(a.start_time ?? '')
    })
    return { upcoming: upcomingSorted, past: pastSorted }
  }, [events])

  return (
    <>
      <SEOHead title="Events" description="Find upcoming Kenyan community events in Houston and surrounding areas." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Community events
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Upcoming gatherings across Greater Houston.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="ghost" className="text-primary">
              <Link to="/calendar">Calendar view</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/events/submit">Submit an event</Link>
            </Button>
          </div>
        </div>

        <div className="mb-8 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events…"
              className="h-11 pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={category === '' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setCategory('')}
            >
              All
            </Button>
            {EVENT_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          {loading
            ? 'Loading…'
            : `${upcoming.length} upcoming · ${past.length} past`}
        </p>

        {loading ? (
          <PageLoader />
        ) : upcoming.length === 0 && past.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events found"
            description="Try adjusting your search or check back soon for new events."
          />
        ) : (
          <div className="space-y-14">
            <section aria-labelledby="events-upcoming-heading">
              <h2
                id="events-upcoming-heading"
                className="mb-5 text-lg font-semibold tracking-tight text-foreground"
              >
                Upcoming events
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming events match your filters.{' '}
                  <Link to="/calendar" className="font-medium text-primary underline-offset-4 hover:underline">
                    View the full calendar
                  </Link>
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              )}
            </section>

            {past.length > 0 ? (
              <section
                aria-labelledby="events-past-heading"
                className="border-t border-border/60 pt-12"
              >
                <h2
                  id="events-past-heading"
                  className="mb-2 text-lg font-semibold tracking-tight text-muted-foreground"
                >
                  Past events
                </h2>
                <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
                  Archive of completed gatherings. Volunteer signups and RSVPs are closed for these dates.
                </p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((e) => (
                    <EventCard key={e.id} event={e} presentation="archive" />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}
