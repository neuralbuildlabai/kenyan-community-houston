import { useEffect, useState } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'
import { buildHomepageWhatsHappeningList, filterPublishedUpcomingByStartDate } from '@/lib/homepageEvents'
import { trackClick } from '@/lib/analytics'

/** Optimized hero (see `public/kigh-media/houstonmainimage-hero.jpg`). */
const HOME_HERO_IMAGE_JPEG = '/kigh-media/houstonmainimage-hero.jpg'
const HOME_HERO_IMAGE_PNG = '/kigh-media/houstonmainimage.png'

type HomeMoment = {
  id: string
  thumbnail_url: string | null
  image_url: string | null
  alt_text: string | null
}

function formatEventListDate(ymd: string): string {
  const d = parseISO(ymd)
  return isValid(d) ? format(d, 'EEE, MMM d') : ymd
}

const HERO_QUICK_LINKS = [
  { to: '/membership', label: 'Join the Community', testId: 'home-quick-join' },
  { to: '/events', label: 'View Events', testId: 'home-quick-events' },
  { to: '/chat', label: 'Community Chat', testId: 'home-quick-chat' },
  { to: '/businesses', label: 'Business Directory', testId: 'home-quick-businesses' },
  { to: '/new-to-houston', label: 'New to Houston', testId: 'home-quick-new' },
  { to: '/gallery', label: 'Gallery', testId: 'home-quick-gallery' },
  { to: '/events/submit', label: 'Submit Event', testId: 'home-quick-submit' },
  { to: '/chat', label: 'Ask the Community', testId: 'home-quick-ask' },
] as const

