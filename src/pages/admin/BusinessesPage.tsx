import { useEffect, useState } from 'react'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { moderationStatusPatch } from '@/lib/publishLifecycle'
import { BUSINESS_CATEGORIES } from '@/lib/constants'
import { normalizeExternalUrl } from '@/lib/externalUrl'
import { sanitizePhoneInput, validatePhoneNumber } from '@/lib/phoneValidation'
import { generateSlug } from '@/lib/utils'
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

/** The fields an admin can correct. Moderation lives in the row controls, not here. */
interface BusinessForm {
  id: string
  name: string
  slug: string
  category: string
  description: string
  services: string
  website: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zip: string
  owner_name: string
  owner_contact: string
}

const emptyForm: BusinessForm = {
  id: '', name: '', slug: '', category: '', description: '', services: '',
  website: '', phone: '', email: '', address: '', city: '', state: '', zip: '',
  owner_name: '', owner_contact: '',
}

const TIERS = ['basic', 'verified', 'featured', 'sponsor']
const STATUS_OPTIONS = ['all', 'published', 'pending', 'draft', 'archived']

export function AdminBusinessesPage() {
  const [items, setItems] = useState<Business[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<BusinessForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)

  async function load() {
    setLoading(true)
    let q = supabase.from('businesses').select('id, name, category, status, tier, city, created_at').order('created_at', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setItems(data ?? [])
    setLoading(false)
  }

  // Reload only when the status filter changes; `load` is a closure
  // recreated each render, so we keep it out of the dependency array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [statusFilter])

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('businesses').update(moderationStatusPatch(status)).eq('id', id)
    if (error) toast.error(error.message || 'Update failed')
    else {
      toast.success(`Business ${status}`)
      load()
    }
  }

  async function updateTier(id: string, tier: string) {
    const { error } = await supabase.from('businesses').update({ tier }).eq('id', id)
    if (error) toast.error('Tier update failed')
    else { toast.success('Tier updated'); load() }
  }

  // The table only holds the columns it renders, so fetch the full row on open
  // rather than widening the list query for every listing.
  async function openEdit(id: string) {
    setLoadingEdit(true)
    setEditOpen(true)
    const { data, error } = await supabase.from('businesses').select('*').eq('id', id).maybeSingle()
    setLoadingEdit(false)
    if (error || !data) {
      toast.error(error?.message || 'Could not load this listing')
      setEditOpen(false)
      return
    }
    setForm({
      id: data.id,
      name: data.name ?? '',
      slug: data.slug ?? '',
      category: data.category ?? '',
      description: data.description ?? '',
      services: data.services ?? '',
      website: data.website ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      address: data.address ?? '',
      city: data.city ?? '',
      state: data.state ?? '',
      zip: data.zip ?? '',
      owner_name: data.owner_name ?? '',
      owner_contact: data.owner_contact ?? '',
    })
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error('Business name is required')
      return
    }
    if (!form.category) {
      toast.error('Category is required')
      return
    }

    const phoneRes = validatePhoneNumber(form.phone, { allowEmpty: true })
    if (!phoneRes.ok) {
      toast.error(phoneRes.reason)
      return
    }

    // Admin input is often raw paste, so coerce to an absolute https:// link
    // and reject anything that is not http(s). See `src/lib/externalUrl.ts`.
    const website = form.website.trim() === '' ? null : normalizeExternalUrl(form.website)
    if (form.website.trim() !== '' && website === null) {
      toast.error('Website is not a valid http(s) link.')
      return
    }

    // A listing's slug is its public URL, so it only changes when an admin
    // edits it directly — renaming a business must not silently break links.
    let slug = (form.slug.trim() || generateSlug(form.name)).trim()
    const { data: clash } = await supabase
      .from('businesses').select('id').eq('slug', slug).neq('id', form.id).maybeSingle()
    if (clash?.id) slug = `${slug}-${Date.now().toString(36)}`

    setSaving(true)
    const { error } = await supabase.from('businesses').update({
      name: form.name.trim(),
      slug,
      category: form.category,
      description: form.description.trim(),
      services: form.services.trim() || null,
      website,
      phone: phoneRes.value || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim() || null,
      owner_name: form.owner_name.trim(),
      owner_contact: form.owner_contact.trim() || null,
    }).eq('id', form.id)
    setSaving(false)

    if (error) {
      toast.error(error.message || 'Save failed')
      return
    }
    toast.success('Listing updated')
    setEditOpen(false)
    load()
  }

  async function deleteItem() {
    if (!deleteId) return
    const { error } = await supabase.from('businesses').delete().eq('id', deleteId)
    if (error) toast.error('Delete failed')
    else { toast.success('Business deleted'); load() }
    setDeleteId(null)
  }

  const displayed = items.filter((b) => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.category?.toLowerCase().includes(search.toLowerCase()))

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
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => openEdit(item.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setForm(emptyForm) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit listing</DialogTitle>
          </DialogHeader>

          {loadingEdit ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="biz-name">Business name</Label>
                <Input id="biz-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="biz-category">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger id="biz-category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="biz-description">Description</Label>
                <Textarea id="biz-description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Shown on the public directory. Plain text — asterisks and other markdown are not rendered.
                </p>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="biz-services">Services</Label>
                <Textarea id="biz-services" rows={2} value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="biz-website">Website</Label>
                <Input id="biz-website" placeholder="example.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="biz-phone">Phone</Label>
                <Input id="biz-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="biz-email">Public email</Label>
                <Input id="biz-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="biz-address">Address</Label>
                <Input id="biz-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="biz-city">City</Label>
                <Input id="biz-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="biz-state">State</Label>
                  <Input id="biz-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="biz-zip">ZIP</Label>
                  <Input id="biz-zip" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                </div>
              </div>

              <div>
                <Label htmlFor="biz-owner-name">Owner name</Label>
                <Input id="biz-owner-name" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="biz-owner-contact">Owner contact</Label>
                <Input id="biz-owner-contact" value={form.owner_contact} onChange={(e) => setForm({ ...form, owner_contact: e.target.value })} />
                <p className="mt-1 text-xs text-muted-foreground">Private — not shown on the public listing.</p>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="biz-slug">Public URL slug</Label>
                <Input id="biz-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Appears at /businesses/{form.slug || 'slug'}. Changing it breaks any link already shared.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving || loadingEdit}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Business" description="This action cannot be undone." onConfirm={deleteItem} />
    </div>
  )
}
