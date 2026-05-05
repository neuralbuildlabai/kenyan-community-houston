import { Link } from 'react-router-dom'
import { Clock, Megaphone, Star, Pin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { timeAgo } from '@/lib/utils'
import { formatCategoryLabel } from '@/lib/communityCategories'
import type { Announcement } from '@/lib/types'

interface AnnouncementCardProps {
  announcement: Announcement
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/announcements/${announcement.slug}`}>
        <div className="relative h-36 bg-muted overflow-hidden">
          {announcement.image_url ? (
            <img
              src={announcement.image_url}
              alt={announcement.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-kenyan-gold-50 to-kenyan-green-100">
              <Megaphone className="h-10 w-10 text-primary/30" />
            </div>
          )}
          {announcement.is_pinned && (
            <div className="absolute top-2 left-2">
              <Badge variant="green" className="gap-1 text-xs">
                <Pin className="h-3 w-3" /> Pinned
              </Badge>
            </div>
          )}
          {announcement.is_featured && (
            <div className="absolute top-2 right-2">
              <Badge variant="gold" className="gap-1 text-xs">
                <Star className="h-3 w-3" /> Featured
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="mb-1.5">
            <Badge variant="secondary" className="text-xs">{formatCategoryLabel(announcement.category)}</Badge>
          </div>
          <h3 className="font-semibold text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {announcement.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{announcement.summary}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{announcement.author_name}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {announcement.published_at ? timeAgo(announcement.published_at) : 'Recent'}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
