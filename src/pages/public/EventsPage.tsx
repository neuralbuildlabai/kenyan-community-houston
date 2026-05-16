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
    load()
  }, [search, category])

  const displayedEvents = useMemo(() => {
    const past = events.filter((e) => isEventPast(e.start_date))
    const future = dedupeToNextOccurrenceOnly(events.filter((e) => !isEventPast(e.start_date)))
    return [...past, ...future].sort((a, b) => {
      const d = a.start_date.localeCompare(b.start_date)
      if (d !== 0) return d
      return (a.start_time ?? '').localeCompare(b.start_time ?? '')
    })
  }, [events])

  return (
    <>
      <SEOHead title="Events" description="Find upcoming Kenyan community events in Houston and surrounding areas." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Calmer page header — single heading, no helper paragraph,
            primary action (Submit) lives in the same row. */}
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

        {/* Filters — one search input + a single horizontal chip row. */}
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
            : `${displayedEvents.length} event${displayedEvents.length !== 1 ? 's' : ''}`}
        </p>

        {loading ? (
          <PageLoader />
        ) : displayedEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events found"
            description="Try adjusting your search or check back soon for new events."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedEvents.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </>
  )
}
