import { HardDrive } from 'lucide-react'
import type { StorageOverview } from '@/lib/adminDashboardApi'

type StorageOverviewPanelProps = {
  storage: StorageOverview
  loading?: boolean
}

export function StorageOverviewPanel({ storage, loading = false }: StorageOverviewPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-white p-4">
        <div className="mb-3 h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted/60" />
          ))}
        </div>
      </div>
    )
  }

  const totalSize =
    storage.total_size_pretty ??
    (storage.total_size_bytes != null ? `${storage.total_size_bytes.toLocaleString()} B` : null)

  return (
    <div className="rounded-xl border border-border/70 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <HardDrive className="h-4 w-4 text-primary/70" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">Storage</h3>
      </div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs">
        <div>
          <p className="text-muted-foreground">Objects</p>
          <p className="font-semibold tabular-nums text-foreground">{storage.total_object_count.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total size</p>
          <p className="font-semibold tabular-nums text-foreground">{totalSize ?? 'Not available'}</p>
        </div>
      </div>
      {storage.unavailable_reason ? (
        <p className="mb-3 text-[10px] text-muted-foreground">{storage.unavailable_reason}</p>
      ) : null}
      {storage.buckets.length > 0 ? (
        <div className="divide-y divide-border/50 rounded-lg border border-border/50">
          {storage.buckets.map((bucket) => (
            <div key={bucket.bucket_id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
              <span className="font-mono text-[11px] text-foreground">{bucket.bucket_id}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {bucket.object_count.toLocaleString()} obj
                {bucket.total_size_pretty ? ` · ${bucket.total_size_pretty}` : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No storage buckets reported.</p>
      )}
    </div>
  )
}
