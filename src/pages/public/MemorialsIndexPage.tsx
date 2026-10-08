import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PublicSection } from '@/components/public/PublicSection'
import { MEMORIALS, memorialPath, type MemorialEntry } from '@/lib/memorials'
import {
  ARCHIVED_MEMORIALS_HEADING,
  partitionMemorials,
  type MemorialStatusMap,
} from '@/lib/memorialLifecycle'
import { fetchMemorialStatuses } from '@/lib/memorialStatesApi'
import { APP_NAME } from '@/lib/constants'

function MemorialRow({ memorial }: { memorial: MemorialEntry }) {
  return (
    <li>
      <Link
        to={memorialPath(memorial.slug)}
        className="group block rounded-2xl border border-border/60 bg-gradient-to-b from-card to-secondary/20 px-6 py-7 transition-colors hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
      >
        <div className="flex items-start gap-4">
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            aria-hidden
          >
            <Heart className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {memorial.memorialHeading}
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground group-hover:text-primary sm:text-2xl">
              {memorial.fullName}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {memorial.dateOfBirth}
              {memorial.dateOfPassing ? ` – ${memorial.dateOfPassing}` : ''}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              {memorial.summary}
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-primary underline decoration-primary/25 underline-offset-[5px] group-hover:decoration-primary/70">
              Visit memorial
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}

export function MemorialsIndexPage() {
  // Memorials render from the code registry immediately; the lifecycle
  // overlay only moves archived services into the quieter list below. If it
  // never arrives, every memorial stays promoted.
  const [statuses, setStatuses] = useState<MemorialStatusMap>({})

  useEffect(() => {
    let active = true
    fetchMemorialStatuses()
      .then(({ statuses: next }) => {
        if (active) setStatuses(next)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const { promoted, archived } = partitionMemorials(MEMORIALS, statuses)

  return (
    <>
      <SEOHead
        title="Memorials"
        description={`Remembrance pages shared with care by ${APP_NAME}.`}
        canonicalPath="/memorials"
      />

      <PublicPageHero
        eyebrow="In remembrance"
        title="Memorials"
        subtitle="A quiet place to honor members of our community whose lives we hold dear."
        tone="cream"
        compact
      />

      <PublicSection className="!py-10 sm:!py-12 lg:!py-14">
        <div className="mx-auto max-w-2xl space-y-10">
          <ul className="space-y-6">
            {promoted.map((memorial) => (
              <MemorialRow key={memorial.slug} memorial={memorial} />
            ))}
          </ul>

          {archived.length > 0 && (
            <section aria-labelledby="archived-memorials-heading" className="space-y-5">
              <div className="border-t border-border/60 pt-8">
                <h2
                  id="archived-memorials-heading"
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  {ARCHIVED_MEMORIALS_HEADING}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Services that have taken place. These pages remain online in remembrance.
                </p>
              </div>
              <ul className="space-y-4 opacity-90">
                {archived.map((memorial) => (
                  <li key={memorial.slug}>
                    <Link
                      to={memorialPath(memorial.slug)}
                      className="group flex items-baseline justify-between gap-4 rounded-xl border border-border/50 bg-card/60 px-5 py-4 transition-colors hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-base font-medium text-foreground group-hover:text-primary">
                          {memorial.fullName}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {memorial.dateOfBirth}
                          {memorial.dateOfPassing ? ` – ${memorial.dateOfPassing}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-primary/90">Visit</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </PublicSection>
    </>
  )
}
