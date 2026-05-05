import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, CalendarDays, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import {
  publishAnnouncementRow,
  type AnnouncementCalendarRow,
} from '@/lib/announcementCalendarPublish'
import { pendingQueuePublishPayload, pendingQueueRejectPayload } from '@/lib/publishLifecycle'
import { formatCategoryLabel } from '@/lib/communityCategories'
import { formatDateShort } from '@/lib/utils'
import { toast } from 'sonner'

type ContentType = 'events' | 'announcements' | 'businesses' | 'fundraisers'

interface PendingItem {
  id: string
  title?: string
  name?: string
  category: string
  created_at: string
  status: string
  include_in_calendar?: boolean | null
  calendar_start_date?: string | null
  calendar_start_time?: string | null
  calendar_location?: string | null
  flyer_url?: string | null
  image_url?: string | null
  calendar_flyer_url?: string | null
}

function getTitle(item: PendingItem) {
  return item.title ?? item.name ?? '—'
}

function SubmissionFlyerPreview({ url, label }: { url: string; label?: string }) {
  const u = url.trim()
  const base = (u.split('?')[0] ?? u).toLowerCase()
  const ext = base.includes('.') ? base.split('.').pop() : ''
  const isImg = ext ? ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) : false
  const linkLabel = label ?? 'Open link'

  if (!isImg) {
    return (
      <a
        href={u}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-1"
      >
        <ExternalLink className="h-3 w-3 shrink-0" />
        {linkLabel}
      </a>
    )
  }

  return (
    <div className="flex items-start gap-2 mt-1 max-w-[14rem]">
      <img src={u} alt="" className="h-12 w-12 rounded object-cover border shrink-0 bg-muted" loading="lazy" />
      <a
        href={u}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline break-all"
      >
        <ExternalLink className="h-3 w-3 shrink-0" />
        {linkLabel}
      </a>
    </div>
  )
}

function calendarPreview(item: PendingItem): string | null {
  if (!item.include_in_calendar) return null
  const bits: string[] = []
  if (item.calendar_start_date) bits.push(formatDateShort(item.calendar_start_date))
  if (item.calendar_start_time) bits.push(item.calendar_start_time.slice(0, 5))
  if (item.calendar_location) bits.push(item.calendar_location)
  return bits.length ? bits.join(' · ') : 'Calendar fields incomplete'
}

