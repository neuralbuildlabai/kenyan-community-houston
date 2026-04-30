import { useEffect, useState } from 'react'
import { Search, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { toast } from 'sonner'

interface Business {
  id: string
  name: string
  category: string
  status: string
  tier: string
  city: string
  created_at: string
}

const TIERS = ['basic', 'verified', 'featured', 'sponsor']
const STATUS_OPTIONS = ['all', 'published', 'pending', 'draft', 'archived']

export function AdminBusinessesPage() {
  const [items, setItems] = useState<Business[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    let q = supabase.from('businesses').select('id, name, category, status, tier, city, created_at').order('created_at', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('businesses').update({ status }).eq('id', id)
    if (error) toast.error('Update failed')
    else { toast.success(`Business ${status}`); load() }
  }

  async function updateTier(id: string, tier: string) {
    const { error } = await supabase.from('businesses').update({ tier }).eq('id', id)
    if (error) toast.error('Tier update failed')
    else { toast.success('Tier updated'); load() }
  }

  async function deleteItem() {
    if (!deleteId) return
    const { error } = await supabase.from('businesses').delete().eq('id', deleteId)
    if (error) toast.error('Delete failed')
    else { toast.success('Business deleted'); load() }
    setDeleteId(null)
  }

  const displayed = items.filter((b) => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.category?.toLowerCase().includes(search.toLowerCase()))

  const tierColor = (tier: string) => ({
    basic: '', verified: 'text-blue-600', featured: 'text-amber-600', sponsor: 'text-purple-600',
  }[tier] ?? '')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Businesses</h1>
        <p className="text-muted-foreground text-sm">{items.length} total</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search businesses…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden lg:table-cell">City</TableHead>
              <TableHead>Tier</TableHead>
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
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No businesses found</TableCell></TableRow>
            ) : displayed.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium max-w-[180px] truncate">{item.name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.category}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{item.city}</TableCell>
                <TableCell>
                  <Select value={item.tier} onValueChange={(v) => updateTier(item.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={item.status} onValueChange={(v) => updateStatus(item.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{['draft', 'pending', 'published', 'archived'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Business" description="This action cannot be undone." onConfirm={deleteItem} />
    </div>
  )
}
