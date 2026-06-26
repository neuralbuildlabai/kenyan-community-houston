import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminDashboardSummary } from '@/lib/adminDashboardApi'

type AttentionItem = {
  label: string
  value: number
  href: string
  emptyLabel: string
  testId: string
}

function buildAttentionItems(summary: AdminDashboardSummary | null): AttentionItem[] {
  if (!summary) return []

  const pendingContent =
    summary.events.pending +
    summary.announcements.pending +
    summary.businesses.pending +
    summary.fundraisers.pending +
    summary.public_submissions.pending_total

  return [
    {
      label: 'Pending content submissions',
      value: pendingContent,
      href: '/admin/submissions?status=pending',
      emptyLabel: 'No pending submissions.',
      testId: 'attention-submissions',
    },
    {
      label: 'Pending membership applications',
      value: summary.members.pending,
      href: '/admin/members?membershipStatus=pending',
      emptyLabel: 'No pending membership applications.',
      testId: 'attention-members',
    },
    {
      label: 'New contact messages',
      value: summary.contact_messages.new,
      href: '/admin/contacts?status=new',
      emptyLabel: 'No unread contact messages.',
      testId: 'attention-contacts',
    },
    {
      label: 'Gallery images pending review',
      value: summary.gallery.pending_images,
      href: '/admin/gallery?tab=review',
      emptyLabel: 'No pending gallery images.',
      testId: 'attention-gallery',
    },
    {
      label: 'Media submissions pending review',
      value: summary.member_media_submissions.pending,
      href: '/admin/media-submissions?status=pending',
      emptyLabel: 'No pending media submissions.',
      testId: 'attention-media-submissions',
    },
    {
      label: 'Expiring announcements',
      value: summary.announcements.expiring_soon,
      href: '/admin/announcements',
      emptyLabel: 'No announcements expiring soon.',
      testId: 'attention-announcements',
    },
    {
      label: 'Submitted volunteer signups',
      value: summary.volunteers.submitted,
      href: '/admin/volunteers',
      emptyLabel: 'No submitted volunteer signups.',
      testId: 'attention-volunteers',
    },
    {
      label: 'Submitted vendor signups',
      value: summary.vendors.submitted,
      href: '/admin/vendors',
      emptyLabel: 'No submitted vendor signups.',
      testId: 'attention-vendors',
    },
  ]
}

type NeedsAttentionPanelProps = {
  summary: AdminDashboardSummary | null
  loading?: boolean
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const needsAction = item.value > 0
  return (
    <Link
      to={item.href}
      data-testid={item.testId}
      title={needsAction ? `${item.value} ${item.label.toLowerCase()}` : item.emptyLabel}
      className={cn(
        'group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors',
        needsAction
          ? 'bg-amber-50/60 hover:bg-amber-50'
          : 'hover:bg-slate-50/80'
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5 text-[13px] leading-snug text-foreground/80">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            needsAction ? 'bg-amber-100/90 text-amber-800' : 'bg-kenyan-green-100/60 text-kenyan-green-700'
          )}
        >
          {needsAction ? (
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          )}
        </span>
        <span className="truncate">{item.label}</span>
      </span>
      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums',
          needsAction ? 'bg-amber-200/50 text-amber-900' : 'bg-slate-100 text-slate-600'
        )}
        aria-label={needsAction ? `${item.value} need attention` : `${item.value}, no action needed`}
      >
        {item.value}
      </span>
    </Link>
  )
}

export function NeedsAttentionPanel({ summary, loading = false }: NeedsAttentionPanelProps) {
  const items = buildAttentionItems(summary)

  if (loading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100/80" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {items.map((item) => (
        <AttentionRow key={item.testId} item={item} />
      ))}
    </div>
  )
}
