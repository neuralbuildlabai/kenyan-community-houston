import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { DashboardEmptyState } from '@/components/admin/dashboard/DashboardEmptyState'

export type RecentActivityItem = {
  id: string
  title: string
  status: string
  created_at: string
  type: string
  href?: string
}

type RecentActivityPanelProps = {
  items: RecentActivityItem[]
  loading?: boolean
}

function activityHref(item: RecentActivityItem): string {
  if (item.href) return item.href
  switch (item.type) {
    case 'Event':
      return '/admin/calendar'
    case 'Announcement':
      return '/admin/announcements'
    case 'Business':
      return '/admin/businesses'
    case 'Fundraiser':
      return '/admin/fundraisers'
    case 'Contact':
      return '/admin/contacts'
    case 'Media':
      return '/admin/media-submissions'
    case 'Member':
      return '/admin/members'
    default:
      return '/admin/submissions'
  }
}

function statusPillClass(status: string): string {
  if (status === 'published' || status === 'active' || status === 'approved') {
    return 'bg-kenyan-green-100/70 text-kenyan-green-800'
  }
  if (status === 'pending' || status === 'new' || status === 'submitted') {
    return 'bg-amber-100/70 text-amber-900'
  }
  return 'bg-slate-100 text-slate-600'
}

export function RecentActivityPanel({ items, loading = false }: RecentActivityPanelProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100/80" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <DashboardEmptyState
        title="No recent activity"
        description="New events, submissions, and messages will appear here as they arrive."
      />
    )
  }

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <Link
          key={`${item.type}-${item.id}`}
          to={activityHref(item)}
          className="group flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50/80"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">{item.type}</span>
              <span aria-hidden> · </span>
              {formatDateShort(item.created_at)}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
              statusPillClass(item.status)
            )}
          >
            {item.status}
          </span>
        </Link>
      ))}
    </div>
  )
}

export function RecentActivityPanelHeaderAction() {
  return (
    <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-primary hover:bg-kenyan-green-50">
      <Link to="/admin/submissions">
        View queue <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </Button>
  )
}
