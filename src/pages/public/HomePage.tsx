import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Megaphone, Building2, Heart, Trophy, ArrowRight, MapPin, Users, Star } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { EventCard } from '@/components/EventCard'
import { AnnouncementCard } from '@/components/AnnouncementCard'
import { FundraiserCard } from '@/components/FundraiserCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import type { Event, Announcement, Fundraiser } from '@/lib/types'

export function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: ev }, { data: ann }, { data: fund }] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('status', 'published')
          .gte('start_date', new Date().toISOString())
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground to-kenyan-green-900 py-24 text-white">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1576237960929-beb65a33fc9d?w=1600')] bg-cover bg-center" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Badge className="mb-5 bg-kenyan-gold-500 text-white border-0">
              Houston, Texas
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Your Kenyan Community{' '}
              <span className="text-kenyan-gold-400">Hub in Houston</span>
            </h1>
            <p className="text-xl text-white/80 leading-relaxed mb-8">
              Events, announcements, businesses, community support, and more — all in one trusted place for Kenyans in Houston and nearby areas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white">
                <Link to="/events">Browse Events</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <Link to="/submit/event">Submit an Event</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="border-b bg-muted/40 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { to: '/events', Icon: Calendar, label: 'Events' },
              { to: '/announcements', Icon: Megaphone, label: 'Announcements' },
              { to: '/businesses', Icon: Building2, label: 'Businesses' },
              { to: '/community-support', Icon: Heart, label: 'Support' },
              { to: '/sports-youth', Icon: Trophy, label: 'Sports' },
              { to: '/new-to-houston', Icon: MapPin, label: 'New Here?' },
            ].map(({ to, Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-center hover:bg-white transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground/80">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 space-y-16">
        {/* Upcoming Events */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Upcoming Events</h2>
              <p className="text-sm text-muted-foreground mt-1">Don't miss what's happening in the community</p>
            </div>
            <Button asChild variant="ghost" className="gap-1">
              <Link to="/events">All events <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          {events.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/30 p-10 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No upcoming events right now. Check back soon!</p>
            </div>
          )}
        </section>

        {/* Announcements */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Latest Announcements</h2>
              <p className="text-sm text-muted-foreground mt-1">Community news and important updates</p>
            </div>
            <Button asChild variant="ghost" className="gap-1">
              <Link to="/announcements">View all <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          {announcements.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/30 p-10 text-center">
              <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No announcements yet.</p>
            </div>
          )}
        </section>

        {/* Community Support */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Community Support</h2>
              <p className="text-sm text-muted-foreground mt-1">Fundraisers and support drives from the community</p>
            </div>
            <Button asChild variant="ghost" className="gap-1">
              <Link to="/community-support">View all <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          {fundraisers.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {fundraisers.map((f) => <FundraiserCard key={f.id} fundraiser={f} />)}
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/30 p-10 text-center">
              <Heart className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No active fundraisers at the moment.</p>
            </div>
          )}
        </section>

        {/* CTA Banner */}
        <section className="rounded-2xl bg-gradient-to-r from-primary to-kenyan-green-700 p-8 sm:p-12 text-white">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-kenyan-gold-300" />
              <span className="text-sm font-medium text-kenyan-gold-300">Join Our Community</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Are you Kenyan in Houston?
            </h2>
            <p className="text-white/80 mb-6">
              Connect with the community. Submit your events, list your business, or reach out to say hello.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-kenyan-gold-500 hover:bg-kenyan-gold-600 text-white border-0">
                <Link to="/contact">Get Involved</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <Link to="/submit/event">Submit Event</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
