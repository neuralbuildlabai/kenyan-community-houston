import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { toast } from 'sonner'

interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  type: string
  /** Free-text category from the new public form (post migration 018). */
  inquiry_type: string | null
  /** Legacy boolean — DB trigger keeps this in sync with `status`. */
  is_read: boolean
  /** Authoritative status field (post migration 018). */
  status: 'new' | 'read' | 'in_progress' | 'replied' | 'archived' | 'spam' | null
  created_at: string
}

function isReadFromStatus(item: { status?: string | null; is_read?: boolean | null }): boolean {
  if (item.status && item.status !== 'new') return true
  return !!item.is_read
}

export function AdminContactsPage() {
  const [searchParams] = useSearchParams()
  const statusFilter = searchParams.get('status')
  const [items, setItems] = useState<ContactSubmission[]>([])
  const [selected, setSelected] = useState<ContactSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('contact_submissions').select('*').order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markRead(id: string) {
    // Update both the new authoritative `status` column and (defensively)
    // the legacy `is_read` boolean. The DB trigger keeps the two in sync,
    // but writing both makes the UI resilient if the trigger is missing
    // on a not-yet-migrated environment.
    await supabase
      .from('contact_submissions')
      .update({ status: 'read', is_read: true })
      .eq('id', id)
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, is_read: true, status: 'read' } : i))
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, is_read: true, status: 'read' } : null))
    }
  }

  async function deleteItem() {
    if (!deleteId) return
    const { error } = await supabase.from('contact_submissions').delete().eq('id', deleteId)
    if (error) toast.error('Delete failed')
    else { toast.success('Message deleted'); if (selected?.id === deleteId) setSelected(null); load() }
    setDeleteId(null)
  }

  const displayed = useMemo(() => {
    if (statusFilter === 'new') return items.filter((i) => !isReadFromStatus(i))
    if (statusFilter && statusFilter !== 'all') {
      return items.filter((i) => (i.status ?? 'new') === statusFilter)
    }
    return items
  }, [items, statusFilter])

  const unread = items.filter((i) => !isReadFromStatus(i)).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contact Messages</h1>
        <p className="text-muted-foreground text-sm">
          {items.length} total{unread > 0 ? ` · ${unread} unread` : ''}
          {statusFilter === 'new' ? ' · showing new only' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead className="hidden md:table-cell">Subject</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>
                ))
              ) : displayed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground" data-testid="contacts-empty">
                    {statusFilter === 'new' ? 'No unread contact messages.' : 'No messages'}
                  </TableCell>
                </TableRow>
              ) : displayed.map((item) => {
                const read = isReadFromStatus(item)
                return (
                <TableRow
                  key={item.id}
                  className={`cursor-pointer hover:bg-muted/50 ${!read ? 'font-medium' : ''} ${selected?.id === item.id ? 'bg-muted' : ''}`}
                  onClick={() => { setSelected(item); if (!read) markRead(item.id) }}
                >
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {!read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      <span className="truncate max-w-[120px]">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm truncate max-w-[150px]">{item.subject}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDateShort(item.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(item.id) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div>
          {selected ? (
            <div className="rounded-xl border p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{selected.subject}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    <Mail className="h-3.5 w-3.5" />
                    <a href={`mailto:${selected.email}`} className="hover:underline">{selected.email}</a>
                    <span>·</span>
                    <span>{selected.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{selected.inquiry_type ?? selected.type}</Badge>
                  {selected.phone && (
                    <span className="text-xs text-muted-foreground">{selected.phone}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatDateShort(selected.created_at)}</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{selected.message}</p>
              </div>
              <div className="border-t pt-3 flex gap-2">
                <Button size="sm" asChild>
                  <a href={`mailto:${selected.email}?subject=Re: ${selected.subject}`}>Reply via Email</a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteId(selected.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Message" description="This action cannot be undone." onConfirm={deleteItem} />
    </div>
  )
}
