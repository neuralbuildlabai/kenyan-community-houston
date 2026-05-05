import { useEffect, useState } from 'react'
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

  return (
    <>
      <SEOHead title="Events" description="Find upcoming Kenyan community events in Houston and surrounding areas." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Community Events</h1>
          <p className="text-muted-foreground">Upcoming events from the Kenyan community in Houston</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={category === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory('')}
            >
              All
            </Button>
            {EVENT_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''} found`}
          </p>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button asChild size="sm" variant="outline">
              <Link to="/calendar">Community calendar</Link>
            </Button>
            <Button asChild size="sm" variant="default">
              <Link to="/events/submit">Submit an Event</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events found"
            description="Try adjusting your search or check back soon for new events."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </>
  )
}
