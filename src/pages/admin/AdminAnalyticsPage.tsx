import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { SimpleBars, type BarDatum } from '@/components/admin/SimpleBars'

type Summary = {
  period_days?: number
  page_views?: number
  cta_clicks?: number
  entity_views?: number
  entity_clicks?: number
  logins?: number
  map_opens?: number
  submissions_logged?: number
}

type WeekRow = {
  week_start: string
  page_views: number
  clicks: number
  entity_views: number
  logins: number
  submissions: number
}

type TopRow = { event_name: string; path: string; c: number }

type LoginRow = { day: string; logins: number }

type GrowthRow = { week_start: string; new_profiles: number }

export function AdminAnalyticsPage() {
  const [summary30, setSummary30] = useState<Summary | null>(null)
  const [weeks, setWeeks] = useState<WeekRow[]>([])
  const [top, setTop] = useState<TopRow[]>([])
  const [logins, setLogins] = useState<LoginRow[]>([])
  const [growth, setGrowth] = useState<GrowthRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [s30, w, t, l, g] = await Promise.all([
          supabase.rpc('kigh_admin_analytics_summary', { p_days: 30 }),
          supabase.rpc('kigh_admin_engagement_by_week', { p_weeks: 8 }),
          supabase.rpc('kigh_admin_top_clicks', { p_days: 30, p_limit: 20 }),
          supabase.rpc('kigh_admin_login_counts', { p_days: 30 }),
          supabase.rpc('kigh_admin_member_growth_by_week', { p_weeks: 8 }),
        ])
        if (s30.error) throw new Error(s30.error.message)
        if (w.error) throw new Error(w.error.message)
        if (t.error) throw new Error(t.error.message)
        if (l.error) throw new Error(l.error.message)
        if (g.error) throw new Error(g.error.message)
        setSummary30((s30.data as Summary) ?? null)
        setWeeks((w.data as WeekRow[]) ?? [])
        setTop((t.data as TopRow[]) ?? [])
        setLogins((l.data as LoginRow[]) ?? [])
        setGrowth((g.data as GrowthRow[]) ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load analytics. Apply migration 024 if missing.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const weekBars: BarDatum[] = weeks.map((r) => ({
    label: r.week_start,
    value: r.page_views + r.clicks + r.entity_views + r.logins + r.submissions,
    sub: `${r.page_views} views · ${r.clicks} clicks · ${r.submissions} submissions`,
  }))

  const growthBars: BarDatum[] = growth.map((r) => ({
    label: r.week_start,
    value: Number(r.new_profiles),
    sub: 'New profiles',
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aggregated, privacy-safe activity from on-site events only — no message bodies or member PII.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Page views (30d)', v: summary30?.page_views ?? 0 },
            { label: 'CTA / entity clicks', v: (summary30?.cta_clicks ?? 0) + (summary30?.entity_clicks ?? 0) },
            { label: 'Entity views', v: summary30?.entity_views ?? 0 },
            { label: 'Logins recorded', v: summary30?.logins ?? 0 },
            { label: 'Map opens', v: summary30?.map_opens ?? 0 },
            { label: 'Submissions logged', v: summary30?.submissions_logged ?? 0 },
          ].map((c) => (
            <Card key={c.label} className="border-primary/10 shadow-sm bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{c.v}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-base">Engagement by week</CardTitle>
          </CardHeader>
          <CardContent>
            {weekBars.length === 0 ? (
              <p className="text-sm text-muted-foreground">No analytics data yet.</p>
            ) : (
              <SimpleBars data={weekBars} />
            )}
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-base">New profiles by week</CardTitle>
          </CardHeader>
          <CardContent>
            {growthBars.length === 0 ? (
              <p className="text-sm text-muted-foreground">No profile growth in this window.</p>
            ) : (
              <SimpleBars data={growthBars} valueClassName="text-primary" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top clicks (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">No click events yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {top.map((row, i) => (
                  <li key={`${row.path}-${row.event_name}-${i}`} className="flex justify-between gap-2 border-b border-border/40 pb-2 last:border-0">
                    <span className="truncate text-muted-foreground">
                      <span className="font-medium text-foreground">{row.event_name}</span>
                      {row.path ? <span className="block text-xs truncate">{row.path}</span> : null}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{row.c}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logins by day (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {logins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No login events recorded.</p>
            ) : (
              <SimpleBars
                data={logins.slice(-14).map((r) => ({ label: r.day, value: Number(r.logins) }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
