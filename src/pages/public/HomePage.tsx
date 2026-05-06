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
  HeartHandshake,
  Sparkles,
  Sprout,
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
import { dedupeToNextOccurrenceOnly } from '@/lib/eventRecurrencePublic'
import { KighLogo } from '@/components/KighLogo'
import { trackClick } from '@/lib/analytics'

/**
 * Local community images checked into `public/kigh-media/events/`.
 * These ship with the repo so the homepage never depends on a live
 * Supabase fetch for hero / community-in-action imagery. If a file
 * is moved, the `<img>` `onError` handler hides the tile rather
 * than rendering a broken icon.
 *
 * URLs are relative to the SPA root and Vite serves them from
 * `public/` directly.
 */
const HERO_IMAGE = '/kigh-media/events/kigh-family-fun-day-2026.jpeg'
const COMMUNITY_GALLERY: ReadonlyArray<{ src: string; alt: string }> = [
  {
    src: '/kigh-media/events/kigh-family-fun-day-2026.jpeg',
    alt: 'Kenyans gather in Greater Houston for the KIGH Family Fun Day.',
  },
  {
    src: '/kigh-media/events/kigh-financial-literacy-session-2026.jpeg',
    alt: 'Community members at a KIGH financial literacy session.',
  },
]

export function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([])
  const [loading, setLoading] = useState(true)
  const [galleryOk, setGalleryOk] = useState<boolean[]>(
    COMMUNITY_GALLERY.map(() => true)
  )

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
            .limit(120),
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
        const raw = (ev as Event[]) ?? []
        const deduped = dedupeToNextOccurrenceOnly(raw).slice(0, 3)
        setEvents(deduped)
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
  const visibleGallery = COMMUNITY_GALLERY.filter((_, i) => galleryOk[i])

  return (
    <>
      <SEOHead
        title="Home"
        description="KIGH is the community home for Kenyans in Greater Houston — events, culture, support, businesses, and belonging in one place."
      />

      {/* ─── 1. Hero ────────────────────────────────────────────
          Warm, photo-led. Cream background, KIGH gold accents,
          green CTA buttons. Two-column at lg+, stacks on mobile. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-kenyan-gold-50 via-amber-50/50 to-background">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(ellipse_60%_40%_at_15%_10%,rgba(245,158,11,0.18),transparent_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-50 bg-[radial-gradient(ellipse_55%_45%_at_90%_30%,rgba(22,163,74,0.10),transparent_65%)]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:gap-14 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            {/* Left: text + CTAs */}
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <KighLogo
                  withCard
                  className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 shadow-md ring-1 ring-border/50"
                  imgClassName="max-h-10 sm:max-h-12"
                />
                <Badge className="bg-kenyan-gold-500 hover:bg-kenyan-gold-500 text-white border-0 text-[11px] font-semibold tracking-wide px-2.5 py-1 shadow-sm">
                  Kenyans in Greater Houston
                </Badge>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.08] tracking-tight text-foreground mb-5">
                Your community hub for life in Houston —{' '}
                <span className="text-primary">events, support,</span> and{' '}
                <span className="text-kenyan-gold-600">connection</span>.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-7 max-w-lg">
                Find gatherings, resources, businesses, and ways to belong.
                Built by neighbors for families, newcomers, and everyone in
                between.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="shadow-sm font-semibold gap-1.5"
                >
                  <Link
                    to="/membership"
                    onClick={() => void trackClick('hero_join_membership', '/membership')}
                  >
                    Join / Membership
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-white/80 backdrop-blur border-border/70 hover:bg-white font-semibold"
                >
                  <Link
                    to="/calendar"
                    onClick={() => void trackClick('hero_view_calendar', '/calendar')}
                  >
                    View Calendar
                  </Link>
                </Button>
              </div>

              <p className="mt-7 text-sm text-muted-foreground inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-kenyan-gold-600 shrink-0" aria-hidden />
                Greater Houston, Texas · Volunteer-led nonprofit community
              </p>
            </div>

            {/* Right: large rounded community photo */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5 aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] bg-muted">
                <img
                  src={HERO_IMAGE}
                  alt="KIGH community members gathered for the Family Fun Day in Greater Houston."
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  onError={(e) => {
                    // Hide the broken image cleanly if the asset has been
                    // renamed / removed; the surrounding gradient still
                    // looks intentional.
                    const el = e.currentTarget as HTMLImageElement
                    el.style.display = 'none'
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-transparent"
                  aria-hidden
                />
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm">
                    <Sparkles className="h-3 w-3 text-kenyan-gold-600" />
                    Family Fun Day · Greater Houston
                  </div>
                </div>
              </div>
              {/* Decorative stacked frame for depth */}
              <div
                className="hidden lg:block absolute -bottom-5 -right-5 -z-10 h-full w-full rounded-3xl bg-kenyan-gold-200/50 ring-1 ring-kenyan-gold-300/40"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Start here ────────────────────────────────────── */}
      <section className="border-y border-border/50 bg-card/40 py-7 sm:py-9">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em]">
                Start here
              </p>
              <p className="text-sm text-muted-foreground max-w-xl mt-1">
                Jump straight to what you need.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { to: '/events', Icon: Calendar, label: 'Events', tone: 'bg-kenyan-gold-500/10 text-kenyan-gold-700' },
              { to: '/calendar', Icon: CalendarDays, label: 'Calendar', tone: 'bg-primary/10 text-primary' },
              { to: '/membership', Icon: Users, label: 'Membership', tone: 'bg-kenyan-gold-500/10 text-kenyan-gold-700' },
              { to: '/businesses', Icon: Building2, label: 'Businesses', tone: 'bg-primary/10 text-primary' },
            ].map(({ to, Icon, label, tone }) => (
              <Link
                key={to}
                to={to}
                onClick={() =>
                  void trackClick(`quick_${label.replace(/\s+/g, '_').toLowerCase()}`, to)
                }
                className="group flex items-center gap-3 rounded-2xl border border-border/55 bg-card px-4 py-4 sm:py-5 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${tone}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-16 sm:space-y-24">
        {/* ─── 3. Why we are here ─────────────────────────────── */}
        <section>
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <p className="text-xs font-semibold text-primary/85 uppercase tracking-[0.14em] mb-2">
              Why we are here
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              One place to find your people
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-3">
              Connect around culture, support neighbors when it matters, and
              discover what's happening across Greater Houston — together.
            </p>
          </div>
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Connect locally',
                Icon: Users,
                body: 'Meet families and stay close to Kenyan culture in Houston.',
              },
              {
                title: 'Find events',
                Icon: CalendarDays,
                body: 'Workshops, family days, sports, faith, and cultural gatherings.',
              },
              {
                title: 'Share & support',
                Icon: HeartHandshake,
                body: 'Welfare, fundraisers, and newcomer help when neighbors rally.',
              },
              {
                title: 'Make an impact',
                Icon: Sprout,
                body: 'Volunteer, mentor, and contribute to the community you love.',
              },
            ].map(({ title, Icon, body }) => (
              <div
                key={title}
                className="rounded-3xl border border-border/50 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kenyan-gold-100 text-kenyan-gold-700 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 4. Upcoming gatherings ─────────────────────────── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
            <div>
              <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-1">
                Community calendar
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Upcoming gatherings
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-xl leading-relaxed">
                Workshops, family days, youth activities, and community
                meetings.
              </p>
            </div>
            <Button asChild variant="default" size="sm" className="gap-1.5 shrink-0 w-fit shadow-sm">
              <Link to="/calendar">
                Full calendar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-gradient-to-br from-kenyan-gold-50 via-amber-50/40 to-background px-5 py-10 sm:px-8 sm:py-14 text-center">
              <CalendarDays className="mx-auto h-11 w-11 text-kenyan-gold-600/60 mb-3" />
              <p className="text-base font-semibold text-foreground">
                Nothing scheduled yet
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
                Events appear here once published. Browse the full calendar or
                suggest one for the community.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                <Button asChild size="sm">
                  <Link to="/calendar">Open calendar</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link
                    to="/events/submit"
                    onClick={() =>
                      void trackClick('home_suggest_event', '/events/submit')
                    }
                  >
                    Suggest an event
                  </Link>
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
                  <Link
                    to="/events/submit"
                    onClick={() =>
                      void trackClick('home_suggest_event', '/events/submit')
                    }
                  >
                    Suggest an event
                  </Link>
                </Button>
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

        {/* ─── 5. Community in action ─────────────────────────── */}
        {visibleGallery.length > 0 ? (
          <section>
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-2">
                In photos
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Community in action
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-3">
                Real moments, real connections — from KIGH gatherings across
                Greater Houston.
              </p>
            </div>
            <div
              className={
                visibleGallery.length === 1
                  ? 'mx-auto max-w-3xl'
                  : 'grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[14rem]'
              }
            >
              {visibleGallery.map((img, i) => (
                <Link
                  key={img.src}
                  to="/gallery"
                  onClick={() => void trackClick('home_gallery_tile', '/gallery')}
                  className={`group relative overflow-hidden rounded-3xl ring-1 ring-border/40 shadow-sm transition-all hover:shadow-lg hover:ring-primary/30 ${
                    visibleGallery.length === 2 && i === 0
                      ? 'lg:col-span-2 lg:row-span-2'
                      : visibleGallery.length === 1
                        ? 'aspect-[16/9]'
                        : 'aspect-[4/3] lg:aspect-auto lg:h-full'
                  }`}
                  aria-label="Open the community gallery"
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                    onError={() =>
                      setGalleryOk((prev) =>
                        prev.map((ok, idx) => (idx === i ? false : ok))
                      )
                    }
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-90 group-hover:opacity-95 transition-opacity"
                    aria-hidden
                  />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <p className="text-[11px] uppercase tracking-wider opacity-80">
                      KIGH
                    </p>
                    <p className="text-sm font-medium leading-snug">{img.alt}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-primary">
                <Link to="/gallery">
                  Visit the gallery <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        ) : null}

        {/* ─── 6. Updates & ways to help ──────────────────────── */}
        <section>
          <div className="mb-7 max-w-2xl">
            <p className="text-xs font-semibold text-primary/80 uppercase tracking-[0.14em] mb-1">
              Stay in the loop
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Updates & ways to help
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
              Announcements, active fundraisers, and how to support KIGH
              programs.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Announcements
                </h3>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground shrink-0 h-8"
                >
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
                <div className="rounded-3xl border border-dashed border-border/55 bg-muted/20 px-5 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No announcements right now
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    We'll post updates here when there's news to share.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Fundraisers
                </h3>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground shrink-0 h-8"
                >
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
                <div className="rounded-3xl border border-dashed border-border/55 bg-muted/20 px-5 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No active fundraisers
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    When neighbors rally together, you'll see it here.
                  </p>
                </div>
              )}
              <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.05] to-transparent px-5 py-5 shadow-sm">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">
                  Support programs, cultural events, and newcomer resources
                  through official channels.
                </p>
                <Button asChild size="sm" variant="secondary" className="font-medium">
                  <Link to="/support">Ways to support KIGH</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ─── 7. Get involved closing band ─────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-kenyan-gold-500 via-kenyan-gold-600 to-amber-700 px-6 py-12 sm:px-12 sm:py-16 shadow-xl text-white">
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />

          <div className="relative flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 mb-5 ring-1 ring-white/30">
              <HeartHandshake className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                Get involved
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
              New to Houston, or just looking for support?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/95 leading-relaxed max-w-xl">
              Practical tips for settling in, Kenyan-owned businesses,
              community groups, and friendly faces ready to help. Or join the
              volunteers who keep KIGH running.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-white text-kenyan-gold-700 hover:bg-white/90 font-semibold shadow-md"
              >
                <Link
                  to="/new-to-houston"
                  onClick={() =>
                    void trackClick('home_newcomer_resources', '/new-to-houston')
                  }
                >
                  Newcomer resources
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-transparent border-white/70 text-white hover:bg-white/10 font-semibold"
              >
                <Link to="/serve" onClick={() => void trackClick('home_volunteer_serve', '/serve')}>
                  Volunteer / Serve
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10 font-semibold"
              >
                <Link to="/contact">Contact us</Link>
              </Button>
            </div>
            <p className="mt-6 inline-flex items-center gap-2 text-xs text-white/80">
              <Heart className="h-3.5 w-3.5" />
              Built by neighbors, for neighbors.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
