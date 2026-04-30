import { Link } from 'react-router-dom'
import { MapPin, Phone, Globe, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TierBadge } from '@/components/StatusBadge'
import type { Business } from '@/lib/types'

interface BusinessCardProps {
  business: Business
}

export function BusinessCard({ business }: BusinessCardProps) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/businesses/${business.slug}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="h-14 w-14 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center border">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-7 w-7 text-muted-foreground/40" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                <TierBadge tier={business.tier} />
                <span className="text-xs text-muted-foreground">{business.category}</span>
              </div>
              <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors truncate">
                {business.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{business.description}</p>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 border-t pt-3">
            {business.address && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{business.city}, {business.state}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{business.phone}</span>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{business.website.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
