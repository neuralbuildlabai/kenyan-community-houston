import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  Calendar,
  CalendarDays,
  Building2,
  Heart,
  ArrowRight,
  MapPin,
  Users,
  Library,
  UsersRound,
  HeartHandshake,
  Compass,
} from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { EventCard } from '@/components/EventCard'
import { AnnouncementCard } from '@/components/AnnouncementCard'
import { FundraiserCard } from '@/components/FundraiserCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import type { Event, Announcement, Fundraiser } from '@/lib/types'
import { KighLogo } from '@/components/KighLogo'
import { HoustonSkylineBackdrop } from '@/components/HoustonSkylineBackdrop'

export function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const todayYmd = format(new Date(), 'yyyy-MM-dd')
        const [{ data: ev }, { data: ann }, { data: fund }] = await Promise.all([
          supabase
            .from('events')
            .select('*')
            .eq('status', 'published')
            .gte('start_date', todayYmd)
            .order('start_date', { ascending: true })
            .limit(3),
          supabase
            .from('announcements')
            .select('*')
            .eq('status', 'published')
            .order('is_pinned', { ascending: false })
            .order('published_at', { ascending: false })
            .limit(2),
          supabase
            .from('fundraisers')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(2),
        ])
        setEvents((ev as Event[]) ?? [])
        setAnnouncements((ann as Announcement[]) ?? [])
        setFundraisers((fund as Fundraiser[]) ?? [])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <PageLoader />

  const featuredEvent = events[0]
  const additionalEvents = events.slice(1)

  return (
    <>
      <SEOHead
        title="Home"
        description="KIGH is the community home for Kenyans in Greater Houston — events, culture, support, businesses, and belonging in one place. Join, attend, serve, and stay connected."
      />

      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-kenyan-green-900 to-kenyan-green-800" />
        <HoustonSkylineBackdrop />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <KighLogo
                withCard
                className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 border-white/30 bg-white/95 shadow-lg ring-1 ring-white/10"
                imgClassName="max-h-12 sm:max-h-14"
              />
              <Badge className="bg-kenyan-gold-500 text-white border-0 text-xs font-semibold tracking-wide px-3 py-1 shadow-md">
                Kenyans in Greater Houston
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold leading-[1.1] tracking-tight mb-5 drop-shadow-sm">
              Your community hub for life in Houston — events, support, and connection.
            </h1>
            <p className="text-base sm:text-lg text-white/88 leading-relaxed mb-8 max-w-xl">
              Find gatherings, resources, businesses, and ways to belong. Built by neighbors for families, newcomers, and everyone in between.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-kenyan-gold-500 hover:bg-kenyan-gold-600 text-white border-0 shadow-lg font-semibold"
              >
                <Link to="/membership">Join / Membership</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-white/95 text-primary hover:bg-white border-0 shadow-md font-semibold"
              >
                <Link to="/calendar">View Calendar</Link>
              </Button>
            </div>
            <p className="mt-8 text-sm text-white/75 inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-kenyan-gold-300 shrink-0" aria-hidden />
              Greater Houston, Texas · Volunteer-led nonprofit community
            </p>
          </div>
        </div>
      </section>

      {/* Start here — quick links */}
      <section className="border-b bg-gradient-to-b from-muted/30 via-background to-muted/25 py-6 sm:py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em] mb-1">Start here</p>
          <p className="text-sm text-muted-foreground max-w-2xl mb-4">
            Jump to what you need — no scrolling required.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { to: '/events', Icon: Calendar, label: 'Events' },
              { to: '/calendar', Icon: CalendarDays, label: 'Calendar' },
              { to: '/membership', Icon: Users, label: 'Membership' },
              { to: '/businesses', Icon: Building2, label: 'Businesses' },
              { to: '/support', Icon: Heart, label: 'Support' },
              { to: '/resources', Icon: Library, label: 'Resources' },
              { to: '/community-groups', Icon: UsersRound, label: 'Groups' },
              { to: '/new-to-houston', Icon: MapPin, label: 'New to Houston' },
            ].map(({ to, Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-background px-2 py-3 text-center text-xs sm:text-sm font-medium text-foreground shadow-sm hover:border-primary/35 hover:bg-primary/[0.04] transition-colors min-h-[4.25rem] sm:min-h-0 sm:py-3.5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="leading-tight px-0.5">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14 space-y-14 sm:space-y-16">
        {/* Why this hub */}
        <section className="rounded-2xl border border-border/60 bg-muted/20 px-5 py-8 sm:px-8 sm:py-9">
          <p className="text-xs font-semibold text-primary/85 uppercase tracking-[0.14em] mb-2">Why we are here</p>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3 max-w-2xl">
            One place to find your people
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mb-8">
            KIGH makes it easier to discover events, share culture, support neighbors, and grow together — online and in person across Greater Houston.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {[
              { title: 'Belonging', Icon: Users, body: 'Meet families and stay close to Kenyan culture here in Houston.' },
              { title: 'Support', Icon: Heart, body: 'Fundraisers, welfare, and newcomer help when the community rallies.' },
              { title: 'Opportunity', Icon: Compass, body: 'Events, businesses, youth programs, and resources in one hub.' },
            ].map(({ title, Icon, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border/50 bg-background/80 px-4 py-4 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2.5">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Upcoming events */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-1">Community calendar</p>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Upcoming gatherings</h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xl leading-relaxed">
                Workshops, family days, youth activities, and community meetings.
              </p>
            </div>
            <Button asChild variant="default" size="sm" className="gap-1.5 shrink-0 w-fit shadow-sm">
              <Link to="/calendar">
                Full calendar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border bg-muted/25 px-5 py-8 sm:px-8 sm:py-10 text-center">
              <CalendarDays className="mx-auto h-9 w-9 text-primary/40 mb-2" />
              <p className="text-sm font-medium text-foreground">Nothing scheduled yet</p>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
                New events will show here when published. Browse the calendar or suggest something for the community.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                <Button asChild variant="default" size="sm">
                  <Link to="/calendar">Open calendar</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/events/submit">Suggest an event</Link>
                </Button>
              </div>
            </div>
          ) : events.length === 1 && featuredEvent ? (
            <div className="space-y-3">
              <Badge variant="secondary" className="text-xs font-medium w-fit">
                Next up
              </Badge>
              <EventCard event={featuredEvent} />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="outline">
                  <Link to="/calendar">More dates</Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="text-primary">
                  <Link to="/events/submit">Suggest an event</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[featuredEvent, ...additionalEvents]
                .filter(Boolean)
                .map((e) => (
                  <EventCard key={e!.id} event={e!} />
                ))}
            </div>
          )}
        </section>

        {/* Community updates & support */}
        <section>
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-1">Stay in the loop</p>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Updates & ways to help</h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Announcements, active fundraisers, and how to support KIGH programs.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">Announcements</h3>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground shrink-0 h-8">
                  <Link to="/announcements">
                    All <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              {announcements.length > 0 ? (
                <div className="grid gap-3">
                  {announcements.map((a) => (
                    <AnnouncementCard key={a.id} announcement={a} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/25 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">No announcements right now</p>
                  <p className="text-xs text-muted-foreground mt-1">Check back soon.</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">Fundraisers</h3>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground shrink-0 h-8">
                  <Link to="/community-support">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              {fundraisers.length > 0 ? (
                <div className="grid gap-3">
                  {fundraisers.map((f) => (
                    <FundraiserCard key={f.id} fundraiser={f} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/25 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">No active fundraisers</p>
                  <p className="text-xs text-muted-foreground mt-1">When the community rallies, it will show here.</p>
                </div>
              )}
              <div className="rounded-xl border border-primary/15 bg-primary/[0.03] px-4 py-4">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">
                  Support programs, cultural events, and newcomer resources through official channels.
                </p>
                <Button asChild size="sm" variant="secondary" className="font-medium">
                  <Link to="/support">Ways to support KIGH</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* New to Houston */}
        <section className="rounded-2xl border border-primary/15 bg-muted/20 px-5 py-5 sm:px-6 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground tracking-tight">New to Houston?</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-xl">
              Groups, Kenyan-owned businesses, events, and practical tips to help you settle in.
            </p>
          </div>
          <Button asChild variant="default" className="shrink-0 font-semibold w-full sm:w-auto">
            <Link to="/new-to-houston">Newcomer resources</Link>
          </Button>
        </section>

        {/* Membership + serve (single band) */}
        <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.06] via-background to-kenyan-gold-500/[0.06] px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <div className="flex items-center gap-2 text-primary/85">
                <Users className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">Stay involved</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Join the community — or lend a hand</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Membership keeps you close to events and resources. Volunteers power everything you see here.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 shrink-0">
              <Button asChild className="font-semibold">
                <Link to="/membership">Membership</Link>
              </Button>
              <Button asChild variant="outline" className="font-medium">
                <Link to="/serve">Volunteer / serve</Link>
              </Button>
              <Button asChild variant="ghost" className="text-primary sm:px-3">
                <Link to="/about" className="inline-flex items-center gap-1">
                  About KIGH <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
