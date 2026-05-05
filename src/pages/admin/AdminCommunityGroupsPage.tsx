import { useEffect, useState } from 'react'
import { Pencil, Search, Check, X, Archive, RotateCcw, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { COMMUNITY_GROUP_CATEGORIES } from '@/lib/constants'
import { generateSlug } from '@/lib/utils'
import { normalizeExternalUrl } from '@/lib/externalUrl'
import { toast } from 'sonner'
import { isoNow } from '@/lib/publishLifecycle'
import type { CommunityGroup, CommunityGroupCategory, CommunityGroupStatus } from '@/lib/types'

const STATUS_FILTER = ['all', 'pending', 'approved', 'published', 'rejected', 'archived'] as const
const CATEGORY_FILTER = ['all', ...COMMUNITY_GROUP_CATEGORIES.map((c) => c.value)] as const

function categoryLabel(v: string): string {
  return COMMUNITY_GROUP_CATEGORIES.find((c) => c.value === v)?.label ?? v
}

type GroupForm = {
  id: string | null
  organization_name: string
  slug: string
  category: CommunityGroupCategory
  description: string
  website_url: string
  public_email: string
  public_phone: string
  meeting_location: string
  service_area: string
  social_url: string
  contact_person: string
  submitter_name: string
  submitter_email: string
  notes: string
  status: CommunityGroupStatus
  is_verified: boolean
}

const emptyForm = (): GroupForm => ({
  id: null,
  organization_name: '',
  slug: '',
  category: 'other',
  description: '',
  website_url: '',
  public_email: '',
  public_phone: '',
  meeting_location: '',
  service_area: '',
  social_url: '',
  contact_person: '',
  submitter_name: '',
  submitter_email: '',
  notes: '',
  status: 'pending',
  is_verified: false,
})

export function AdminCommunityGroupsPage() {
  const [rows, setRows] = useState<CommunityGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTER)[number]>('all')
  const [catFilter, setCatFilter] = useState<(typeof CATEGORY_FILTER)[number]>('all')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<GroupForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('community_groups').select('*').order('updated_at', { ascending: false })
    if (error) toast.error(error.message)
    setRows((data as CommunityGroup[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (catFilter !== 'all' && r.category !== catFilter) return false
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      const hay = [r.organization_name, r.submitter_name, r.submitter_email, r.public_email, r.public_phone, r.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  function openEdit(r: CommunityGroup) {
    setForm({
      id: r.id,
      organization_name: r.organization_name,
      slug: r.slug,
      category: r.category,
      description: r.description ?? '',
      website_url: r.website_url ?? '',
      public_email: r.public_email ?? '',
      public_phone: r.public_phone ?? '',
      meeting_location: r.meeting_location ?? '',
      service_area: r.service_area ?? '',
      social_url: r.social_url ?? '',
      contact_person: r.contact_person ?? '',
      submitter_name: r.submitter_name,
      submitter_email: r.submitter_email,
      notes: r.notes ?? '',
      status: r.status,
      is_verified: r.is_verified,
    })
    setOpen(true)
  }

  async function save() {
    if (!form.id || !form.organization_name.trim()) {
      toast.error('Organization name is required')
      return
    }
    let slug = (form.slug || generateSlug(form.organization_name)).trim()
    const { data: clash } = await supabase.from('community_groups').select('id').eq('slug', slug).neq('id', form.id).maybeSingle()
    if (clash?.id) slug = `${slug}-${Date.now().toString(36)}`

    // Defensive URL normalization: admin inputs can be raw paste,
    // so coerce to absolute https:// and reject obviously-unsafe
    // protocols. See `src/lib/externalUrl.ts`.
    const normalizedWebsite =
      form.website_url.trim() === '' ? null : normalizeExternalUrl(form.website_url)
    const normalizedSocial =
      form.social_url.trim() === '' ? null : normalizeExternalUrl(form.social_url)
    if (form.website_url.trim() !== '' && normalizedWebsite === null) {
      toast.error('Website URL is not a valid http(s) link.')
      return
    }
    if (form.social_url.trim() !== '' && normalizedSocial === null) {
      toast.error('Social URL is not a valid http(s) link.')
      return
    }

    const payload = {
      organization_name: form.organization_name.trim(),
      slug,
      category: form.category as CommunityGroupCategory,
      description: form.description.trim() || null,
      website_url: normalizedWebsite,
      public_email: form.public_email.trim() || null,
      public_phone: form.public_phone.trim() || null,
      meeting_location: form.meeting_location.trim() || null,
      service_area: form.service_area.trim() || null,
      social_url: normalizedSocial,
      contact_person: form.contact_person.trim() || null,
      submitter_name: form.submitter_name.trim(),
      submitter_email: form.submitter_email.trim(),
      notes: form.notes.trim() || null,
      status: form.status as CommunityGroupStatus,
      is_verified: form.is_verified,
    }
    setSaving(true)
    const { error } = await supabase.from('community_groups').update(payload).eq('id', form.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Saved')
      setOpen(false)
      load()
    }
  }

  async function quickStatus(id: string, status: CommunityGroupStatus) {
    const { error } = await supabase
      .from('community_groups')
      .update({ status, updated_at: isoNow() })
      .eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success(`Status → ${status}`)
      load()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Community groups</h1>
        <p className="text-muted-foreground text-sm">Review submissions, publish listings, and keep the non-commercial directory accurate.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, submitter, email, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as (typeof STATUS_FILTER)[number])}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All statuses' : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v as (typeof CATEGORY_FILTER)[number])}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {COMMUNITY_GROUP_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Verified</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <div className="h-8 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No rows match filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="truncate">{r.organization_name}</div>
                    <div className="text-xs text-muted-foreground truncate md:hidden">{categoryLabel(r.category)}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{categoryLabel(r.category)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'published' ? 'default' : 'secondary'}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{r.is_verified ? 'Yes' : '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" type="button" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2" type="button" onClick={() => quickStatus(r.id, 'published')} title="Publish">
                        <Megaphone className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2" type="button" onClick={() => quickStatus(r.id, 'approved')}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2" type="button" onClick={() => quickStatus(r.id, 'pending')}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2" type="button" onClick={() => quickStatus(r.id, 'rejected')}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2" type="button" onClick={() => quickStatus(r.id, 'archived')}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
            <DialogTitle>Edit community group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Organization name *</Label>
              <Input value={form.organization_name} onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as CommunityGroupCategory }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNITY_GROUP_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CommunityGroupStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['pending', 'approved', 'published', 'rejected', 'archived'] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label htmlFor="verified" className="cursor-pointer">
                Verified listing
              </Label>
              <Switch id="verified" checked={form.is_verified} onCheckedChange={(c) => setForm((f) => ({ ...f, is_verified: c }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Website URL</Label>
              <Input value={form.website_url} onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Social URL</Label>
              <Input value={form.social_url} onChange={(e) => setForm((f) => ({ ...f, social_url: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Public email</Label>
                <Input value={form.public_email} onChange={(e) => setForm((f) => ({ ...f, public_email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Public phone</Label>
                <Input value={form.public_phone} onChange={(e) => setForm((f) => ({ ...f, public_phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Meeting location</Label>
              <Input value={form.meeting_location} onChange={(e) => setForm((f) => ({ ...f, meeting_location: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Service area</Label>
              <Input value={form.service_area} onChange={(e) => setForm((f) => ({ ...f, service_area: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact person</Label>
              <Input value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} />
            </div>
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
              <div>
                <span className="font-medium text-foreground">Submitter:</span> {form.submitter_name} · {form.submitter_email}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reviewer notes (not public)</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
