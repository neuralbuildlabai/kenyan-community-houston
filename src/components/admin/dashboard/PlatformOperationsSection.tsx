import { Link } from 'react-router-dom'
import { Server } from 'lucide-react'
import { DashboardSectionCard } from '@/components/admin/dashboard/DashboardSectionCard'
import { DatabaseOverviewCard } from '@/components/admin/dashboard/DatabaseOverviewCard'
import { LargestTablesPanel } from '@/components/admin/dashboard/LargestTablesPanel'
import { StorageOverviewPanel } from '@/components/admin/dashboard/StorageOverviewPanel'
import { SystemWarningsPanel } from '@/components/admin/dashboard/SystemWarningsPanel'
import type { DashboardInfrastructureSummary } from '@/lib/adminDashboardApi'

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

  return (
    <DashboardSectionCard
      title="Platform Operations"
      description="Database, storage, and system health metrics visible to super admins only."
      icon={<Server className="h-4 w-4 text-primary" aria-hidden />}
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
        <p role="status" className="mb-4 text-xs text-amber-800">
          {error}
        </p>
      ) : null}
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DatabaseOverviewCard database={database ?? { database_size_bytes: 0, database_size_pretty: '', table_count: 0, analytics_events_size_bytes: null, analytics_events_size_pretty: null, notes: '' }} loading={loading} />
          <StorageOverviewPanel
            storage={
              storage ?? {
                buckets: [],
                total_object_count: 0,
                total_size_bytes: null,
                total_size_pretty: null,
                unavailable_reason: null,
              }
            }
            loading={loading}
          />
        </div>
        <LargestTablesPanel tables={tables} loading={loading} />
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">System warnings</h3>
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
