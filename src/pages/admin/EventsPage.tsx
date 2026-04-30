import { useEffect, useState } from 'react'
import { Search, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { toast } from 'sonner'

interface Event {
  id: string
  title: string
  category: string
  status: string
  start_date: string
  location: string
  is_free: boolean
  created_at: string
}

const STATUS_OPTIONS = ['all', 'published', 'pending', 'draft', 'archived']

export function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    let q = supabase.from('events').select('id, title, category, status, start_date, location, is_free, created_at').order('created_at', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    const filtered = (data ?? []).filter((e) =>
      !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.location?.toLowerCase().includes(search.toLowerCase())
    )
    setEvents(filtered)
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('events').update({ status, published_at: status === 'published' ? new Date().toISOString() : null }).eq('id', id)
    if (error) toast.error('Failed to update status')
    else { toast.success(`Event ${status}`); load() }
  }

  async function deleteEvent() {
    if (!deleteId) return
    const { error } = await supabase.from('events').delete().eq('id', deleteId)
    if (error) toast.error('Failed to delete event')
    else { toast.success('Event deleted'); load() }
    setDeleteId(null)
  }

  const displayed = events.filter((e) =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground text-sm">{events.length} total</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
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
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No events found</TableCell></TableRow>
            ) : displayed.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{event.title}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{event.category}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDateShort(event.start_date)}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[150px]">{event.location}</TableCell>
                <TableCell>
                  <Select value={event.status} onValueChange={(v) => updateStatus(event.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['draft', 'pending', 'published', 'archived'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                      <a href={`/events/${event.id}`} target="_blank" rel="noopener noreferrer"><Eye className="h-3.5 w-3.5" /></a>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(event.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Event"
        description="This action cannot be undone. The event will be permanently deleted."
        onConfirm={deleteEvent}
      />
    </div>
  )
}
