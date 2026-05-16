import { Link } from 'react-router-dom'
import { MapPin, Phone, Globe, Building2, ArrowUpRight } from 'lucide-react'
import { TierBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
import type { Business } from '@/lib/types'

interface EditorialBusinessRowProps {
  business: Business
  className?: string
}

/**
 * Editorial-style row for the Business Directory (Pass 2).
 * Premium guide feel that replaces the dense card-grid look.
 */
export function EditorialBusinessRow({ business: b, className }: EditorialBusinessRowProps) {
  return (
    <Link
      to={`/businesses/${b.slug}`}
      className={cn(
        'group block rounded-2xl border border-border/60 bg-card transition-all',
        'hover:border-primary/40 hover:shadow-[0_8px_40px_-20px_hsl(222_28%_12%/0.25)]',
        className
      )}
    >
      <article className="flex flex-col gap-5 p-5 sm:flex-row sm:items-stretch sm:gap-6 sm:p-6">
        {/* Logo */}
        <div className="flex shrink-0 items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-secondary/40 sm:h-24 sm:w-24">
            {b.logo_url ? (
              <img
                src={b.logo_url}
                alt={b.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-9 w-9 text-primary/40" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <TierBadge tier={b.tier} />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80">
              {b.category}
            </span>
          </div>
          <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
            {b.name}
          </h3>
          {b.description ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {b.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
            {(b.city || b.state) ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary/60" />
                {[b.city, b.state].filter(Boolean).join(', ')}
              </span>
            ) : null}
            {b.phone ? (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary/60" />
                {b.phone}
              </span>
            ) : null}
            {b.website ? (
              <span className="inline-flex items-center gap-1.5 truncate max-w-[18rem]">
                <Globe className="h-3.5 w-3.5 text-primary/60" />
                <span className="truncate">
                  {b.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </span>
              </span>
            ) : null}
          </div>
        </div>

        {/* CTA chevron */}
        <div className="hidden shrink-0 items-center text-primary/70 transition-transform group-hover:translate-x-0.5 sm:flex">
          <ArrowUpRight className="h-5 w-5" />
        </div>
      </article>
    </Link>
  )
}
