import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Building2,
  ArrowRight,
  MessagesSquare,
  Newspaper,
  BookOpen,
  Megaphone,
  HeartHandshake,
} from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { EventCard } from '@/components/EventCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'
import { dedupeToNextOccurrenceOnly } from '@/lib/eventRecurrencePublic'
import { KighLogo } from '@/components/KighLogo'
import { trackClick } from '@/lib/analytics'

/**
 * Homepage — premium, calm, community-centered.
 *
 * The structure is deliberately quiet:
 *   A. Hero — one strong headline, one primary + one secondary CTA.
 *   B. Community action strip — exactly four destinations.
 *   C. Community spaces — Chat + Feed surfaced as two large cards.
 *      (Never renders private chat content; only static labels.)
 *   D. Upcoming gatherings — up to three event cards.
 *   E. Updates & ways to help — two cards only.
 *   F. New-to-Houston band — slimmed orange section, two CTAs.
 */
type HomeMoment = {
  id: string
  thumbnail_url: string | null
  image_url: string | null
  alt_text: string | null
}

export function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [moments, setMoments] = useState<HomeMoment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const todayYmd = format(new Date(), 'yyyy-MM-dd')
        const { data: ev } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'published')
          .gte('start_date', todayYmd)
          .order('start_date', { ascending: true })
          .limit(60)
        const raw = (ev as Event[]) ?? []
        const deduped = dedupeToNextOccurrenceOnly(raw).slice(0, 3)
        setEvents(deduped)
        const { data: momentsRows } = await supabase
          .from('gallery_images')
          .select('id, thumbnail_url, image_url, alt_text')
          .eq('status', 'published')
          .eq('is_homepage_featured', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(6)
        setMoments(((momentsRows ?? []) as HomeMoment[]).filter((m) => (m.thumbnail_url ?? m.image_url)?.trim()))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <PageLoader />

  return (
    <>
      <SEOHead
        title="Home"
        description="The Kenyan community hub in Houston — find events, connect with members, and discover resources."
      />

      {/* ─── A. Hero ────────────────────────────────────────────
          Calmer hero: single column on mobile, two on desktop.
          One headline, one short subtext, one primary + one
          secondary CTA. No badge clutter, no decorative chips. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-kenyan-gold-50 via-amber-50/40 to-background">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(ellipse_55%_40%_at_20%_15%,rgba(245,158,11,0.16),transparent_70%)]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div className="max-w-xl">
              <div className="mb-7 flex items-center gap-3">
                <KighLogo
                  withCard
                  className="h-12 w-12 shrink-0 shadow-sm ring-1 ring-border/40"
                  imgClassName="max-h-10"
                />
                <Badge className="border-0 bg-kenyan-gold-500 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-sm hover:bg-kenyan-gold-500">
                  Kenyans in Greater Houston
                </Badge>
              </div>

              <h1 className="mb-6 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
                Your Kenyan community hub in Houston
              </h1>

              <p className="mb-9 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Find events, connect with members, discover resources, and stay
                close to the community.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-1.5 font-semibold shadow-sm">
                  <Link
                    to="/membership"
                    data-testid="hero-cta-join"
                    onClick={() =>
                      void trackClick('hero_join_membership', '/membership')
                    }
                  >
                    Join the community
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-border/60 bg-white/80 font-semibold backdrop-blur hover:bg-white"
                >
                  <Link
                    to="/chat"
                    data-testid="hero-cta-chat"
                    onClick={() => void trackClick('hero_ask_community', '/chat')}
                  >
                    Ask the community
                  </Link>
                </Button>
              </div>
            </div>

            {/* Hero photo, single rounded frame, no stacked decoration. */}
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted shadow-xl ring-1 ring-black/5 sm:aspect-[5/4] lg:aspect-[4/5]">
                <img
                  src="/kigh-media/events/kigh-family-fun-day-2026.jpeg"
                  alt="KIGH community members gathered in Greater Houston."
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement
                    el.style.display = 'none'
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-transparent"
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── B. Community action strip ───────────────────────────
          Replaces the old multi-card "Start here" section.
          Exactly four destinations, ordered so Community Chat is
          first and lives immediately under the hero. */}
      <section
        className="bg-card/40 py-12 sm:py-16"
        aria-labelledby="home-quick-actions"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="home-quick-actions" className="sr-only">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {[
              {
                to: '/chat',
                Icon: MessagesSquare,
                title: 'Community Chat',
                copy: 'Ask questions, connect with members, and get community guidance.',
                testId: 'action-chat',
                tone: 'bg-kenyan-gold-500/10 text-kenyan-gold-700',
              },
              {
                to: '/events',
                Icon: Calendar,
                title: 'Events',
                copy: 'See upcoming gatherings and community activities.',
                testId: 'action-events',
                tone: 'bg-primary/10 text-primary',
              },
              {
                to: '/resources',
                Icon: BookOpen,
                title: 'Resources',
                copy: 'Find helpful newcomer, family, and support resources.',
                testId: 'action-resources',
                tone: 'bg-kenyan-gold-500/10 text-kenyan-gold-700',
              },
              {
                to: '/businesses',
                Icon: Building2,
                title: 'Business Directory',
                copy: 'Discover Kenyan-owned and community businesses.',
                testId: 'action-businesses',
                tone: 'bg-primary/10 text-primary',
              },
            ].map(({ to, Icon, title, copy, testId, tone }) => (
              <Link
                key={to}
                to={to}
                data-testid={testId}
                onClick={() => void trackClick(`home_${testId}`, to)}
                className="group flex flex-col rounded-2xl bg-card p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${tone}`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-base font-semibold text-foreground">
                  {title}
                </span>
                <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {copy}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {moments.length > 0 && (
        <section
          className="border-y bg-muted/20 py-12 sm:py-16"
          data-testid="home-community-moments"
          aria-labelledby="home-community-moments-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="home-community-moments-heading"
                  className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                >
                  Community moments
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Curated highlights from recent gatherings. Visit the gallery for the full collection.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="w-fit shrink-0 gap-1.5 text-primary">
                <Link
                  to="/gallery"
                  data-testid="home-cta-gallery-moments"
                  onClick={() => void trackClick('home_community_moments_gallery', '/gallery')}
                >
                  View gallery <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
              {moments.map((m) => (
                <Link
                  key={m.id}
                  to="/gallery"
                  className="block aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border/40 transition-shadow hover:ring-primary/30"
                  data-testid="home-gallery-moment"
                >
                  <img
                    src={m.thumbnail_url ?? m.image_url ?? ''}
                    alt={m.alt_text?.trim() || 'Community moment'}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── C. Connect with the community ───────────────────────
          Two large premium cards. Chat shows static preview text
          only — never live or fake messages. */}
      <section
        className="bg-gradient-to-b from-background via-amber-50/30 to-background py-16 sm:py-20"
        data-testid="home-living-community"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Connect with the community
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Two member-friendly spaces — one for asking, one for staying in
              the loop.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            <Link
              to="/chat"
              data-testid="home-cta-community-chat"
              onClick={() =>
                void trackClick('home_living_community_chat', '/chat')
              }
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-card p-8 shadow-sm ring-1 ring-border/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/30 sm:p-10"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-kenyan-gold-700">
                Member space
              </span>
              <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-kenyan-gold-500/10 text-kenyan-gold-700">
                <MessagesSquare className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                Community Chat
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Start a private community request or conversation. Sign in may
                be required.
              </p>
              <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                Open community chat
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              to="/community-feed"
              data-testid="home-cta-community-feed"
              onClick={() =>
                void trackClick('home_living_community_feed', '/community-feed')
              }
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-card p-8 shadow-sm ring-1 ring-border/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/30 sm:p-10"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/85">
                Moderated updates
              </span>
              <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Newspaper className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                Community Feed
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Read community updates, reminders, and member-friendly posts.
              </p>
              <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                View community feed
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── D. Upcoming gatherings ──────────────────────────────
          Maximum three event cards. Empty state is a single calm
          panel with one CTA back to the calendar. */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Upcoming gatherings
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
                Workshops, family days, and community meetings across Greater
                Houston.
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-fit shrink-0 gap-1.5 text-primary"
            >
              <Link to="/events" data-testid="home-cta-events">
                View all events <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="rounded-3xl bg-gradient-to-br from-kenyan-gold-50 via-amber-50/30 to-background px-6 py-12 text-center sm:px-10 sm:py-16">
              <p className="text-lg font-semibold text-foreground">
                Nothing scheduled yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                New gatherings appear here as they're published.
              </p>
              <div className="mt-6">
                <Button asChild size="sm">
                  <Link to="/calendar">Open calendar</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.slice(0, 3).map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── E. Updates & ways to help ───────────────────────────
          Just two cards — no extra panels, no inline donate CTA. */}
      <section className="bg-card/40 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-9 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Updates and ways to help
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Link
              to="/announcements"
              data-testid="home-cta-announcements"
              onClick={() =>
                void trackClick('home_announcements', '/announcements')
              }
              className="group flex flex-col rounded-3xl bg-card p-7 shadow-sm ring-1 ring-border/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Megaphone className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                Announcements
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Official updates from KIGH organizers.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Read announcements
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              to="/community-support"
              data-testid="home-cta-community-support"
              onClick={() =>
                void trackClick('home_community_support', '/community-support')
              }
              className="group flex flex-col rounded-3xl bg-card p-7 shadow-sm ring-1 ring-border/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kenyan-gold-500/10 text-kenyan-gold-700">
                <HeartHandshake className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                Community support
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Welfare drives and fundraisers neighbors are rallying around.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                See how to help
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── F. New to Houston — slimmer orange band ────────────
          One headline, one sentence, two CTAs. */}
      <section className="px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-kenyan-gold-500 via-kenyan-gold-600 to-amber-700 px-6 py-12 text-white shadow-xl sm:px-12 sm:py-14">
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />

          <div className="relative grid items-center gap-8 sm:grid-cols-[1.4fr_1fr]">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                New to Houston?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/95 sm:text-base">
                Settle in faster with resources curated by neighbors who've been
                where you are.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:justify-end">
              <Button
                asChild
                size="lg"
                className="bg-white font-semibold text-kenyan-gold-700 shadow-md hover:bg-white/90"
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
                className="border-white/70 bg-transparent font-semibold text-white hover:bg-white/10"
              >
                <Link
                  to="/membership"
                  onClick={() =>
                    void trackClick('home_newcomer_join', '/membership')
                  }
                >
                  Join the community
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
