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
  Sparkles,
  HeartHandshake,
  TreePine,
  Compass,
} from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { EventCard } from '@/components/EventCard'
import { AnnouncementCard } from '@/components/AnnouncementCard'
import { FundraiserCard } from '@/components/FundraiserCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoader } from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import type { Event, Announcement, Fundraiser } from '@/lib/types'
import { KighLogo } from '@/components/KighLogo'
import { HoustonSkylineBackdrop } from '@/components/HoustonSkylineBackdrop'
import { CommunityImageCard } from '@/components/CommunityImageCard'

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

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-kenyan-green-900 to-kenyan-green-800" />
        <HoustonSkylineBackdrop />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-7">
              <KighLogo
                withCard
                className="h-16 w-16 sm:h-[4.25rem] sm:w-[4.25rem] shrink-0 border-white/30 bg-white/95 shadow-lg ring-1 ring-white/10"
                imgClassName="max-h-[3.5rem] sm:max-h-14"
              />
              <Badge className="bg-kenyan-gold-500 text-white border-0 text-xs font-semibold tracking-wide px-3 py-1 shadow-md">
                Kenyans in Greater Houston
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-bold leading-[1.08] tracking-tight mb-6 drop-shadow-sm">
              Where Kenyans in Houston connect, celebrate, and care for one another.
            </h1>
            <p className="text-lg sm:text-xl text-white/90 leading-relaxed mb-9 max-w-2xl">
              From family gatherings and youth programs to business connections, community support, and newcomer resources, KIGH brings our people together in one place — online and in person.
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

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-kenyan-gold-300 shrink-0" /> Greater Houston, Texas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <HeartHandshake className="h-3.5 w-3.5 text-kenyan-gold-300 shrink-0" /> Community-led and volunteer-powered
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-kenyan-gold-300 shrink-0" /> Events, support, culture, and connection
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick access ───────────────────────────────────────────── */}
      <section className="border-b bg-gradient-to-b from-muted/25 via-white to-muted/35 py-7 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em]">Quick access</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-5">
            Start where you need to — attend, join, support, serve, or explore.
          </p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-2.5">
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
                className="group inline-flex items-center gap-2 rounded-full border border-border/80 bg-background pl-3 pr-3.5 py-2 text-sm font-medium text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow transition-all"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16 space-y-16 sm:space-y-20">
        {/* ── Why this community hub matters ───────────────────────── */}
        <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/[0.04] via-background to-kenyan-gold-500/[0.05] px-6 py-10 sm:px-10 sm:py-12 shadow-sm">
          <div className="max-w-3xl mb-8 sm:mb-10">
            <p className="text-xs font-semibold text-primary/85 uppercase tracking-[0.14em] mb-2">Why we are here</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-4">
              Why this community hub matters
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              KIGH exists to make it easier for Kenyans in Greater Houston to find each other, support one another, celebrate our culture, share opportunities, and build a stronger community for families, newcomers, youth, businesses, and future generations.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                title: 'Belonging',
                Icon: Users,
                body: 'Find community, meet families, and stay connected to Kenyan culture in Houston.',
              },
              {
                title: 'Support',
                Icon: Heart,
                body: 'Discover fundraisers, welfare efforts, newcomer help, and ways to show up for one another.',
              },
              {
                title: 'Opportunity',
                Icon: Compass,
                body: 'Connect with events, businesses, volunteers, youth programs, and community resources.',
              },
            ].map(({ title, Icon, body }) => (
              <Card key={title} className="border-border/80 bg-card/90 shadow-sm hover:border-primary/25 transition-colors">
                <CardContent className="pt-6 pb-5 px-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── New to Houston (compact pathway) ──────────────────────── */}
        <section className="rounded-2xl border border-primary/15 bg-muted/25 px-5 py-5 sm:px-6 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground tracking-tight">New to Houston?</h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
              Find community groups, Kenyan businesses, events, support resources, and practical information to help you settle in.
            </p>
          </div>
          <Button asChild variant="default" className="shrink-0 font-semibold w-full sm:w-auto">
            <Link to="/new-to-houston">Newcomer resources</Link>
          </Button>
        </section>

        {/* ── Upcoming events ───────────────────────────────────────── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
            <div>
              <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-1.5">Community calendar</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Gather with the community</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                See upcoming KIGH events, family gatherings, youth activities, workshops, and community meetings.
              </p>
            </div>
            <Button asChild variant="default" size="sm" className="gap-1.5 shrink-0 w-fit shadow-sm">
              <Link to="/calendar">
                View full calendar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border bg-gradient-to-br from-muted/50 to-muted/25 px-6 py-10 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-primary/40 mb-3" />
              <p className="text-base font-medium text-foreground">Nothing on the calendar just yet</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
                More community events will appear here as they are announced. Meantime, browse the calendar or share something the community should know about.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <Button asChild variant="default" size="sm">
                  <Link to="/calendar">Open calendar</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/events/submit">Suggest an event</Link>
                </Button>
              </div>
            </div>
          ) : events.length === 1 && featuredEvent ? (
            <div className="space-y-4">
              <Badge variant="secondary" className="text-xs font-medium w-fit">
                Featured upcoming event
              </Badge>
              <div className="grid gap-6 lg:grid-cols-5 items-stretch">
                <div className="lg:col-span-3">
                  <EventCard event={featuredEvent} />
                </div>
                <div className="lg:col-span-2 rounded-2xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.04] via-background to-kenyan-gold-500/[0.05] p-6 sm:p-7 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-primary mb-2.5">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">More on the way</span>
                  </div>
                  <p className="text-sm sm:text-base text-foreground/80 leading-relaxed mb-5">
                    More community events will appear here as they are announced. Browse the full calendar for everything on the schedule, or share an event you would like the community to know about.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/calendar">Open calendar</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="text-primary hover:text-primary">
                      <Link to="/events/submit">Suggest an event</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[featuredEvent, ...additionalEvents]
                .filter(Boolean)
                .map((e) => (
                  <EventCard key={e!.id} event={e!} />
                ))}
            </div>
          )}
        </section>

        {/* ── Community updates & support ───────────────────────────── */}
        <section>
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-1.5">Stay close to the community</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Community updates and support</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
              Stay informed about announcements, fundraisers, welfare efforts, and ways the community is showing up for one another.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">Announcements</h3>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground shrink-0">
                  <Link to="/announcements">
                    All <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              {announcements.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-1">
                  {announcements.map((a) => (
                    <AnnouncementCard key={a.id} announcement={a} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/30 px-5 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">All quiet for now</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto">
                    New community announcements will appear here once published.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">Fundraisers</h3>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground shrink-0">
                  <Link to="/community-support">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              {fundraisers.length > 0 ? (
                <div className="grid gap-4">
                  {fundraisers.map((f) => (
                    <FundraiserCard key={f.id} fundraiser={f} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/30 px-5 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">No active fundraisers right now</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto">
                    When the community is rallying around someone, you will see it here.
                  </p>
                </div>
              )}
              <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-card to-muted/20 p-5 shadow-sm">
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Support KIGH programs, cultural events, youth activities, newcomer resources, and community care through official treasury channels.
                </p>
                <Button asChild size="sm" variant="secondary" className="font-medium">
                  <Link to="/support">Ways to Support KIGH</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Families, culture, next generation ───────────────────── */}
        <section>
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-1.5">The heart of KIGH</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Families, culture, and the next generation</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
              KIGH is more than a calendar. It is where children meet community, families build friendships, and our culture continues to grow in Greater Houston.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <CommunityImageCard
              src="/kigh-media/site/community/family-park.jpg"
              alt="A Kenyan family enjoying a community gathering at a Houston park"
              caption="Family days, year-round"
              description="Community gatherings give families a place to relax, connect, and create memories together."
              Icon={Users}
              aspect="aspect-[4/3]"
            />
            <CommunityImageCard
              src="/kigh-media/site/community/community-kids-park.jpg"
              alt="Children playing together at a community park gathering"
              caption="Where the next generation grows"
              description="Youth activities, mentorship, and family-centered events help young people stay connected to community and culture."
              Icon={TreePine}
              aspect="aspect-[4/3]"
            />
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-background to-kenyan-gold-500/[0.08] p-6 sm:p-7 flex flex-col justify-center shadow-sm">
              <div className="flex items-center gap-2 text-primary mb-2.5">
                <HeartHandshake className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Together</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight mb-2">Built around real people</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Behind every event and resource are volunteers, families, elders, young professionals, and neighbors choosing to show up.
              </p>
              <Button asChild size="sm" variant="default" className="font-medium w-fit">
                <Link to="/about">About the community</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Membership CTA ────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-kenyan-green-800 to-kenyan-green-900 text-white shadow-xl">
          <div
            className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-kenyan-gold-500/20 blur-3xl pointer-events-none"
            aria-hidden
          />
          <div
            className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none"
            aria-hidden
          />
          <div className="relative grid gap-8 p-8 sm:p-10 lg:p-12 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3 max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-kenyan-gold-300" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-kenyan-gold-200">Your community home</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight tracking-tight">
                Make this your community home
              </h2>
              <p className="text-white/85 text-base sm:text-lg leading-relaxed mb-7 max-w-xl">
                Register as an individual, family, or associate member to stay connected to events, resources, community support, and opportunities to serve.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-kenyan-gold-500 hover:bg-kenyan-gold-600 text-white border-0 font-semibold shadow-lg"
                >
                  <Link to="/membership">Membership registration</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="bg-white/15 text-white hover:bg-white/25 border border-white/30 backdrop-blur-sm font-medium"
                >
                  <Link to="/resources">Browse resources</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { label: 'Annual dues', value: '$20 / year' },
                { label: 'Membership types', value: 'Individual · Family · Associate' },
                { label: 'Renewal', value: 'Due by January 31' },
              ].map((f) => (
                <div
                  key={f.label}
                  className="rounded-xl border border-white/15 bg-white/[0.06] backdrop-blur-sm px-4 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-kenyan-gold-200/90">{f.label}</p>
                  <p className="text-sm sm:text-base font-medium text-white mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Call to Serve ─────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.03] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="max-w-xl space-y-2">
              <div className="flex items-center gap-2 text-primary/80 mb-1">
                <HeartHandshake className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">Serve the community</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Help carry the community forward</h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                KIGH is powered by people who give what they can — a few hours, a skill, a connection, a helping hand, or a willingness to lead. If you are ready to serve, we would love to hear from you.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 shrink-0">
              <Button asChild className="font-semibold">
                <Link to="/serve">I Want to Serve</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/membership">Learn about membership</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
