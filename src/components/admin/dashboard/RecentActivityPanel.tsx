import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateShort } from '@/lib/utils'
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

function statusVariant(status: string): 'default' | 'outline' | 'secondary' {
  if (status === 'published' || status === 'active' || status === 'approved') return 'default'
  if (status === 'pending' || status === 'new' || status === 'submitted') return 'outline'
  return 'secondary'
}

export function RecentActivityPanel({ items, loading = false }: RecentActivityPanelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
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
    <div className="divide-y divide-border/60">
      {items.map((item) => (
        <Link
          key={`${item.type}-${item.id}`}
          to={activityHref(item)}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/20 -mx-1 px-1 rounded-md transition-colors"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item.type} · {formatDateShort(item.created_at)}
            </p>
          </div>
          <Badge variant={statusVariant(item.status)} className="shrink-0 text-xs">
            {item.status}
          </Badge>
        </Link>
      ))}
    </div>
  )
}

export function RecentActivityPanelHeaderAction() {
  return (
    <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-primary">
      <Link to="/admin/submissions">
        View queue <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </Button>
  )
}
