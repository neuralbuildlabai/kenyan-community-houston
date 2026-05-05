import { ExternalLink, MapPin } from 'lucide-react'
import { googleMapsSearchUrl } from '@/lib/maps'
import { trackMapOpen } from '@/lib/analytics'
import { cn } from '@/lib/utils'

type MapLinkProps = {
  address?: string | null
  location?: string | null
  className?: string
  children?: React.ReactNode
  /** Shown when children omitted */
  linkText?: string
}

export function MapLink({ address, location, className, children, linkText = 'Open in Google Maps' }: MapLinkProps) {
  const href = googleMapsSearchUrl({ address, location })
  if (!href) return null
  const preview = (address ?? '').trim() || (location ?? '').trim()

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4',
        className
      )}
      onClick={() => void trackMapOpen('map_open', preview)}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" />
      {children ?? (
        <>
          {linkText}
          <ExternalLink className="h-3 w-3 opacity-70" />
        </>
      )}
    </a>
  )
}
