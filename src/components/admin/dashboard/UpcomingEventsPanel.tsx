import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateShort, formatDateTime } from '@/lib/utils'
import { DashboardEmptyState } from '@/components/admin/dashboard/DashboardEmptyState'

export type UpcomingEventItem = {
  id: string
  title: string
  start_date: string
  location: string | null
}

type UpcomingEventsPanelProps = {
  events: UpcomingEventItem[]
  loading?: boolean
}

function eventDateBadge(dateStr: string): { month: string; day: string } {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`)
    return {
      month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      day: String(d.getDate()),
    }
  } catch {
    return { month: '—', day: '—' }
  }
}

export function UpcomingEventsPanel({ events, loading = false }: UpcomingEventsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <DashboardEmptyState
        title="No upcoming events"
        description="Published events with future start dates will appear here."
        icon={<Calendar className="h-8 w-8 text-muted-foreground/60" aria-hidden />}
      />
    )
  }

  return (
    <ul className="divide-y divide-border/60">
      {events.map((event) => {
        const badge = eventDateBadge(event.start_date)
        const hasTime = event.start_date.includes('T')
        return (
          <li key={event.id}>
            <Link
              to="/admin/calendar"
              className="flex gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/20 -mx-1 px-1 rounded-md transition-colors"
            >
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/20 bg-primary/[0.06] text-center">
                <span className="text-[10px] font-semibold leading-none text-primary">{badge.month}</span>
                <span className="text-lg font-bold leading-tight text-foreground">{badge.day}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{event.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {hasTime ? formatDateTime(event.start_date) : formatDateShort(event.start_date)}
                </p>
                {event.location ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    {event.location}
                  </p>
                ) : null}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function UpcomingEventsPanelHeaderAction() {
  return (
    <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-primary">
      <Link to="/admin/calendar">
        Manage calendar <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </Button>
  )
}