export function AdminSubmissionsPage() {
  const [activeTab, setActiveTab] = useState<ContentType>('events')
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ events: 0, announcements: 0, businesses: 0, fundraisers: 0 })

  async function loadCounts() {
    const [{ count: e }, { count: a }, { count: b }, { count: f }] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('fundraisers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    setCounts({ events: e ?? 0, announcements: a ?? 0, businesses: b ?? 0, fundraisers: f ?? 0 })
  }

  async function load(type: ContentType) {
    setLoading(true)
    const col = type === 'businesses' ? 'name' : 'title'
    const sel =
      type === 'announcements'
        ? `id, ${col}, category, created_at, status, include_in_calendar, calendar_start_date, calendar_start_time, calendar_location, calendar_flyer_url, image_url`
        : type === 'events'
          ? `id, ${col}, category, created_at, status, flyer_url, image_url`
          : `id, ${col}, category, created_at, status`
    const { data } = await supabase.from(type).select(sel).eq('status', 'pending').order('created_at', { ascending: true })
    setItems((data ?? []) as PendingItem[])
    setLoading(false)
  }

  useEffect(() => {
    loadCounts()
  }, [])
  useEffect(() => {
    load(activeTab)
  }, [activeTab])

  async function approve(id: string) {
    if (activeTab === 'announcements') {
      const { data: row, error: fetchErr } = await supabase.from('announcements').select('*').eq('id', id).single()
      if (fetchErr || !row) {
        toast.error(fetchErr?.message ?? 'Could not load announcement')
        return
      }
      const result = await publishAnnouncementRow(supabase, row as AnnouncementCalendarRow & { status: string })
      if (!result.ok) {
        toast.error(result.errorMessage ?? 'Approve failed')
        return
      }
      toast.success(
        (row as { include_in_calendar?: boolean }).include_in_calendar
          ? 'Published announcement and calendar event'
          : 'Approved and published'
      )
      load(activeTab)
      loadCounts()
      return
    }

    const { data, error } = await supabase
      .from(activeTab)
      .update(pendingQueuePublishPayload())
      .eq('id', id)
      .select('id')
    if (error) toast.error(error.message || 'Failed to approve')
    else if (!data?.length) toast.error('Could not update — no matching row (check permissions).')
    else {
      toast.success('Approved and published')
      load(activeTab)
      loadCounts()
    }
  }

  async function reject(id: string) {
    const { data, error } = await supabase.from(activeTab).update(pendingQueueRejectPayload()).eq('id', id).select('id')
    if (error) toast.error(error.message || 'Failed to reject')
    else if (!data?.length) toast.error('Could not update — no matching row (check permissions).')
    else {
      toast.success('Submission rejected')
      load(activeTab)
      loadCounts()
    }
  }

  const tabLabel = (type: ContentType) => {
    const n = counts[type]
    return `${type.charAt(0).toUpperCase() + type.slice(1)}${n > 0 ? ` (${n})` : ''}`
  }

  const colCount = (type: ContentType) => (type === 'announcements' ? 5 : 4)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Submissions</h1>
        <p className="text-muted-foreground text-sm">Review and moderate community-submitted content.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="events">{tabLabel('events')}</TabsTrigger>
          <TabsTrigger value="announcements">{tabLabel('announcements')}</TabsTrigger>
          <TabsTrigger value="businesses">{tabLabel('businesses')}</TabsTrigger>
          <TabsTrigger value="fundraisers">{tabLabel('fundraisers')}</TabsTrigger>
        </TabsList>

        {(['events', 'announcements', 'businesses', 'fundraisers'] as ContentType[]).map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    {type === 'announcements' && (
                      <TableHead className="hidden lg:table-cell min-w-[11rem]">
                        Event details
                      </TableHead>
                    )}
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={colCount(type)}>
                          <div className="h-8 bg-muted animate-pulse rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount(type)} className="text-center py-12">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-muted-foreground">No pending {type}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium max-w-[220px]">
                          <div className="space-y-1">
                            <span className="line-clamp-2">{getTitle(item)}</span>
                            {type === 'events' && (item.flyer_url || item.image_url) && (
                              <SubmissionFlyerPreview url={(item.flyer_url || item.image_url)!} label="Flyer / poster" />
                            )}
                            {type === 'announcements' && item.image_url?.trim() && (
                              <SubmissionFlyerPreview url={item.image_url.trim()} label="Announcement image" />
                            )}
                            {type === 'announcements' && item.include_in_calendar && (
                              <Badge variant="outline" className="text-[10px] gap-1 lg:hidden">
                                <CalendarDays className="h-3 w-3" />
                                Also calendar
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {type === 'announcements' && (
                          <TableCell className="hidden lg:table-cell align-top text-xs text-muted-foreground">
                            {item.include_in_calendar ? (
                              <div className="space-y-1 max-w-[14rem]">
                                <Badge variant="secondary" className="text-[10px]">
                                  Calendar after approval
                                </Badge>
                                <p className="leading-snug">{calendarPreview(item)}</p>
                                {item.calendar_flyer_url?.trim() ? (
                                  <SubmissionFlyerPreview url={item.calendar_flyer_url.trim()} label="Calendar flyer / poster" />
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Announcement only</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {type === 'events' || type === 'announcements'
                            ? formatCategoryLabel(item.category)
                            : item.category}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDateShort(item.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => approve(item.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => reject(item.id)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
