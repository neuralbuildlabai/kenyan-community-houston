import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar as CalIcon, MapPin, Video, ExternalLink, Download, CalendarDays } from 'lucide-react'
import { parseISO } from 'date-fns'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { CALENDAR_FILTER_CATEGORIES } from '@/lib/constants'
import { canonicalCategory, formatCategoryLabel } from '@/lib/communityCategories'
import { formatDate, formatDateShort } from '@/lib/utils'
import { buildEventIcs, googleCalendarUrl } from '@/lib/calendarLinks'
import type { Event } from '@/lib/types'
import { PageLoader } from '@/components/LoadingSpinner'
import { isEventPast } from '@/lib/eventDate'

export function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [tab, setTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('start_date', { ascending: true })
      setEvents((data as Event[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let list = events
    if (category) list = list.filter((e) => canonicalCategory(e.category) === category)
    if (tab === 'upcoming') {
      list = list.filter((e) => !isEventPast(e.start_date))
    } else if (tab === 'past') {
      list = list.filter((e) => isEventPast(e.start_date))
      list = [...list].sort((a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime())
    } else {
      list = [...list].sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())
    }
    return list
  }, [events, category, tab])

  function downloadIcs(ev: Event) {
    const ics = buildEventIcs({
      title: ev.title,
      description: ev.short_description || ev.description || '',
      location: ev.is_virtual ? 'Virtual / Online' : [ev.location, ev.address].filter(Boolean).join(' — '),
      startDate: ev.start_date,
      startTime: ev.start_time,
      endTime: ev.end_time,
      url: ev.registration_url || ev.ticket_url || undefined,
    })
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ev.slug || 'event'}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <SEOHead
        title="Community calendar"
        description="Live KIGH community calendar — upcoming cultural, youth, sports, and community events."
      />

      <div className="border-b bg-gradient-to-br from-primary/[0.08] via-background to-muted/50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Community calendar</h1>
              <p className="mt-3 text-muted-foreground text-base sm:text-lg leading-relaxed">
                Live events for Kenyans in Greater Houston — curated and published by KIGH. Add sessions to your calendar or open event details.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={tab === 'upcoming' ? 'default' : 'outline'} onClick={() => setTab('upcoming')} className="rounded-full">
            Upcoming
          </Button>
          <Button type="button" size="sm" variant={tab === 'past' ? 'default' : 'outline'} onClick={() => setTab('past')} className="rounded-full">
            Past
          </Button>
          <Button type="button" size="sm" variant={tab === 'all' ? 'default' : 'outline'} onClick={() => setTab('all')} className="rounded-full">
            All
          </Button>
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={category === '' ? 'default' : 'outline'} onClick={() => setCategory('')} className="rounded-full">
              All
            </Button>
            {CALENDAR_FILTER_CATEGORIES.map((c) => (
              <Button key={c} size="sm" variant={category === c ? 'default' : 'outline'} onClick={() => setCategory(c)} className="rounded-full">
                {c}
              </Button>
            ))}
          </div>

          {loading ? (
            <PageLoader />
          ) : filtered.length === 0 ? (
            <Card className="border-dashed bg-muted/15">
              <CardContent className="py-12 sm:py-14 text-center px-4">
                <CalIcon className="mx-auto h-11 w-11 text-primary/30 mb-3" />
                <p className="font-medium text-foreground text-lg">Nothing on the calendar in this view yet</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                  Try another category, switch between Upcoming, Past, and All, or check back soon. You can also suggest an event for community review.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  <Button asChild variant="default" size="sm">
                    <Link to="/events/submit">Suggest an event</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/events">Browse all events</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((ev) => (
                <Card key={ev.id} className="overflow-hidden border-border/90 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-0 sm:flex">
                    <div className="sm:w-36 shrink-0 bg-gradient-to-b from-primary/15 to-primary/5 flex flex-col items-center justify-center p-5 border-b sm:border-b-0 sm:border-r border-border/60">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">{formatDate(ev.start_date, 'MMM')}</span>
                      <span className="text-3xl font-bold text-foreground leading-none my-1">{formatDate(ev.start_date, 'd')}</span>
                      <span className="text-xs text-muted-foreground font-medium">{formatDate(ev.start_date, 'yyyy')}</span>
                    </div>
                    <div className="p-5 sm:p-6 flex-1 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{formatCategoryLabel(ev.category)}</Badge>
                        {isEventPast(ev.start_date) ? (
                          <Badge variant="muted">Past event</Badge>
                        ) : null}
                        {ev.is_virtual ? (
                          <Badge variant="outline" className="gap-1 border-primary/40">
                            <Video className="h-3 w-3" /> Virtual / Online
                          </Badge>
                        ) : null}
                        {ev.is_featured ? <Badge variant="gold">Featured</Badge> : null}
                      </div>
                      <Link to={`/events/${ev.slug}`} className="block text-xl font-semibold text-foreground hover:text-primary transition-colors leading-snug">
                        {ev.title}
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {ev.short_description || ev.description}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        {!ev.is_virtual && (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                            <span className="truncate">{ev.location}</span>
                          </span>
                        )}
                        {ev.start_time && (
                          <span className="tabular-nums">
                            {formatDateShort(ev.start_date)} · {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                          <a
                            href={googleCalendarUrl({
                              title: ev.title,
                              details: ev.short_description || ev.description || '',
                              location: ev.is_virtual ? 'Virtual / Online' : ev.location,
                              startDate: ev.start_date,
                              startTime: ev.start_time,
                              endTime: ev.end_time,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Google Calendar
                          </a>
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => downloadIcs(ev)}>
                          <Download className="h-3.5 w-3.5" /> Download .ics
                        </Button>
                        <Button asChild size="sm" className="font-medium">
                          <Link to={`/events/${ev.slug}`}>Event details</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center max-w-xl mx-auto leading-relaxed">
          Community members can suggest events via{' '}
          <Link to="/events/submit" className="text-primary font-medium underline-offset-4 hover:underline">submit an event</Link>
          {' '}for review before publication.
        </p>
      </div>
    </>
  )
}
