import { Link } from 'react-router-dom'
import { ArrowRight, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCategoryLabel } from '@/lib/communityCategories'
import { formatDate } from '@/lib/utils'
import type { Announcement } from '@/lib/types'

interface HomeAnnouncementCardProps {
  announcement: Announcement
}

export function HomeAnnouncementCard({ announcement: a }: HomeAnnouncementCardProps) {
  return (
    <Link
      to={`/announcements/${a.slug}`}
      data-testid="home-announcement-card"
      className="group block rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md sm:p-6"
    >
      <div className="mb-2">
        <Badge variant="secondary" className="text-[11px]">
          {formatCategoryLabel(a.category)}
        </Badge>
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
        {a.title}
      </h3>
      {a.summary ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {a.summary}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {a.published_at ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary/60" aria-hidden />
            <time dateTime={a.published_at}>{formatDate(a.published_at, 'MMM d, yyyy')}</time>
          </span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Read update
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  )
}
