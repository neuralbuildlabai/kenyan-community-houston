import { Link } from 'react-router-dom'
import { Clock, ArrowUpRight, Star, Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { timeAgo, cn } from '@/lib/utils'
import { formatCategoryLabel } from '@/lib/communityCategories'
import type { Announcement } from '@/lib/types'

interface EditorialAnnouncementRowProps {
  announcement: Announcement
  presentation?: 'default' | 'featured'
  className?: string
}

/**
 * Editorial-style announcement row (Pass 2). Premium official feel — text-first,
 * with optional small image rail. Featured presentation gets a hero image strip.
 */
export function EditorialAnnouncementRow({
  announcement: a,
  presentation = 'default',
  className,
}: EditorialAnnouncementRowProps) {
  const featured = presentation === 'featured'

  return (
    <Link
      to={`/announcements/${a.slug}`}
      className={cn(
        'group block rounded-2xl border border-border/60 bg-card transition-all',
        'hover:border-primary/40 hover:shadow-[0_8px_40px_-20px_hsl(222_28%_12%/0.25)]',
        className
      )}
    >
      <article
        className={cn(
          'flex flex-col gap-5 p-5 sm:p-6',
          featured ? 'sm:flex-row sm:items-stretch sm:gap-7' : 'sm:flex-row sm:items-center'
        )}
      >
        {featured && a.image_url ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted sm:aspect-auto sm:h-auto sm:w-72 sm:flex-shrink-0">
            <img
              src={a.image_url}
              alt={a.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[11px]">
              {formatCategoryLabel(a.category)}
            </Badge>
            {a.is_pinned ? (
              <Badge variant="green" className="gap-1 text-[11px]">
                <Pin className="h-3 w-3" /> Pinned
              </Badge>
            ) : null}
            {a.is_featured ? (
              <Badge variant="gold" className="gap-1 text-[11px]">
                <Star className="h-3 w-3" /> Featured
              </Badge>
            ) : null}
          </div>

          <h3
            className={cn(
              'font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-2',
              featured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-[1.1875rem]'
            )}
          >
            {a.title}
          </h3>

          {a.summary ? (
            <p
              className={cn(
                'mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2',
                featured && 'sm:text-[15px] sm:line-clamp-3'
              )}
            >
              {a.summary}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            {a.author_name ? <span>{a.author_name}</span> : null}
            {a.author_name && a.published_at ? (
              <span aria-hidden className="text-muted-foreground/40">·</span>
            ) : null}
            {a.published_at ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary/60" />
                {timeAgo(a.published_at)}
              </span>
            ) : null}
            <span aria-hidden className="text-muted-foreground/40 hidden sm:inline">·</span>
            <span className="hidden text-primary/80 group-hover:text-primary sm:inline-flex items-center gap-1 font-medium">
              Read more <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
