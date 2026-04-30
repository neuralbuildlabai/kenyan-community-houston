import { Link } from 'react-router-dom'
import { Heart, Target, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { VerificationBadge } from '@/components/StatusBadge'
import { formatCurrency, timeAgo } from '@/lib/utils'
import type { Fundraiser } from '@/lib/types'

interface FundraiserCardProps {
  fundraiser: Fundraiser
}

export function FundraiserCard({ fundraiser }: FundraiserCardProps) {
  const progress = fundraiser.goal_amount
    ? Math.min((fundraiser.raised_amount / fundraiser.goal_amount) * 100, 100)
    : null

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/community-support/${fundraiser.slug}`}>
        <div className="relative h-40 bg-muted overflow-hidden">
          {fundraiser.image_url ? (
            <img
              src={fundraiser.image_url}
              alt={fundraiser.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-kenyan-red-50 to-pink-50">
              <Heart className="h-12 w-12 text-kenyan-red-300" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <VerificationBadge status={fundraiser.verification_status} />
          </div>
        </div>

        <CardContent className="p-4">
          <div className="mb-1.5">
            <Badge variant="secondary" className="text-xs">{fundraiser.category}</Badge>
          </div>

          <h3 className="font-semibold text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {fundraiser.title}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{fundraiser.summary}</p>

          {/* Progress */}
          {fundraiser.goal_amount && (
            <div className="space-y-1.5">
              <Progress value={progress ?? 0} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {formatCurrency(fundraiser.raised_amount)} raised
                </span>
                <span>of {formatCurrency(fundraiser.goal_amount)} goal</span>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>For: {fundraiser.beneficiary_name}</span>
            {fundraiser.published_at && (
              <span>{timeAgo(fundraiser.published_at)}</span>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
