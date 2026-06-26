import { Link } from 'react-router-dom'
import { Server } from 'lucide-react'
import { DashboardSectionCard } from '@/components/admin/dashboard/DashboardSectionCard'
import { DatabaseOverviewCard } from '@/components/admin/dashboard/DatabaseOverviewCard'
import { LargestTablesPanel } from '@/components/admin/dashboard/LargestTablesPanel'
import { StorageOverviewPanel } from '@/components/admin/dashboard/StorageOverviewPanel'
import { SystemWarningsPanel } from '@/components/admin/dashboard/SystemWarningsPanel'
import { EMPTY_DASHBOARD_INFRASTRUCTURE, type DashboardInfrastructureSummary } from '@/lib/adminDashboardApi'

type PlatformOperationsSectionProps = {
  infrastructure: DashboardInfrastructureSummary | null
  loading?: boolean
  error?: string | null
  showSystemHealthLink?: boolean
}

export function PlatformOperationsSection({
  infrastructure,
  loading = false,
  error = null,
  showSystemHealthLink = false,
}: PlatformOperationsSectionProps) {
  const database = infrastructure?.database
  const storage = infrastructure?.storage
  const tables = infrastructure?.largest_tables ?? []
  const warnings = infrastructure?.warnings ?? []

  const warningCount = warnings.length
  const tableCount = database?.table_count ?? 0
  const objectCount = storage?.total_object_count ?? 0

  return (
    <DashboardSectionCard
      id="platform-operations"
      title="Platform Operations"
      description="Database, storage, and system health metrics visible to super admins only."
      variant="system"
      icon={
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/70 text-slate-600">
          <Server className="h-3.5 w-3.5" aria-hidden />
        </span>
      }
      action={
        showSystemHealthLink ? (
          <Link
            to="/admin/system-health"
            className="text-xs font-medium text-primary hover:underline"
          >
            Full system health →
          </Link>
        ) : null
      }
    >
      {error ? (
        <p role="status" className="mb-4 rounded-xl bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
          {error}
        </p>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-100/60 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Public tables</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {loading ? '—' : tableCount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-slate-100/60 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Storage objects</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {loading ? '—' : objectCount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-slate-100/60 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Active warnings</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {loading ? '—' : warningCount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DatabaseOverviewCard database={database ?? EMPTY_DASHBOARD_INFRASTRUCTURE.database} loading={loading} />
          <StorageOverviewPanel storage={storage ?? EMPTY_DASHBOARD_INFRASTRUCTURE.storage} loading={loading} />
        </div>
        <LargestTablesPanel tables={tables} loading={loading} />
        <div>
          <h3 className="mb-2 text-sm font-semibold tracking-tight text-foreground">System warnings</h3>
          <SystemWarningsPanel warnings={warnings} loading={loading} />
        </div>
        {infrastructure?.checked_at ? (
          <p className="text-[10px] text-muted-foreground">
            Metrics checked at {new Date(infrastructure.checked_at).toLocaleString()}
          </p>
        ) : null}
      </div>
    </DashboardSectionCard>
  )
}
