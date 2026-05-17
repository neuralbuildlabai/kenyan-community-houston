import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, Server } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { APP_ENV_LABEL, appEnv } from '@/lib/appEnv'

type HealthPayload = {
  checked_at?: string
  database_size_bytes?: number
  table_row_counts?: Record<string, number>
  table_total_bytes?: Record<string, number>
  storage_objects_by_bucket?: { bucket_id: string; object_count: number }[]
  pending_and_inbox_counts?: Record<string, number>
  audit_events_last_7_days?: number
}

function formatBytes(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  if (n < 1024) return `${n} B`
  const kb = n / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(2)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function supabaseHost(): string {
  try {
    const u = import.meta.env.VITE_SUPABASE_URL as string
    return new URL(u).host
  } catch {
    return '(unparsed)'
  }
}

export function AdminSystemHealthPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [dbOk, setDbOk] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const ping = await supabase.from('events').select('id', { head: true, count: 'exact' })
        setDbOk(!ping.error)

        const { data, error: rpcErr } = await supabase.rpc('kigh_admin_system_health')
        if (rpcErr) throw new Error(rpcErr.message)
        setHealth((data as HealthPayload) ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load system health')
        setHealth(null)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const buckets = health?.storage_objects_by_bucket ?? []
  const submissionBucket = buckets.find((b) => b.bucket_id === 'kigh-submission-media')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-7 w-7 text-primary" />
          System Health
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platform diagnostics for top-level admins only. No secrets are loaded into the browser.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-primary/15 bg-gradient-to-br from-card to-muted/25">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Server className="h-4 w-4" /> Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">App env:</span>{' '}
              <span className="font-medium">{APP_ENV_LABEL[appEnv]}</span> ({appEnv})
            </p>
            <p>
              <span className="text-muted-foreground">Database host:</span>{' '}
              <span className="font-mono text-xs break-all">{supabaseHost()}</span>
            </p>
            <p>
              <span className="text-muted-foreground">App version:</span>{' '}
              <span className="font-mono text-xs">{typeof __KIGH_APP_VERSION__ !== 'undefined' ? __KIGH_APP_VERSION__ : '—'}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Database connectivity</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm">
            {dbOk === null ? (
              <span className="text-muted-foreground">Checking…</span>
            ) : dbOk ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <span>Reachable (anon count query)</span>
              </>
            ) : (
              <span className="text-destructive">Ping failed</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">kigh-submission-media</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {submissionBucket ? (
              <p>
                <span className="text-muted-foreground">Objects:</span>{' '}
                <span className="font-semibold tabular-nums">{submissionBucket.object_count}</span>
              </p>
            ) : (
              <p className="text-muted-foreground">No objects row for this bucket (empty or not migrated).</p>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      ) : health ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Database</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                <span className="text-muted-foreground">Size (server):</span>{' '}
                {formatBytes(health.database_size_bytes)}
              </p>
              <p className="text-xs text-muted-foreground">
                Last checked: {health.checked_at ? new Date(health.checked_at).toLocaleString() : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                Audit events (7d): {health.audit_events_last_7_days ?? '—'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Row counts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                {health.table_row_counts &&
                  Object.entries(health.table_row_counts).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2 border-b border-border/30 pb-1">
                      <span className="text-muted-foreground truncate">{k}</span>
                      <span className="font-medium tabular-nums shrink-0">{v}</span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Storage objects by bucket</CardTitle>
            </CardHeader>
            <CardContent>
              {buckets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No storage.objects rows visible to health RPC.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 pr-4">Bucket</th>
                        <th className="py-2">Objects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buckets.map((b) => (
                        <tr key={b.bucket_id} className="border-b border-border/40">
                          <td className="py-2 pr-4 font-mono text-xs">{b.bucket_id}</td>
                          <td className="py-2 tabular-nums">{b.object_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Pending / inbox (operational)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1">
                {health.pending_and_inbox_counts &&
                  Object.entries(health.pending_and_inbox_counts).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium tabular-nums">{v}</span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          {health.table_total_bytes && Object.keys(health.table_total_bytes).length > 0 ? (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Selected table sizes (on-disk total)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1">
                  {Object.entries(health.table_total_bytes).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="text-muted-foreground font-mono text-xs">{k}</span>
                      <span className="font-medium">{formatBytes(Number(v))}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
