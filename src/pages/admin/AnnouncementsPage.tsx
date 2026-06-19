import { useEffect, useState } from 'react'
import { Search, Trash2, Pin, Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { publishAnnouncementRow, type AnnouncementCalendarRow } from '@/lib/announcementCalendarPublish'
import { moderationStatusPatch } from '@/lib/publishLifecycle'
import {
  announcementShowsExpiredBadge,
  validateAnnouncementDates,
} from '@/lib/announcementsPublic'
import { formatCategoryLabel } from '@/lib/communityCategories'
import { formatDateShort } from '@/lib/utils'
import { toast } from 'sonner'

interface AnnouncementRow {
  id: string
  title: string
  category: string
  status: string
  is_pinned: boolean
  is_featured: boolean
  priority: number
  author_name: string | null
  published_at: string | null
  expires_at: string | null
  created_at: string
  include_in_calendar?: boolean | null
  linked_event_id?: string | null
}

type EditDraft = {
  status: string
  published_at: string
  expires_at: string
  is_featured: boolean
  priority: string
}

const STATUS_OPTIONS = ['all', 'published', 'pending', 'draft', 'archived']

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDatetimeInput(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function statusBadgeVariant(status: string): 'secondary' | 'success' | 'warning' | 'muted' {
  if (status === 'published') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'draft') return 'muted'
  return 'secondary'
}

function statusBadgeLabel(status: string): string {
  if (status === 'draft') return 'Draft'
  if (status === 'published') return 'Published'
  if (status === 'pending') return 'Pending'
  if (status === 'archived') return 'Archived'
  return status
}

export function AdminAnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementRow[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<AnnouncementRow | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    let q = supabase
      .from('announcements')
      .select(
        'id, title, category, status, is_pinned, is_featured, priority, author_name, published_at, expires_at, created_at, include_in_calendar, linked_event_id'
      )
      .order('created_at', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setItems((data ?? []) as AnnouncementRow[])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [statusFilter])

  function openEdit(item: AnnouncementRow) {
    setEditItem(item)
    setEditDraft({
      status: item.status,
      published_at: toLocalDatetimeInput(item.published_at),
      expires_at: toLocalDatetimeInput(item.expires_at),
      is_featured: item.is_featured,
      priority: String(item.priority ?? 0),
    })
  }

  async function saveEdit() {
    if (!editItem || !editDraft) return
    const publishedAt = fromLocalDatetimeInput(editDraft.published_at)
    const expiresAt = fromLocalDatetimeInput(editDraft.expires_at)
    const dateErr = validateAnnouncementDates(publishedAt, expiresAt)
    if (dateErr) {
      toast.error(dateErr)
      return
    }
    const priority = Number.parseInt(editDraft.priority, 10)
    if (Number.isNaN(priority)) {
      toast.error('Priority must be a number.')
      return
    }

    setSaving(true)
    try {
      if (editDraft.status === 'published' && editItem.status === 'pending') {
        const { data: row } = await supabase.from('announcements').select('*').eq('id', editItem.id).single()
        if (row) {
          const result = await publishAnnouncementRow(
            supabase,
            row as AnnouncementCalendarRow & { status: string }
          )
          if (!result.ok) {
            toast.error(result.errorMessage ?? 'Publish failed')
            return
          }
        }
      }

      const t = new Date().toISOString()
      const patch = {
        status: editDraft.status,
        published_at:
          editDraft.status === 'published'
            ? (publishedAt ?? editItem.published_at ?? t)
            : publishedAt,
        expires_at: expiresAt,
        is_featured: editDraft.is_featured,
        priority,
        updated_at: t,
      }
      const { error } = await supabase.from('announcements').update(patch).eq('id', editItem.id)
      if (error) {
        toast.error(error.message || 'Save failed')
        return
      }
      toast.success('Announcement updated')
      setEditItem(null)
      setEditDraft(null)
      load()
    } finally {
      setSaving(false)
    }
  }

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
              <TableHead className="hidden lg:table-cell">Published</TableHead>
              <TableHead className="hidden lg:table-cell">Expires</TableHead>
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
                <TableCell className="font-medium max-w-[220px]">
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
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatCategoryLabel(item.category)}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {item.published_at ? formatDateShort(item.published_at) : formatDateShort(item.created_at)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {item.expires_at ? formatDateShort(item.expires_at) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={statusBadgeVariant(item.status)} className="text-[10px]">
                        {statusBadgeLabel(item.status)}
                      </Badge>
                      {item.is_featured ? (
                        <Badge variant="gold" className="text-[10px]">Featured</Badge>
                      ) : null}
                      {announcementShowsExpiredBadge(item) ? (
                        <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                      ) : null}
                    </div>
                    <Select value={item.status} onValueChange={(v) => updateStatus(item.id, v)}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>{['draft', 'pending', 'published', 'archived'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
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

      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) { setEditItem(null); setEditDraft(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit announcement</DialogTitle>
          </DialogHeader>
          {editDraft ? (
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium text-foreground">{editItem?.title}</p>
              <div className="space-y-2">
                <Label htmlFor="ann-status">Status</Label>
                <Select value={editDraft.status} onValueChange={(v) => setEditDraft({ ...editDraft, status: v })}>
                  <SelectTrigger id="ann-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['draft', 'pending', 'published', 'archived'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-published">Published date</Label>
                <Input
                  id="ann-published"
                  type="datetime-local"
                  value={editDraft.published_at}
                  onChange={(e) => setEditDraft({ ...editDraft, published_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-expires">Expiration date</Label>
                <Input
                  id="ann-expires"
                  type="datetime-local"
                  value={editDraft.expires_at}
                  onChange={(e) => setEditDraft({ ...editDraft, expires_at: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  After expiration, the announcement is hidden from public pages.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-priority">Priority</Label>
                <Input
                  id="ann-priority"
                  type="number"
                  value={editDraft.priority}
                  onChange={(e) => setEditDraft({ ...editDraft, priority: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Higher numbers appear first on the homepage.</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editDraft.is_featured}
                  onChange={(e) => setEditDraft({ ...editDraft, is_featured: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Featured on homepage
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditItem(null); setEditDraft(null) }} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Announcement" description="This action cannot be undone." onConfirm={deleteItem} />
    </div>
  )
}
