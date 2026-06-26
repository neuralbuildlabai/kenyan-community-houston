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
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100/80" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <DashboardEmptyState
        title="No upcoming events"
        description="Published events with future start dates will appear here."
        icon={<Calendar className="h-7 w-7 text-muted-foreground/50" aria-hidden />}
      />
    )
  }

  return (
    <ul className="space-y-1">
      {events.map((event) => {
        const badge = eventDateBadge(event.start_date)
        const hasTime = event.start_date.includes('T')
        return (
          <li key={event.id}>
            <Link
              to="/admin/calendar"
              className="group flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50/80"
            >
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-kenyan-green-50 to-white text-center shadow-[inset_0_0_0_1px_rgba(22,101,52,0.08)]">
                <span className="text-[9px] font-semibold leading-none tracking-wide text-kenyan-green-700">
                  {badge.month}
                </span>
                <span className="text-base font-bold leading-tight text-foreground">{badge.day}</span>
              </div>
              <div className="min-w-0 flex-1 border-l border-slate-100 pl-3">
                <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">{event.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {hasTime ? formatDateTime(event.start_date) : formatDateShort(event.start_date)}
                </p>
                {event.location ? (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
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
    <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-primary hover:bg-kenyan-green-50">
      <Link to="/admin/calendar">
        Manage calendar <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </Button>
  )
}
