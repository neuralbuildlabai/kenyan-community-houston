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

  // Featured event handling: when there's only one upcoming event, give it
  // a more balanced 2-column layout so it doesn't feel lonely.
  const featuredEvent = events[0]
  const additionalEvents = events.slice(1)

  return (
    <>
      <SEOHead />

      {/* ── Premium hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white">
        {/* Base gradient (still renders if image missing) */}
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-kenyan-green-900 to-kenyan-green-800" />
        {/* Houston skyline backdrop with graceful fallback.
            Expected asset: /kigh-media/site/hero/houston-downtown.jpg */}
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
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.05] tracking-tight mb-6 drop-shadow-sm">
              Your Kenyan community,
              <br className="hidden sm:block" />
              <span className="text-kenyan-gold-300"> rooted in Houston.</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/90 leading-relaxed mb-9 max-w-2xl">
              Events, announcements, businesses, resources, and community support — all in one trusted place for Kenyans across Greater Houston.
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

            {/* small community signal row */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/75">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-kenyan-gold-300" /> Greater Houston, TX
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-kenyan-gold-300" /> Curated &amp; community-moderated
              </span>
              <span className="inline-flex items-center gap-1.5">
                <HeartHandshake className="h-3.5 w-3.5 text-kenyan-gold-300" /> Built by volunteers, for the community
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick access (refined chip rail) ─────────────────────────── */}
      <section className="border-b bg-gradient-to-b from-white to-muted/40 py-6 sm:py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em]">
              Quick access
            </p>
            <p className="text-xs text-muted-foreground/80">Jump straight to what you need</p>
          </div>
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
        {/* ── Upcoming events ──────────────────────────────────────── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
            <div>
              <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-1.5">
                What's happening
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Upcoming events</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                From the live community calendar — curated and moderated by KIGH.
              </p>
            </div>
            <Button asChild variant="default" size="sm" className="gap-1.5 shrink-0 w-fit shadow-sm">
              <Link to="/calendar">
                View full calendar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border bg-gradient-to-br from-muted/50 to-muted/20 px-6 py-10 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-primary/40 mb-3" />
              <p className="text-base font-medium text-foreground">No upcoming events listed yet</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1.5 leading-relaxed">
                Check the calendar soon, or suggest an event for community review.
              </p>
              <Button asChild variant="default" size="sm" className="mt-5">
                <Link to="/events/submit">Suggest an event</Link>
              </Button>
            </div>
          ) : events.length === 1 && featuredEvent ? (
            // Balanced layout when there is only one event — pair with a soft "more coming" callout
            <div className="grid gap-6 lg:grid-cols-5 items-stretch">
              <div className="lg:col-span-3">
                <EventCard event={featuredEvent} />
              </div>
              <div className="lg:col-span-2 rounded-2xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.04] via-background to-kenyan-gold-500/[0.05] p-6 sm:p-7 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-primary mb-2.5">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">More coming soon</span>
                </div>
                <p className="text-sm sm:text-base text-foreground/80 leading-relaxed mb-5">
                  KIGH adds events as they are reviewed. Browse the full calendar for everything on the schedule, or share an event you would like the community to know about.
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

        {/* ── Community highlights ─────────────────────────────────── */}
        <section>
          <div className="mb-7">
            <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-1.5">
              Stay in the loop
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Community highlights
            </h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">Latest announcements</h3>
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
                <div className="rounded-xl border border-dashed bg-muted/20 px-5 py-7 text-center">
                  <p className="text-sm font-medium text-foreground">All quiet for now</p>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-sm mx-auto">
                    New community announcements will appear here as KIGH publishes them.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">Community support</h3>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground shrink-0">
                  <Link to="/community-support">
                    Fundraisers <ArrowRight className="h-3.5 w-3.5" />
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
                <div className="rounded-xl border border-dashed bg-muted/20 px-5 py-7 text-center">
                  <p className="text-sm font-medium text-foreground">No active fundraisers right now</p>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-sm mx-auto">
                    When the community is rallying around someone, you'll see it here.
                  </p>
                </div>
              )}
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
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

        {/* ── Community image band (graceful fallback if photos missing) */}
        <section>
          <div className="mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-1.5">
                The heart of KIGH
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Families, friends, and futures
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                We gather for cultural moments, youth programs, and everyday community. These are the people and places that make KIGH home in Houston.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/*
              Expected images (drop into public/kigh-media/site/community/):
                - family-park.jpg
                - community-kids-park.jpg
              See public/kigh-media/site/README.md for guidance.
            */}
            <CommunityImageCard
              src="/kigh-media/site/community/family-park.jpg"
              alt="A Kenyan family enjoying a community gathering at a Houston park"
              caption="Family days, year-round"
              Icon={Users}
              aspect="aspect-[4/3]"
            />
            <CommunityImageCard
              src="/kigh-media/site/community/community-kids-park.jpg"
              alt="Children playing together at a community park gathering"
              caption="Where the next generation grows up"
              Icon={TreePine}
              aspect="aspect-[4/3]"
            />
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-kenyan-gold-500/[0.07] p-6 sm:p-7 flex flex-col justify-center shadow-sm">
              <div className="flex items-center gap-2 text-primary mb-2.5">
                <HeartHandshake className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Belonging</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight mb-2">
                Built around real people
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                KIGH brings together neighbors, families, and friends across Greater Houston — through events, support, and shared culture.
              </p>
              <Button asChild size="sm" variant="default" className="font-medium w-fit">
                <Link to="/about">About the community</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Membership CTA (primary path) ────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-kenyan-green-800 to-kenyan-green-900 text-white shadow-xl">
          {/* decorative accent */}
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
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-kenyan-gold-200">
                  Community
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight tracking-tight">
                Are you Kenyan in Houston?
              </h2>
              <p className="text-white/85 text-base sm:text-lg leading-relaxed mb-7 max-w-xl">
                Register for membership, explore community resources, and stay connected with events and support — wherever you are in Greater Houston.
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

            {/* Quick membership facts */}
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
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-kenyan-gold-200/90">
                    {f.label}
                  </p>
                  <p className="text-sm sm:text-base font-medium text-white mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Call to Serve (secondary path, intentionally lighter) ── */}
        <section className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.03] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="max-w-xl space-y-2">
              <div className="flex items-center gap-2 text-primary/80 mb-1">
                <HeartHandshake className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">A Call to Serve</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Lend your time, skills, or heart
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                KIGH is looking for community members willing to help with events, youth programs, welfare support, communications, membership, and outreach.
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
