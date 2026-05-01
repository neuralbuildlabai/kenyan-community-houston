import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  Calendar,
  CalendarDays,
  Megaphone,
  Building2,
  Heart,
  Trophy,
  ArrowRight,
  MapPin,
  Users,
  Library,
  UsersRound,
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

export function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
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
          .limit(3),
        supabase
          .from('fundraisers')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(3),
      ])
      setEvents((ev as Event[]) ?? [])
      setAnnouncements((ann as Announcement[]) ?? [])
      setFundraisers((fund as Fundraiser[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  return (
    <>
      <SEOHead />

      {/* Premium hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground to-kenyan-green-900 py-16 sm:py-20 text-white">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1576237960929-beb65a33fc9d?w=1600')] bg-cover bg-center" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <KighLogo
                withCard
                className="h-16 w-16 sm:h-[4.25rem] sm:w-[4.25rem] shrink-0 border-white/25 bg-white/95 shadow-md"
                imgClassName="max-h-[3.5rem] sm:max-h-14"
              />
              <Badge className="bg-kenyan-gold-500 text-white border-0 text-xs font-medium">
                Kenyans in Greater Houston
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-5">
              Your Kenyan Community Hub in Houston
            </h1>
            <p className="text-lg sm:text-xl text-white/85 leading-relaxed mb-8 max-w-2xl">
              Events, announcements, businesses, resources, and community support — all in one trusted place for Kenyans in Greater Houston.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-kenyan-gold-500 hover:bg-kenyan-gold-600 text-white border-0 shadow-md">
                <Link to="/membership">Join / Membership</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 border-0 shadow-sm font-semibold">
                <Link to="/calendar">View Calendar</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick access */}
      <section className="border-b bg-muted/30 py-5 sm:py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 text-center sm:text-left">
            Quick access
          </p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3">
            {[
              { to: '/events', Icon: Calendar, label: 'Events' },
              { to: '/calendar', Icon: CalendarDays, label: 'Calendar' },
              { to: '/membership', Icon: Users, label: 'Membership' },
              { to: '/businesses', Icon: Building2, label: 'Businesses' },
              { to: '/support', Icon: Heart, label: 'Support' },
              { to: '/resources', Icon: Library, label: 'Resources' },
              { to: '/community-groups', Icon: UsersRound, label: 'Community Groups' },
              { to: '/new-to-houston', Icon: MapPin, label: 'New to Houston' },
            ].map(({ to, Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-full border border-border/80 bg-background px-3.5 py-2 text-sm font-medium text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <Icon className="h-4 w-4 text-primary shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14 space-y-14">
        {/* Upcoming events */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Upcoming events</h2>
              <p className="text-sm text-muted-foreground mt-1">From the live community calendar</p>
            </div>
            <Button asChild variant="default" size="sm" className="gap-1.5 shrink-0 w-fit">
              <Link to="/calendar">View full calendar <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          {events.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          ) : (
            <div className="rounded-xl border bg-gradient-to-br from-muted/50 to-muted/20 px-6 py-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-primary/40 mb-2" />
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No upcoming events listed yet. Check the calendar soon or suggest an event for review.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/events/submit">Suggest an event</Link>
              </Button>
            </div>
          )}
        </section>

        {/* Community highlights: announcements + support / fundraisers */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">Community highlights</h2>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">Latest announcements</h3>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground shrink-0">
                  <Link to="/announcements">All <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Button>
              </div>
              {announcements.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-1">
                  {announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  No announcements yet.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">Community support</h3>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground shrink-0">
                  <Link to="/community-support">Fundraisers <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Button>
              </div>
              {fundraisers.length > 0 ? (
                <div className="grid gap-4">
                  {fundraisers.map((f) => <FundraiserCard key={f.id} fundraiser={f} />)}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  No active fundraisers right now.
                </div>
              )}
              <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Community programs also rely on direct support through official KIGH channels.
                </p>
                <Button asChild size="sm" variant="secondary" className="font-medium">
                  <Link to="/support">Ways to Support KIGH</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Single strong membership CTA */}
        <section className="rounded-2xl bg-gradient-to-r from-primary to-kenyan-green-800 p-8 sm:p-10 text-white shadow-lg">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-kenyan-gold-300" />
              <span className="text-xs font-semibold uppercase tracking-wide text-kenyan-gold-200/90">Community</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Are you Kenyan in Houston?</h2>
            <p className="text-white/85 leading-relaxed mb-6">
              Register for membership, explore community resources, and stay connected with events and support.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-kenyan-gold-500 hover:bg-kenyan-gold-600 text-white border-0 font-semibold">
                <Link to="/membership">Membership registration</Link>
              </Button>
              <Button asChild variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border border-white/30 backdrop-blur-sm">
                <Link to="/resources">Browse resources</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
