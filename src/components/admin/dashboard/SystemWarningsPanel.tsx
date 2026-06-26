import { Link } from 'react-router-dom'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SystemWarning } from '@/lib/adminDashboardApi'

type SystemWarningsPanelProps = {
  warnings: SystemWarning[]
  loading?: boolean
}

function SeverityIcon({ severity }: { severity: SystemWarning['severity'] }) {
  if (severity === 'critical') {
    return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-700" aria-hidden />
  }
  if (severity === 'warning') {
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
  }
  return <Info className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
}

function warningStyles(severity: SystemWarning['severity']): string {
  if (severity === 'critical') {
    return 'bg-rose-50/60 hover:bg-rose-50'
  }
  if (severity === 'warning') {
    return 'bg-amber-50/60 hover:bg-amber-50'
  }
  return 'hover:bg-slate-50/80'
}

export function SystemWarningsPanel({ warnings, loading = false }: SystemWarningsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100/80" />
        ))}
      </div>
    )
  }

  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-kenyan-green-50/50 px-3 py-3 text-sm text-kenyan-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        <span>No active system warnings from current metrics.</span>
      </div>
    )
  }

  return (
    <ul className="space-y-1">
      {warnings.map((warning) => (
        <li key={`${warning.title}-${warning.checked_at}`}>
          <Link
            to={warning.route}
            className={cn(
              'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
              warningStyles(warning.severity)
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                warning.severity === 'critical' && 'bg-rose-100/80',
                warning.severity === 'warning' && 'bg-amber-100/80',
                warning.severity === 'info' && 'bg-slate-100'
              )}
            >
              <SeverityIcon severity={warning.severity} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{warning.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{warning.description}</p>
            </div>
            {warning.count > 0 ? (
              <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-sm font-semibold tabular-nums text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                {warning.count}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
