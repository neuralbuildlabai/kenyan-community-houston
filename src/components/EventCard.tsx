import { Link } from 'react-router-dom'
import { Calendar, MapPin, Tag, Star, Video } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { isEventPast } from '@/lib/eventDate'
import type { Event } from '@/lib/types'

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const past = isEventPast(event.start_date)
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/events/${event.slug}`}>
        {/* Image */}
        <div className="relative h-44 bg-muted overflow-hidden">
          {(event.image_url || event.flyer_url) ? (
            <img
              src={event.image_url || event.flyer_url || ''}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-kenyan-gold-100">
              <Calendar className="h-12 w-12 text-primary/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {/* Date chip */}
          <div className="absolute bottom-2 left-3 flex items-center gap-1 text-white text-xs font-medium">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(event.start_date, 'EEE, MMM d')}
          </div>
          {event.is_featured && (
            <div className="absolute top-2 right-2">
              <Badge variant="gold" className="gap-1">
                <Star className="h-3 w-3" /> Featured
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">{event.category}</Badge>
            {past ? (
              <Badge variant="muted" className="text-xs">Past event</Badge>
            ) : null}
            {event.is_virtual ? (
              <Badge variant="outline" className="text-xs gap-0.5 border-primary/40">
                <Video className="h-3 w-3" /> Virtual
              </Badge>
            ) : null}
            {event.is_free ? (
              <Badge variant="success" className="text-xs">Free</Badge>
            ) : event.ticket_price ? (
              <span className="text-xs text-muted-foreground">${event.ticket_price}</span>
            ) : null}
          </div>

          <h3 className="font-semibold text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {event.title}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {event.short_description || event.description}
          </p>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>

          {event.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {event.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="h-2.5 w-2.5" />{tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  )
}
