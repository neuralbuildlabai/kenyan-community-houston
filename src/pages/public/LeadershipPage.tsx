import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, HeartHandshake, UserPlus } from 'lucide-react'

import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'
import { initialsForName, type LeadershipSeat } from '@/data/leadership'
import { fetchPublicLeadership, groupSeatsForDisplay } from '@/lib/leadershipApi'

/**
 * Public-facing Interim Leadership Team page.
 *
 * Source of truth is the `public.leadership_seats` table (migration 045),
 * managed by elevated admins via `/admin/leadership`. Photos live in the
 * `leadership-photos` Supabase Storage bucket (public-read). The static
 * array in `src/data/leadership.ts` is used as a hard-coded fallback so
 * the page never renders empty in the rare case the DB query fails.
 */
export function LeadershipPage() {
  const [seats, setSeats] = useState<ReadonlyArray<LeadershipSeat>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { seats: rows } = await fetchPublicLeadership()
      if (!cancelled) {
        setSeats(rows)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const groups = groupSeatsForDisplay(seats)

  return (
    <>
      <SEOHead
        title="Interim Leadership Team"
        description={`Meet the volunteers steering ${APP_NAME} during the interim period — leaders, organizers, and community advocates.`}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-3">
            Our People
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Interim Leadership Team
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            These are the community members guiding {APP_NAME} during the interim
            period — volunteers giving their time to unite, empower, and support
            Kenyans in Greater Houston.
          </p>
        </div>

        {/* Groups */}
        {loading ? (
          <div className="space-y-12">
            {Array.from({ length: 2 }).map((_, gi) => (
              <section key={gi}>
                <div className="h-3 w-24 bg-muted/60 rounded mb-6 animate-pulse" />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl border bg-muted/30 animate-pulse" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {groups.map((group) => (
              <section key={group.group} aria-labelledby={`group-${group.group}`}>
                <h2
                  id={`group-${group.group}`}
                  className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-5 sm:mb-6"
                >
                  {group.label}
                </h2>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.seats.map((seat) => (
                    <SeatCard key={seat.slug} seat={seat} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-2xl border bg-muted/30 p-8 sm:p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HeartHandshake className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="text-2xl font-bold mb-2">Step up. Serve your community.</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground mb-6">
            Several seats remain open. If you have time, skills, or a heart for
            community service, we'd love to hear from you. Leadership at KIGH is
            about service, not status.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/serve/apply">
                Express interest
                <ArrowRight className="h-4 w-4 ml-1" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </div>

        {/* Subtle footer note */}
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Leadership composition is interim and may change as the community
          elects permanent officers per the{' '}
          <Link to="/governance" className="text-primary underline-offset-4 hover:underline">
            constitution and bylaws
          </Link>
          .
        </p>
      </div>
    </>
  )
}

/* ---------- Sub-components ---------- */

function SeatCard({ seat }: { seat: LeadershipSeat }) {
  const isVacant = seat.name === null
  return (
    <article
      className="group rounded-2xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
      aria-label={isVacant ? `Vacant: ${seat.titles[0]}` : `${seat.name}, ${seat.titles.join(', ')}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {isVacant ? (
            <VacantAvatar />
          ) : seat.photoSrc ? (
            <img
              src={seat.photoSrc}
              alt={`${seat.name}, ${seat.titles[0]}`}
              loading="lazy"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border border-border/60 bg-muted object-cover"
            />
          ) : (
            <InitialsAvatar name={seat.name!} />
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug">
            {isVacant ? 'Seat open' : seat.name}
          </h3>
          <div className="mt-1 space-y-0.5">
            {seat.titles.map((t) => (
              <p key={t} className="text-sm text-muted-foreground leading-snug">
                {t}
              </p>
            ))}
          </div>

          {seat.blurb ? (
            <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{seat.blurb}</p>
          ) : null}

          {isVacant ? (
            <div className="mt-3">
              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <Link to="/serve/apply" className="inline-flex items-center gap-1">
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  Express interest
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function InitialsAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary text-lg font-semibold">
      {initialsForName(name)}
    </div>
  )
}

function VacantAvatar() {
  return (
    <div
      className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground"
      aria-hidden
    >
      <UserPlus className="h-7 w-7" />
    </div>
  )
}
