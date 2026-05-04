import { AlertTriangle } from 'lucide-react'
import { appEnv, isProduction, APP_ENV_LABEL } from '@/lib/appEnv'

/**
 * Shows a non-dismissable banner whenever the app is NOT running in
 * production. This helps prevent confusion (and accidental "real"
 * data entry) on staging / UAT / development deployments.
 *
 * Renders nothing in production.
 */
export function StagingBanner() {
  if (isProduction) {
    return null
  }

  const label = APP_ENV_LABEL[appEnv]

  return (
    <div
      role="status"
      data-testid="staging-banner"
      data-env={appEnv}
      className="w-full bg-amber-500 text-amber-950 text-xs sm:text-sm font-medium border-b border-amber-700"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-1.5 flex items-center gap-2 justify-center">
        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden />
        <span>
          {label}
          {' — '}
          this is a non-production environment. Do not enter real data.
        </span>
      </div>
    </div>
  )
}
