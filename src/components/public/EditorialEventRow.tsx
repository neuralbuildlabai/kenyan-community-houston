import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Video, ArrowUpRight, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate, cn } from '@/lib/utils'
import { formatCategoryLabel } from '@/lib/communityCategories'
import type { Event } from '@/lib/types'

interface EditorialEventRowProps {
  event: Event
  presentation?: 'default' | 'archive' | 'featured'
  className?: string
}

/**
 * Editorial-style row for the public Events page (Pass 2).
 * Replaces the dense card-grid look with a calmer, premium feel.
 */
export function EditorialEventRow({ event, presentation = 'default', className }: EditorialEventRowProps) {
  const archive = presentation === 'archive'
  const featured = presentation === 'featured'
  const cover = event.image_url || event.flyer_url || null

  return (
    <Link
      to={`/events/${event.slug}`}
      className={cn(
        'group block rounded-2xl border border-border/60 bg-card transition-all',
        'hover:border-primary/40 hover:shadow-[0_8px_40px_-20px_hsl(222_28%_12%/0.25)]',
        archive && 'opacity-[0.95] hover:opacity-100',
        className
      )}
    >
      <article
        className={cn(
          'flex flex-col gap-5 p-5 sm:p-6',
          featured ? 'sm:flex-row sm:items-stretch sm:gap-7' : 'sm:flex-row sm:items-center'
        )}
      >
        {/* Date column */}
        <div
          className={cn(
            'flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-center sm:justify-center sm:gap-1',
            'sm:w-[88px] sm:rounded-xl sm:border sm:border-border/50 sm:bg-secondary/40 sm:py-4'
          )}
          aria-hidden
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            {formatDate(event.start_date, 'MMM')}
          </span>
          <span className="text-2xl sm:text-3xl font-semibold text-foreground leading-none">
            {formatDate(event.start_date, 'd')}
          </span>
          <span className="text-[11px] text-muted-foreground sm:mt-0.5">
            {formatDate(event.start_date, 'EEE')}
          </span>
        </div>

        {/* Cover image — larger for featured rows, compact thumbnail for default rows. */}
        {featured && cover ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted sm:aspect-auto sm:h-auto sm:w-56 sm:flex-shrink-0">
            <img
              src={cover}
              alt={event.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
        ) : !featured && !archive && cover ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted sm:aspect-[4/3] sm:h-20 sm:w-28 sm:flex-shrink-0">
            <img
              src={cover}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
        ) : null}

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[11px]">
              {formatCategoryLabel(event.category)}
            </Badge>
            {event.is_featured ? (
              <Badge variant="gold" className="gap-1 text-[11px]">
                <Star className="h-3 w-3" /> Featured
              </Badge>
            ) : null}
            {event.is_virtual ? (
              <Badge variant="outline" className="gap-1 text-[11px] border-primary/40">
                <Video className="h-3 w-3" /> Virtual
              </Badge>
            ) : null}
            {event.is_free ? (
              <Badge variant="success" className="text-[11px]">Free</Badge>
            ) : event.ticket_price ? (
              <span className="text-[11px] text-muted-foreground">${event.ticket_price}</span>
            ) : null}
            {archive ? <Badge variant="muted" className="text-[11px]">Past</Badge> : null}
          </div>

          <h3
            className={cn(
              'font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2',
              featured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-[1.1875rem]'
            )}
          >
            {event.title}
          </h3>

          {event.short_description || event.description ? (
            <p className={cn('mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2', featured && 'sm:text-[15px]')}>
              {event.short_description || event.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary/60" />
              {formatDate(event.start_date, 'EEEE, MMMM d')}
            </span>
            {event.start_time ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary/60" />
                {event.start_time.slice(0, 5)}
              </span>
            ) : null}
            {!event.is_virtual && event.location ? (
              <span className="inline-flex items-center gap-1.5 max-w-full">
                <MapPin className="h-3.5 w-3.5 text-primary/60" />
                <span className="truncate">{event.location}</span>
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
