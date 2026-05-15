import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { EventComment } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const STATUSES = ['pending', 'approved', 'hidden', 'removed'] as const

export function AdminEventCommentsPage() {
  const [rows, setRows] = useState<EventComment[]>([])
  const [eventsById, setEventsById] = useState<Record<string, { title: string; slug: string }>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<(typeof STATUSES)[number] | 'all'>('pending')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('event_comments')
      .select('id, event_id, user_id, body, status, parent_comment_id, created_at, updated_at')
      .order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, error } = await q
    setLoading(false)
    if (error) {
      toast.error('Could not load event comments.')
      setRows([])
      return
    }
    const list = (data as EventComment[]) ?? []
    setRows(list)
    const eids = [...new Set(list.map((r) => r.event_id))]
    if (eids.length) {
      const { data: evs } = await supabase.from('events').select('id, title, slug').in('id', eids)
      const map: Record<string, { title: string; slug: string }> = {}
      for (const ev of (evs as { id: string; title: string; slug: string }[]) ?? []) {
        map[ev.id] = { title: ev.title, slug: ev.slug }
      }
      setEventsById(map)
    } else {
      setEventsById({})
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(id: string, status: (typeof STATUSES)[number]) {
    const { error } = await supabase.from('event_comments').update({ status }).eq('id', id)
    if (error) {
      toast.error('Could not update comment.')
      return
    }
    toast.success('Comment updated.')
    void load()
  }

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows.length])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary" />
            Event comments
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Moderate questions submitted on public event pages.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queue</CardTitle>
          <CardDescription>Approve appropriate questions so they appear publicly on the event.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : empty ? (
            <p className="text-sm text-muted-foreground py-12 text-center border border-dashed rounded-lg">No comments in this view.</p>
          ) : (
            <div className="space-y-4">
              {rows.map((c) => {
                const ev = eventsById[c.event_id]
                return (
                  <div key={c.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge variant={c.status === 'approved' ? 'default' : 'secondary'}>{c.status}</Badge>
                        {ev ? (
                          <Link to={`/events/${ev.slug}`} className="text-sm font-medium text-primary hover:underline">
                            {ev.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">Event {c.event_id}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(c.created_at, 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{c.body}</p>
                    <div className="flex flex-wrap gap-2">
                      {c.status !== 'approved' && (
                        <Button size="sm" variant="default" onClick={() => void setStatus(c.id, 'approved')}>
                          Approve
                        </Button>
                      )}
                      {c.status !== 'hidden' && (
                        <Button size="sm" variant="outline" onClick={() => void setStatus(c.id, 'hidden')}>
                          Hide
                        </Button>
                      )}
                      {c.status !== 'removed' && (
                        <Button size="sm" variant="destructive" onClick={() => void setStatus(c.id, 'removed')}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
