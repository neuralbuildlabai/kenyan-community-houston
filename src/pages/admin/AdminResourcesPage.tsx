import { useEffect, useState } from 'react'
import { Plus, Pencil, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { RESOURCE_LIBRARY_CATEGORIES } from '@/lib/constants'
import { generateSlug } from '@/lib/utils'
import { toast } from 'sonner'
import type { Resource, ResourceAccessLevel, ResourceStatus } from '@/lib/types'

type ResourceRow = Resource

const ACCESS: ResourceAccessLevel[] = ['public', 'members_only', 'admin_only', 'needs_review']
const STATUS: ResourceStatus[] = ['draft', 'published', 'archived']

const emptyForm = () => ({
  id: null as string | null,
  title: '',
  slug: '',
  description: '',
  category: 'Governance',
  file_type: '',
  file_url: '',
  external_url: '',
  access_level: 'needs_review' as ResourceAccessLevel,
  status: 'draft' as ResourceStatus,
  resource_date: '',
  related_event_id: '',
})

export function AdminResourcesPage() {
  const [rows, setRows] = useState<ResourceRow[]>([])
  const [events, setEvents] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [accessFilter, setAccessFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: r }, { data: ev }] = await Promise.all([
      supabase.from('resources').select('*').order('updated_at', { ascending: false }),
      supabase.from('events').select('id, title').order('start_date', { ascending: false }).limit(200),
    ])
    setRows((r as ResourceRow[]) ?? [])
    setEvents((ev as { id: string; title: string }[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = rows.filter((x) => {
    if (catFilter !== 'all' && x.category !== catFilter) return false
    if (accessFilter !== 'all' && x.access_level !== accessFilter) return false
    if (statusFilter !== 'all' && x.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!x.title.toLowerCase().includes(s) && !(x.description?.toLowerCase().includes(s))) return false
    }
    return true
  })

  function openCreate() {
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(x: ResourceRow) {
    setForm({
      id: x.id,
      title: x.title,
      slug: x.slug,
      description: x.description ?? '',
      category: x.category,
      file_type: x.file_type ?? '',
      file_url: x.file_url ?? '',
      external_url: x.external_url ?? '',
      access_level: x.access_level,
      status: x.status,
      resource_date: x.resource_date ?? '',
      related_event_id: x.related_event_id ?? '',
    })
    setOpen(true)
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    let slug = (form.slug || generateSlug(form.title)).trim()
    if (!form.id) {
      const { data: clash } = await supabase.from('resources').select('id').eq('slug', slug).maybeSingle()
      if (clash?.id) slug = `${slug}-${Date.now().toString(36)}`
    }
    const payload = {
      title: form.title.trim(),
      slug,
      description: form.description.trim() || null,
      category: form.category,
      file_type: form.file_type.trim() || null,
      file_url: form.file_url.trim() || null,
      external_url: form.external_url.trim() || null,
      access_level: form.access_level,
      status: form.status,
      resource_date: form.resource_date || null,
      related_event_id: form.related_event_id || null,
    }
    setSaving(true)
    if (form.id) {
      const { error } = await supabase.from('resources').update(payload).eq('id', form.id)
      setSaving(false)
      if (error) toast.error(error.message)
      else {
        toast.success('Resource updated')
        setOpen(false)
        load()
      }
    } else {
      const { error } = await supabase.from('resources').insert([payload])
      setSaving(false)
      if (error) toast.error(error.message)
      else {
        toast.success('Resource created')
        setOpen(false)
        load()
      }
    }
  }

  async function archive(id: string) {
    const { error } = await supabase.from('resources').update({ status: 'archived' }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Archived')
      load()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resource library</h1>
          <p className="text-muted-foreground text-sm">Manage documents, links, and access levels.</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={openCreate}><Plus className="h-4 w-4" /> Add resource</Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {RESOURCE_LIBRARY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={accessFilter} onValueChange={setAccessFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Access" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All access</SelectItem>
            {ACCESS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No resources</TableCell></TableRow>
            ) : (
              filtered.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{x.title}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{x.category}</TableCell>
                  <TableCell><Badge variant="outline">{x.access_level}</Badge></TableCell>
                  <TableCell><Badge variant={x.status === 'published' ? 'default' : 'secondary'}>{x.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(x)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => archive(x.id)}>Archive</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit resource' : 'New resource'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto from title" />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_LIBRARY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Access level *</Label>
              <Select value={form.access_level} onValueChange={(v) => setForm((f) => ({ ...f, access_level: v as ResourceAccessLevel }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ResourceStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>File type</Label>
              <Input value={form.file_type} onChange={(e) => setForm((f) => ({ ...f, file_type: e.target.value }))} placeholder="pdf, docx, …" />
            </div>
            <div className="space-y-1.5">
              <Label>File URL (site path or absolute)</Label>
              <Input value={form.file_url} onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>External URL</Label>
              <Input value={form.external_url} onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Resource date</Label>
              <Input type="date" value={form.resource_date} onChange={(e) => setForm((f) => ({ ...f, resource_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Related calendar event</Label>
              <Select value={form.related_event_id || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, related_event_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
