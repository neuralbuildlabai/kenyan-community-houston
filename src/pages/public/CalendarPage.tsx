import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar as CalIcon, MapPin, Video, ExternalLink, Download } from 'lucide-react'
import { parseISO, isBefore, startOfDay } from 'date-fns'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { CALENDAR_FILTER_CATEGORIES } from '@/lib/constants'
import { formatDate, formatDateShort } from '@/lib/utils'
import { buildEventIcs, googleCalendarUrl } from '@/lib/calendarLinks'
import type { Event } from '@/lib/types'
import { PageLoader } from '@/components/LoadingSpinner'

export function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

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

  const today = startOfDay(new Date())

  const filtered = useMemo(() => {
    let list = events
    if (category) list = list.filter((e) => e.category === category)
    list = list.filter((e) => {
      const d = startOfDay(parseISO(e.start_date))
      return tab === 'upcoming' ? !isBefore(d, today) : isBefore(d, today)
    })
    if (tab === 'past') list = [...list].reverse()
    return list
  }, [events, category, tab, today])

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
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Community calendar</h1>
          <p className="mt-2 text-muted-foreground">
            Upcoming Kenyans in Greater Houston and community events. Dates and details are managed by KIGH administrators.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={tab === 'upcoming' ? 'default' : 'outline'} onClick={() => setTab('upcoming')}>
            Upcoming
          </Button>
          <Button type="button" size="sm" variant={tab === 'past' ? 'default' : 'outline'} onClick={() => setTab('past')}>
            Past
          </Button>
        </div>

        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={category === '' ? 'default' : 'outline'} onClick={() => setCategory('')}>
                All
              </Button>
              {CALENDAR_FILTER_CATEGORIES.map((c) => (
                <Button key={c} size="sm" variant={category === c ? 'default' : 'outline'} onClick={() => setCategory(c)}>
                  {c}
                </Button>
              ))}
            </div>

            {loading ? (
              <PageLoader />
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CalIcon className="mx-auto h-10 w-10 opacity-30 mb-2" />
                  No events in this view. Try another category or check the main events list.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filtered.map((ev) => (
                  <Card key={ev.id} className="overflow-hidden">
                    <CardContent className="p-0 sm:flex">
                      <div className="sm:w-36 shrink-0 bg-primary/10 flex flex-col items-center justify-center p-4 border-b sm:border-b-0 sm:border-r">
                        <span className="text-xs font-semibold text-primary uppercase">{formatDate(ev.start_date, 'MMM')}</span>
                        <span className="text-2xl font-bold text-foreground">{formatDate(ev.start_date, 'd')}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(ev.start_date, 'yyyy')}</span>
                      </div>
                      <div className="p-4 sm:p-5 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{ev.category}</Badge>
                          {ev.is_virtual ? (
                            <Badge variant="outline" className="gap-1 border-primary/40">
                              <Video className="h-3 w-3" /> Virtual / Online
                            </Badge>
                          ) : null}
                          {ev.is_featured ? <Badge variant="gold">Featured</Badge> : null}
                        </div>
                        <Link to={`/events/${ev.slug}`} className="text-lg font-semibold hover:text-primary transition-colors">
                          {ev.title}
                        </Link>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {ev.short_description || ev.description}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {!ev.is_virtual && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 shrink-0" />
                              {ev.location}
                            </span>
                          )}
                          {ev.start_time && (
                            <span>{formatDateShort(ev.start_date)} · {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button asChild size="sm" variant="outline" className="gap-1">
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
                          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => downloadIcs(ev)}>
                            <Download className="h-3.5 w-3.5" /> Download .ics
                          </Button>
                          <Button asChild size="sm">
                            <Link to={`/events/${ev.slug}`}>Details</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Community members can still suggest events via{' '}
          <Link to="/events/submit" className="underline hover:text-foreground">submit an event</Link>
          {' '}for review.
        </p>
      </div>
    </>
  )
}
