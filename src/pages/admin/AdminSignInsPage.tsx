import { Fragment, useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, LogIn, RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import {
  describeActivityEvent,
  formatRoleLabel,
  signInDisplayName,
  signInKindLabel,
  SIGN_IN_RANGE_OPTIONS,
  type SignInActivityPayload,
  type SignInRow,
  type SignInsPayload,
  type SignInSummary,
} from '@/lib/adminSignIns'

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ActivityTrail({ loginId }: { loginId: string }) {
  const [payload, setPayload] = useState<SignInActivityPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase.rpc('kigh_admin_sign_in_activity', {
        p_login_event_id: loginId,
        p_limit: 300,
      })
      if (cancelled) return
      if (err) setError(err.message)
      else setPayload((data as SignInActivityPayload) ?? null)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [loginId])

  if (loading) return <div className="h-16 rounded-md bg-muted animate-pulse" />
  if (error) return <p className="text-sm text-destructive">{error}</p>

  const rows = payload?.rows ?? []
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pages or actions were recorded after this sign-in.
      </p>
    )
  }

  return (
    <ol className="space-y-2">
      {rows.map((row) => {
        const { action, detail } = describeActivityEvent(row)
        return (
          <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="tabular-nums text-xs text-muted-foreground w-36 shrink-0">
              {formatWhen(row.occurred_at)}
            </span>
            <span className="font-medium">{action}</span>
            {detail && <span className="text-muted-foreground break-all">{detail}</span>}
          </li>
        )
      })}
    </ol>
  )
}

export function AdminSignInsPage() {
  const [rows, setRows] = useState<SignInRow[]>([])
  const [summary, setSummary] = useState<SignInSummary | null>(null)
  const [days, setDays] = useState('30')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('kigh_admin_sign_ins', {
      p_days: Number(days),
      p_limit: 250,
      p_search: appliedSearch || null,
    })
    if (err) {
      setError(
        err.message.includes('function')
          ? 'Sign-in history is unavailable. Apply migration 078 in the Supabase SQL editor.'
          : err.message
      )
      setRows([])
      setSummary(null)
    } else {
      const payload = (data as SignInsPayload) ?? null
      setRows(payload?.rows ?? [])
      setSummary(payload?.summary ?? null)
    }
    setLoading(false)
  }, [days, appliedSearch])

  useEffect(() => {
    void load()
  }, [load])

  // Search runs on submit rather than per keystroke — the RPC scans the full
  // window and this table is an audit view, not a type-ahead.
  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAppliedSearch(search.trim())
  }

  const rangeLabel =
    SIGN_IN_RANGE_OPTIONS.find((o) => o.value === days)?.label.toLowerCase() ?? 'this period'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LogIn className="h-7 w-7 text-primary" />
          Sign-ins
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every recorded sign-in {rangeLabel}, and the pages and records each person opened
          afterwards. Expand a row to see the trail.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Sign-ins', v: summary?.total ?? 0 },
          { label: 'Distinct people', v: summary?.unique_users ?? 0 },
          { label: 'Admin sign-ins', v: summary?.admin_logins ?? 0 },
          { label: 'Member sign-ins', v: summary?.member_logins ?? 0 },
        ].map((c) => (
          <Card key={c.label} className="border-primary/10 shadow-sm bg-gradient-to-br from-card to-muted/20">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</p>
              <p className="text-3xl font-bold mt-2 tabular-nums">{loading ? '—' : c.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={onSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, or role — press Enter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search sign-ins"
          />
        </form>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SIGN_IN_RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Who</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead>Signed in</TableHead>
              <TableHead className="hidden lg:table-cell">Signed in from</TableHead>
              <TableHead className="text-right">Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No sign-ins recorded in this window.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const isOpen = expanded === row.id
                const role = formatRoleLabel(row.role)
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : row.id)}
                    >
                      <TableCell className="align-top">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-expanded={isOpen}
                          aria-label={isOpen ? 'Hide activity' : 'Show activity'}
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpanded(isOpen ? null : row.id)
                          }}
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium">{signInDisplayName(row)}</div>
                        {row.email && (
                          <div className="text-xs text-muted-foreground break-all">{row.email}</div>
                        )}
                        {role && <div className="text-xs text-muted-foreground">{role}</div>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell align-top">
                        <Badge variant={row.kind === 'admin_login' ? 'default' : 'secondary'}>
                          {signInKindLabel(row.kind)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top text-sm tabular-nums">
                        {formatWhen(row.occurred_at)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell align-top text-sm text-muted-foreground break-all">
                        {row.entry_path || '—'}
                      </TableCell>
                      <TableCell className="align-top text-right text-sm tabular-nums">
                        <div>{row.event_count} action{row.event_count === 1 ? '' : 's'}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.distinct_paths} page{row.distinct_paths === 1 ? '' : 's'}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30">
                          <ActivityTrail loginId={row.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Sign-ins are recorded from on-site activity only. Visits made before a person signs in, or
        from a browser with analytics storage blocked, are not attributed.
      </p>
    </div>
  )
}
