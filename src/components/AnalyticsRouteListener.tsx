import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '@/lib/analytics'

/** Fires a lightweight page_view per client navigation (best-effort). */
export function AnalyticsRouteListener() {
  const location = useLocation()

  useEffect(() => {
    const path = `${location.pathname}${location.search}`.slice(0, 2048)
    void trackPageView(path)
  }, [location.pathname, location.search])

  return null
}
