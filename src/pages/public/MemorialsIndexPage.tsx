import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PublicSection } from '@/components/public/PublicSection'
import { MEMORIALS, memorialPath } from '@/lib/memorials'
import { APP_NAME } from '@/lib/constants'

export function MemorialsIndexPage() {
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
        <ul className="mx-auto max-w-2xl space-y-6">
          {MEMORIALS.map((memorial) => (
            <li key={memorial.slug}>
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
          ))}
        </ul>
      </PublicSection>
    </>
  )
}
