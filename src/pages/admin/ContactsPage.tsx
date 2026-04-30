import { useEffect, useState } from 'react'
import { Mail, Trash2, CheckCircle } from 'lucide-react'
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
  subject: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export function AdminContactsPage() {
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
    await supabase.from('contact_submissions').update({ is_read: true }).eq('id', id)
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, is_read: true } : i))
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, is_read: true } : null)
  }

  async function deleteItem() {
    if (!deleteId) return
    const { error } = await supabase.from('contact_submissions').delete().eq('id', deleteId)
    if (error) toast.error('Delete failed')
    else { toast.success('Message deleted'); if (selected?.id === deleteId) setSelected(null); load() }
    setDeleteId(null)
  }

  const unread = items.filter((i) => !i.is_read).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contact Messages</h1>
        <p className="text-muted-foreground text-sm">{items.length} total{unread > 0 ? ` · ${unread} unread` : ''}</p>
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
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No messages</TableCell></TableRow>
              ) : items.map((item) => (
                <TableRow
                  key={item.id}
                  className={`cursor-pointer hover:bg-muted/50 ${!item.is_read ? 'font-medium' : ''} ${selected?.id === item.id ? 'bg-muted' : ''}`}
                  onClick={() => { setSelected(item); if (!item.is_read) markRead(item.id) }}
                >
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {!item.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
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
              ))}
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
                  <Badge variant="outline" className="text-xs">{selected.type}</Badge>
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
