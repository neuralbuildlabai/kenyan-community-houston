import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Tag, ExternalLink, ArrowLeft, Ticket } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/LoadingSpinner'
import { formatDate, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()
      setEvent(data as Event)
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <PageLoader />

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Event Not Found</h1>
        <p className="text-muted-foreground mb-6">This event may have been removed or is no longer available.</p>
        <Button asChild><Link to="/events">Browse Events</Link></Button>
      </div>
    )
  }

  return (
    <>
      <SEOHead
        title={event.title}
        description={event.description?.slice(0, 160)}
        image={event.flyer_url ?? undefined}
        type="article"
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1">
          <Link to="/events"><ArrowLeft className="h-4 w-4" /> All Events</Link>
        </Button>

        {/* Flyer */}
        {event.flyer_url && (
          <div className="mb-8 rounded-2xl overflow-hidden max-h-96 bg-muted">
            <img src={event.flyer_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{event.category}</Badge>
              {event.is_featured && <Badge variant="gold" className="gap-1">⭐ Featured</Badge>}
              {event.is_free && <Badge variant="success">Free Event</Badge>}
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4">{event.title}</h1>

            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap mb-6">{event.description}</p>

            {event.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {event.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2 py-0.5">
                    <Tag className="h-3 w-3" />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar details */}
          <aside className="space-y-4">
            <div className="rounded-xl border p-5 space-y-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Date</div>
                  <div className="text-sm text-muted-foreground">{formatDate(event.start_date, 'EEEE, MMMM d, yyyy')}</div>
                  {event.end_date && (
                    <div className="text-sm text-muted-foreground">to {formatDate(event.end_date, 'MMMM d, yyyy')}</div>
                  )}
                </div>
              </div>

              {event.start_time && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Time</div>
                    <div className="text-sm text-muted-foreground">{event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Location</div>
                  <div className="text-sm text-muted-foreground">{event.location}</div>
                  {event.address && <div className="text-xs text-muted-foreground">{event.address}</div>}
                </div>
              </div>

              {!event.is_free && event.ticket_price && (
                <div className="flex items-start gap-3">
                  <Ticket className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Admission</div>
                    <div className="text-sm text-muted-foreground">{formatCurrency(event.ticket_price)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {event.ticket_url && (
                <Button asChild className="w-full gap-2">
                  <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                    <Ticket className="h-4 w-4" /> Get Tickets
                  </a>
                </Button>
              )}
              {event.organizer_website && (
                <Button asChild variant="outline" className="w-full gap-2">
                  <a href={event.organizer_website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Organizer Website
                  </a>
                </Button>
              )}
            </div>

            {event.organizer_name && (
              <div className="text-xs text-muted-foreground">
                Organized by <strong>{event.organizer_name}</strong>
                {event.organizer_contact && <span> · {event.organizer_contact}</span>}
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
