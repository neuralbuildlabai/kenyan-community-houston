import { Link } from 'react-router-dom'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SystemWarning } from '@/lib/adminDashboardApi'

type SystemWarningsPanelProps = {
  warnings: SystemWarning[]
  loading?: boolean
}

function SeverityIcon({ severity }: { severity: SystemWarning['severity'] }) {
  if (severity === 'critical') {
    return <AlertCircle className="h-4 w-4 shrink-0 text-red-700" aria-hidden />
  }
  if (severity === 'warning') {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
  }
  return <Info className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
}

function warningStyles(severity: SystemWarning['severity']): string {
  if (severity === 'critical') {
    return 'border-red-200/80 bg-red-50/40 hover:border-red-300'
  }
  if (severity === 'warning') {
    return 'border-amber-200/80 bg-amber-50/40 hover:border-amber-300'
  }
  return 'border-border/60 bg-muted/10 hover:border-primary/25'
}

export function SystemWarningsPanel({ warnings, loading = false }: SystemWarningsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
    )
  }

  if (warnings.length === 0) {
    return (
      <p className="rounded-lg border border-border/60 bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
        No active system warnings from current metrics.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {warnings.map((warning) => (
        <Link
          key={`${warning.title}-${warning.checked_at}`}
          to={warning.route}
          className={cn(
            'flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
            warningStyles(warning.severity)
          )}
        >
          <SeverityIcon severity={warning.severity} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{warning.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{warning.description}</p>
          </div>
          {warning.count > 0 ? (
            <span className="shrink-0 text-lg font-bold tabular-nums text-foreground">{warning.count}</span>
          ) : null}
        </Link>
      ))}
    </div>
  )
}
