import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PageLoader } from '@/components/LoadingSpinner'

/**
 * Page area of a layout. The header and navigation stay on screen while
 * a page's chunk loads or if it fails; navigating clears an error.
 */
export function RouteOutlet() {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  )
}