export function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [moments, setMoments] = useState<HomeMoment[]>([])
  const [listsLoaded, setListsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
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
        const upcomingOnly = filterPublishedUpcomingByStartDate(raw, todayYmd)
        if (!cancelled) setEvents(buildHomepageWhatsHappeningList(upcomingOnly, 3))

        const { data: momentsRows } = await supabase
          .from('gallery_images_public')
          .select('id, thumbnail_url, image_url, alt_text')
          .eq('is_homepage_featured', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(6)
        if (!cancelled) {
          setMoments(
            ((momentsRows ?? []) as HomeMoment[]).filter((m) =>
              (m.thumbnail_url ?? m.image_url)?.trim()
            )
          )
        }
      } finally {
        if (!cancelled) setListsLoaded(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <SEOHead
        title="Home"
        description="Connect with the Kenyan community in Houston — events, resources, and neighbors in Greater Houston."
      />

      {/* Full-bleed hero: skyline + gradient, nav sits above via layout overlap */}
      <section
        data-testid="home-hero"
        data-hero-image={HOME_HERO_IMAGE_JPEG}
        className="relative -mt-16 flex min-h-[82vh] flex-col lg:min-h-[90vh]"
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          <picture className="absolute inset-0 block h-full w-full">
            <source srcSet={HOME_HERO_IMAGE_JPEG} type="image/jpeg" />
            <img
              src={HOME_HERO_IMAGE_PNG}
              alt=""
              width={1672}
              height={941}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center"
              aria-hidden
            />
          </picture>
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/55 via-black/50 to-black/75"
          aria-hidden
        />
        <div className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8 lg:pb-24">
          <div className="mx-auto w-full max-w-3xl text-center text-white">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75 sm:text-xs">
              Kenyan Community Houston
            </p>
            <h1
              data-testid="home-hero-headline"
              className="mb-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]"
            >
              Your Kenyan community hub in Houston
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-white/88 sm:text-lg sm:leading-relaxed">
              A trusted place to find what is happening, who is serving, and how to stay connected
              across Greater Houston. Built for families, newcomers, professionals, youth, elders,
              churches, businesses, and friends of Kenya.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Button
                asChild
                size="lg"
                className="min-w-[200px] gap-2 border-0 bg-kenyan-gold-500 px-8 text-base font-semibold text-white shadow-lg hover:bg-kenyan-gold-400"
              >
                <Link
                  to="/membership"
                  data-testid="hero-cta-join"
                  onClick={() => void trackClick('hero_join_membership', '/membership')}
                >
                  Join the community
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-w-[200px] border-white/40 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
              >
                <Link
                  to="/events"
                  data-testid="hero-cta-events"
                  onClick={() => void trackClick('hero_explore_events', '/events')}
                >
                  Explore events
                </Link>
              </Button>
            </div>

            <div
              className="mx-auto mt-10 grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
              aria-label="Quick links"
            >
              {HERO_QUICK_LINKS.map((item) => (
                <Button
                  key={item.testId}
                  asChild
                  variant="quick"
                  size="sm"
                  className="h-auto min-h-11 w-full whitespace-normal px-3 py-2 text-center text-xs leading-snug sm:text-sm"
                >
                  <Link
                    to={item.to}
                    data-testid={item.testId}
                    onClick={() => void trackClick(`home_quick_${item.testId}`, item.to)}
                  >
                    {item.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* What's happening — elevated editorial panel that breathes below the hero */}
      <section
        className="relative z-20 -mt-12 px-4 pb-16 sm:-mt-14 sm:px-6 sm:pb-20 lg:-mt-16 lg:px-8 lg:pb-24"
        aria-labelledby="home-whats-happening-heading"
        data-testid="home-whats-happening"
      >
        <div className="public-container mx-auto rounded-3xl border border-border/50 bg-card/95 px-5 py-10 shadow-xl shadow-black/[0.06] backdrop-blur-sm sm:px-8 sm:py-12 lg:px-10 lg:py-14">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                  Community calendar
                </p>
                <h2
                  id="home-whats-happening-heading"
                  className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                >
                  What's happening
                </h2>
              </div>
              {events.length > 0 ? (
                <Link
                  to="/events"
                  data-testid="home-cta-events"
                  className="shrink-0 text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition hover:decoration-primary"
                  onClick={() => void trackClick('home_whats_happening_all', '/events')}
                >
                  All events
                </Link>
              ) : null}
            </div>

            {!listsLoaded ? (
              <p className="text-sm text-muted-foreground">Loading upcoming events…</p>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground">
                New gatherings will appear here when they&apos;re published.{' '}
                <Link
                  to="/calendar"
                  data-testid="home-whats-happening-calendar"
                  className="font-medium text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary"
                  onClick={() => void trackClick('home_whats_happening_calendar', '/calendar')}
                >
                  View the community calendar
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {events.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/events/${e.slug}`}
                      data-testid="home-event-row"
                      onClick={() => void trackClick('home_whats_happening_event', `/events/${e.slug}`)}
                      className="group block py-7 first:pt-0 transition-colors hover:text-primary"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
                        <time
                          dateTime={e.start_date}
                          className="shrink-0 text-sm font-medium uppercase tracking-wide text-muted-foreground group-hover:text-primary sm:w-36"
                        >
                          {formatEventListDate(e.start_date)}
                        </time>
                        <div className="min-w-0 flex-1">
                          <span
                            data-testid="home-event-title"
                            className="block text-xl font-semibold tracking-tight text-foreground group-hover:text-primary sm:text-2xl"
                          >
                            {e.title}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">{e.location}</span>
                        </div>
                        <span className="mt-2 inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary sm:mt-0">
                          Details
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Community moments */}
      {moments.length > 0 && (
        <section
          className="border-b border-border/40 bg-muted/15 py-16 sm:py-20"
          data-testid="home-community-moments"
          aria-labelledby="home-community-moments-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2
                id="home-community-moments-heading"
                className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
              >
                Community moments
              </h2>
              <Link
                to="/gallery"
                data-testid="home-cta-gallery-moments"
                className="shrink-0 text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition hover:decoration-primary"
                onClick={() => void trackClick('home_community_moments_gallery', '/gallery')}
              >
                View gallery
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 lg:grid-cols-6 lg:gap-4">
              {moments.map((m) => (
                <Link
                  key={m.id}
                  to="/gallery"
                  data-testid="home-gallery-moment"
                  className="group relative aspect-[4/3] w-[min(85vw,280px)] shrink-0 overflow-hidden rounded-lg bg-muted md:w-auto"
                  onClick={() => void trackClick('home_moment_thumb', '/gallery')}
                >
                  <img
                    src={m.thumbnail_url ?? m.image_url ?? ''}
                    alt={m.alt_text?.trim() || 'Community moment from a KIGH gathering'}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New to Houston */}
      <section className="border-b border-border/40 bg-gradient-to-r from-amber-800/95 via-kenyan-gold-700 to-amber-900 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">New to Houston?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90">
            Starting over in a new city is easier when the basic steps are clear. Find official
            offices, practical guidance, and answers from neighbors who remember their first months
            here.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
            <Link
              to="/new-to-houston"
              data-testid="home-newcomer-resources"
              onClick={() => void trackClick('home_newcomer_resources', '/new-to-houston')}
              className="text-base font-semibold text-white underline decoration-white/40 underline-offset-[6px] transition hover:decoration-white"
            >
              Newcomer resources
            </Link>
            <span className="hidden text-white/40 sm:inline" aria-hidden>
              ·
            </span>
            <Link
              to="/chat"
              data-testid="home-newcomer-chat"
              onClick={() => void trackClick('home_newcomer_ask', '/chat')}
              className="text-base font-semibold text-white underline decoration-white/40 underline-offset-[6px] transition hover:decoration-white"
            >
              Ask the community
            </Link>
          </div>
        </div>
      </section>

      {/* Help — minimal editorial links */}
      <section
        className="py-14 sm:py-16"
        aria-label="Help and updates"
        data-testid="home-help-links"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Updates &amp; support
          </h2>
          <nav aria-label="Updates and support" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              to="/announcements"
              data-testid="home-help-announcements"
              className="text-[15px] font-medium text-foreground/90 underline decoration-border underline-offset-4 transition hover:text-primary hover:decoration-primary"
              onClick={() => void trackClick('home_help_announcements', '/announcements')}
            >
              Announcements
            </Link>
            <span className="text-border" aria-hidden>
              |
            </span>
            <Link
              to="/community-support"
              data-testid="home-help-community-support"
              className="text-[15px] font-medium text-foreground/90 underline decoration-border underline-offset-4 transition hover:text-primary hover:decoration-primary"
              onClick={() => void trackClick('home_help_support', '/community-support')}
            >
              Community Support
            </Link>
            <span className="text-border" aria-hidden>
              |
            </span>
            <Link
              to="/contact"
              data-testid="home-help-contact"
              className="text-[15px] font-medium text-foreground/90 underline decoration-border underline-offset-4 transition hover:text-primary hover:decoration-primary"
              onClick={() => void trackClick('home_help_contact', '/contact')}
            >
              Contact
            </Link>
          </nav>
        </div>
      </section>
    </>
  )
}
