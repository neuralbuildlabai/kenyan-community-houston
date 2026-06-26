import { HardDrive } from 'lucide-react'
import type { StorageOverview } from '@/lib/adminDashboardApi'

type StorageOverviewPanelProps = {
  storage: StorageOverview
  loading?: boolean
}

export function StorageOverviewPanel({ storage, loading = false }: StorageOverviewPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-slate-50/60 p-4">
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
    <div className="rounded-xl bg-slate-50/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/60 text-slate-600">
          <HardDrive className="h-3.5 w-3.5" aria-hidden />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Storage</h3>
      </div>
      <div className="mb-3 flex flex-wrap gap-6 text-xs">
        <div>
          <p className="text-muted-foreground">Objects</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            {storage.total_object_count.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Total size</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{totalSize ?? 'Not available'}</p>
        </div>
      </div>
      {storage.unavailable_reason ? (
        <p className="mb-3 text-[10px] text-muted-foreground">{storage.unavailable_reason}</p>
      ) : null}
      {storage.buckets.length > 0 ? (
        <div className="divide-y divide-slate-200/50 rounded-lg bg-white/60">
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
