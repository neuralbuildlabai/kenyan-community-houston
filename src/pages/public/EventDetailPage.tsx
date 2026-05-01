import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Tag, ExternalLink, ArrowLeft, Ticket, Video, FileText } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/LoadingSpinner'
import { formatDate, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Event, Resource } from '@/lib/types'
import { isEventPast } from '@/lib/eventDate'

function resourceHref(r: Resource): string | null {
  if (r.external_url) return r.external_url
  if (r.file_url) return encodeURI(r.file_url)
  return null
}

/** Apr 24 session materials: consistent order on event detail. */
function sortRelatedResources(rows: Resource[]): Resource[] {
  const order = ['kigh-financial-literacy', 'hr-benefits-joyce-marendes', 'tax-presentation-04-24-2026']
  return [...rows].sort((a, b) => {
    const ia = order.indexOf(a.slug)
    const ib = order.indexOf(b.slug)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    return a.title.localeCompare(b.title)
  })
}

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [relatedResources, setRelatedResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()
      const ev = data as Event | null
      setEvent(ev)
      if (ev?.id) {
        const { data: res } = await supabase
          .from('resources')
          .select('id, title, slug, file_type, file_url, external_url, status, access_level')
          .eq('related_event_id', ev.id)
          .eq('status', 'published')
          .eq('access_level', 'public')
        setRelatedResources(sortRelatedResources((res as Resource[]) ?? []))
      } else {
        setRelatedResources([])
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <PageLoader />

  const past = event ? isEventPast(event.start_date) : false

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
        image={(event.image_url || event.flyer_url) ?? undefined}
        type="article"
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-1">
          <Link to="/events"><ArrowLeft className="h-4 w-4" /> All Events</Link>
        </Button>

        {(event.image_url || event.flyer_url) && (
          <div className="mb-8 rounded-2xl overflow-hidden max-h-96 bg-muted">
            <img
              src={event.image_url || event.flyer_url || ''}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{event.category}</Badge>
              {past ? <Badge variant="muted">Past event</Badge> : null}
              {event.is_virtual ? (
                <Badge variant="outline" className="gap-1 border-primary/40">
                  <Video className="h-3.5 w-3.5" /> Virtual / Online
                </Badge>
              ) : null}
              {event.is_featured && <Badge variant="gold" className="gap-1">⭐ Featured</Badge>}
              {event.is_free && <Badge variant="success">Free Event</Badge>}
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4">{event.title}</h1>

            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap mb-6">{event.description}</p>

            {relatedResources.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-muted/20 p-5 mb-6 space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Related materials
                </h2>
                <ul className="space-y-2">
                  {relatedResources.map((r) => {
                    const href = resourceHref(r)
                    if (!href) return null
                    return (
                      <li key={r.id}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-flex items-center gap-1.5"
                        >
                          {r.title}
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        </a>
                        {r.file_type ? (
                          <span className="text-xs text-muted-foreground ml-2">({r.file_type})</span>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

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
                  <div className="font-medium text-sm">{event.is_virtual ? 'Format' : 'Location'}</div>
                  <div className="text-sm text-muted-foreground">
                    {event.is_virtual ? 'Virtual / Online' : event.location}
                  </div>
                  {!event.is_virtual && event.address && (
                    <div className="text-xs text-muted-foreground">{event.address}</div>
                  )}
                  {event.timezone && (
                    <div className="text-xs text-muted-foreground mt-1">Timezone: {event.timezone}</div>
                  )}
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
              {event.is_virtual && event.virtual_url && (
                <Button asChild className="w-full gap-2">
                  <a href={event.virtual_url} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4" /> Join online
                  </a>
                </Button>
              )}
              {event.registration_url && (
                <Button asChild variant="secondary" className="w-full gap-2">
                  <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Register / RSVP
                  </a>
                </Button>
              )}
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
