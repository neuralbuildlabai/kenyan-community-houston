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
        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        needsAction
          ? 'border-amber-200/80 bg-amber-50/50 hover:border-amber-300'
          : 'border-border/60 bg-muted/10 hover:border-primary/25'
      )}
    >
      <span className="flex items-start gap-2 text-sm leading-snug text-muted-foreground">
        {needsAction ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" aria-hidden />
        )}
        <span>{item.label}</span>
      </span>
      <span
        className={cn(
          'text-lg font-bold tabular-nums shrink-0',
          needsAction ? 'text-amber-900' : 'text-foreground'
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
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <AttentionRow key={item.testId} item={item} />
      ))}
    </div>
  )
}
