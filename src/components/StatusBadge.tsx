import { Badge } from '@/components/ui/badge'
import { statusLabel, fundVerificationLabel, businessTierLabel } from '@/lib/utils'
import type { ContentStatus, FundraiserVerificationStatus, BusinessTier } from '@/lib/types'

export function StatusBadge({ status }: { status: ContentStatus }) {
  const variantMap: Record<ContentStatus, 'success' | 'warning' | 'default' | 'destructive' | 'muted' | 'info'> = {
    published: 'success',
    approved: 'info',
    pending_review: 'warning',
    draft: 'muted',
    unpublished: 'muted',
    archived: 'muted',
    rejected: 'destructive',
  }
  return <Badge variant={variantMap[status]}>{statusLabel(status)}</Badge>
}

export function VerificationBadge({ status }: { status: FundraiserVerificationStatus }) {
  const variantMap: Record<FundraiserVerificationStatus, 'success' | 'warning' | 'default' | 'destructive'> = {
    verified: 'success',
    under_review: 'warning',
    unverified: 'default',
    flagged: 'destructive',
  }
  return <Badge variant={variantMap[status]}>{fundVerificationLabel(status)}</Badge>
}

export function TierBadge({ tier }: { tier: BusinessTier }) {
  const variantMap: Record<BusinessTier, 'muted' | 'success' | 'gold' | 'warning'> = {
    free: 'muted',
    verified: 'success',
    featured: 'gold',
    sponsor: 'warning',
  }
  return <Badge variant={variantMap[tier]}>{businessTierLabel(tier)}</Badge>
}
