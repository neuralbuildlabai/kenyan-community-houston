import { useEffect, useState } from 'react'
import { Search, Trash2, Eye, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { publishAnnouncementRow, type AnnouncementCalendarRow } from '@/lib/announcementCalendarPublish'
import { moderationStatusPatch } from '@/lib/publishLifecycle'
import { formatDateShort } from '@/lib/utils'
import { toast } from 'sonner'

interface Announcement {
  id: string
  title: string
  category: string
  status: string
  is_pinned: boolean
  author_name: string | null
  published_at: string | null
  created_at: string
  include_in_calendar?: boolean | null
  linked_event_id?: string | null
}

const STATUS_OPTIONS = ['all', 'published', 'pending', 'draft', 'archived']

export function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    let q = supabase
      .from('announcements')
      .select('id, title, category, status, is_pinned, author_name, published_at, created_at, include_in_calendar, linked_event_id')
      .order('created_at', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setItems((data ?? []).filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase())))
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  async function updateStatus(id: string, status: string) {
    if (status === 'published') {
      const { data: row } = await supabase.from('announcements').select('*').eq('id', id).single()
      if (row?.status === 'pending') {
        const result = await publishAnnouncementRow(supabase, row as AnnouncementCalendarRow & { status: string })
        if (!result.ok) {
          toast.error(result.errorMessage ?? 'Publish failed')
          return
        }
        toast.success(
          (row as { include_in_calendar?: boolean }).include_in_calendar
            ? 'Published announcement and calendar event'
            : 'Announcement published'
        )
        load()
        return
      }
    }
    const { error } = await supabase.from('announcements').update(moderationStatusPatch(status)).eq('id', id)
    if (error) toast.error(error.message || 'Update failed')
    else {
      toast.success(`Announcement ${status}`)
      load()
    }
  }

  async function togglePin(id: string, current: boolean) {
    await supabase.from('announcements').update({ is_pinned: !current }).eq('id', id)
    load()
  }

  async function deleteItem() {
    if (!deleteId) return
    const { error } = await supabase.from('announcements').delete().eq('id', deleteId)
    if (error) toast.error('Delete failed')
    else { toast.success('Announcement deleted'); load() }
    setDeleteId(null)
  }

  const displayed = items.filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-muted-foreground text-sm">{items.length} total</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden lg:table-cell">Author</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>
              ))
            ) : displayed.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No announcements found</TableCell></TableRow>
            ) : displayed.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium max-w-[200px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {item.is_pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
                      <span className="truncate">{item.title}</span>
                    </div>
                    {item.include_in_calendar && (
                      <span className="text-[10px] font-medium text-primary">Also publishes to calendar when approved</span>
                    )}
                    {item.linked_event_id && (
                      <span className="text-[10px] text-muted-foreground">Linked event</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.category}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{item.author_name ?? '—'}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {item.published_at ? formatDateShort(item.published_at) : formatDateShort(item.created_at)}
                </TableCell>
                <TableCell>
                  <Select value={item.status} onValueChange={(v) => updateStatus(item.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{['draft', 'pending', 'published', 'archived'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title={item.is_pinned ? 'Unpin' : 'Pin'} onClick={() => togglePin(item.id, item.is_pinned)}>
                      <Pin className={`h-3.5 w-3.5 ${item.is_pinned ? 'text-amber-500' : ''}`} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Announcement" description="This action cannot be undone." onConfirm={deleteItem} />
    </div>
  )
}
