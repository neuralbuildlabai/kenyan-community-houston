import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Plus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import {
  LEADERSHIP_GROUP_LABEL,
  LEADERSHIP_GROUP_ORDER,
  initialsForName,
  type LeadershipSeat,
} from '@/data/leadership'
import type { DbLeadershipSeat } from '@/lib/leadershipApi'
import { fetchAllLeadershipSeats } from '@/lib/leadershipApi'

const LEADERSHIP_BUCKET = 'leadership-photos'
const ACCEPTED_PHOTO_TYPES = 'image/jpeg,image/png,image/webp'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

type DraftSeat = {
  slug: string
  name: string
  titles: string // textarea: one title per line
  seat_group: LeadershipSeat['group']
  blurb: string
  display_order: number
  is_active: boolean
}

function emptyDraft(): DraftSeat {
  return {
    slug: '',
    name: '',
    titles: '',
    seat_group: 'executive',
    blurb: '',
    display_order: 100,
    is_active: true,
  }
}

function rowToDraft(row: DbLeadershipSeat): DraftSeat {
  return {
    slug: row.slug,
    name: row.name ?? '',
    titles: row.titles.join('\n'),
    seat_group: row.seat_group,
    blurb: row.blurb ?? '',
    display_order: row.display_order,
    is_active: row.is_active,
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function AdminLeadershipPage() {
  const [rows, setRows] = useState<DbLeadershipSeat[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftSeat>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [clearExistingPhoto, setClearExistingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const grouped = useMemo(() => {
    return LEADERSHIP_GROUP_ORDER.map((group) => ({
      group,
      label: LEADERSHIP_GROUP_LABEL[group],
      rows: rows.filter((r) => r.seat_group === group),
    }))
  }, [rows])

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      setRows(await fetchAllLeadershipSeats())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load leadership seats')
    } finally {
      setLoading(false)
    }
  }

  function openCreate(group?: LeadershipSeat['group']) {
    setEditingId(null)
    setDraft({ ...emptyDraft(), seat_group: group ?? 'executive' })
    setPhotoFile(null)
    setPhotoPreview(null)
    setClearExistingPhoto(false)
    setEditorOpen(true)
  }

  function openEdit(row: DbLeadershipSeat) {
    setEditingId(row.id)
    setDraft(rowToDraft(row))
    setPhotoFile(null)
    setPhotoPreview(null)
    setClearExistingPhoto(false)
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditingId(null)
    setDraft(emptyDraft())
    setPhotoFile(null)
    setPhotoPreview(null)
    setClearExistingPhoto(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onPickPhoto(file: File | null) {
    if (!file) {
      setPhotoFile(null)
      setPhotoPreview(null)
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Photo must be 5 MB or smaller')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Photo must be JPG, PNG, or WebP')
      return
    }
    setPhotoFile(file)
    setClearExistingPhoto(false)
    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(String(e.target?.result ?? ''))
    reader.readAsDataURL(file)
  }

  /** Returns { photo_url, photo_storage_path } applying any chosen photo change. */
  async function resolvePhotoFields(currentRow: DbLeadershipSeat | null): Promise<{
    photo_url: string | null
    photo_storage_path: string | null
  } | null> {
    // Case 1: explicit clear
    if (clearExistingPhoto && !photoFile) {
      // Delete the existing object if it lives in our bucket
      if (currentRow?.photo_storage_path) {
        await supabase.storage
          .from(LEADERSHIP_BUCKET)
          .remove([currentRow.photo_storage_path])
          .catch(() => null)
      }
      return { photo_url: null, photo_storage_path: null }
    }

    // Case 2: new file chosen — upload, get public URL, optionally delete old
    if (photoFile) {
      const ext =
        photoFile.type === 'image/png'
          ? 'png'
          : photoFile.type === 'image/webp'
            ? 'webp'
            : 'jpg'
      const stamp = Date.now()
      const safeSlug = draft.slug.replace(/[^a-z0-9-]/g, '') || 'seat'
      const path = `${safeSlug}-${stamp}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(LEADERSHIP_BUCKET)
        .upload(path, photoFile, {
          contentType: photoFile.type,
          upsert: true,
          cacheControl: '3600',
        })
      if (upErr) {
        toast.error(`Photo upload failed: ${upErr.message}`)
        return null
      }
      const { data: pub } = supabase.storage.from(LEADERSHIP_BUCKET).getPublicUrl(path)

      // Delete the old object if there was one (and it's in our bucket)
      if (currentRow?.photo_storage_path && currentRow.photo_storage_path !== path) {
        await supabase.storage
          .from(LEADERSHIP_BUCKET)
          .remove([currentRow.photo_storage_path])
          .catch(() => null)
      }
      return { photo_url: pub.publicUrl, photo_storage_path: path }
    }

    // Case 3: no change
    return {
      photo_url: currentRow?.photo_url ?? null,
      photo_storage_path: currentRow?.photo_storage_path ?? null,
    }
  }

  async function save() {
    const slug = slugify(draft.slug || draft.name)
    if (!slug) {
      toast.error('Slug or name is required')
      return
    }
    const titles = draft.titles
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    if (titles.length === 0) {
      toast.error('At least one title is required')
      return
    }

    setSaving(true)
    try {
      const currentRow = editingId ? rows.find((r) => r.id === editingId) ?? null : null
      const photo = await resolvePhotoFields(currentRow)
      if (!photo) {
        setSaving(false)
        return
      }
      const payload = {
        slug,
        name: draft.name.trim() || null,
        titles,
        seat_group: draft.seat_group,
        blurb: draft.blurb.trim() || null,
        display_order: Number.isFinite(draft.display_order) ? draft.display_order : 100,
        is_active: draft.is_active,
        photo_url: photo.photo_url,
        photo_storage_path: photo.photo_storage_path,
      }

      if (editingId) {
        const { error } = await supabase.from('leadership_seats').update(payload).eq('id', editingId)
        if (error) throw error
        toast.success('Seat updated')
      } else {
        const { error } = await supabase.from('leadership_seats').insert(payload)
        if (error) throw error
        toast.success('Seat added')
      }
      closeEditor()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function deleteRow(row: DbLeadershipSeat) {
    if (row.photo_storage_path) {
      await supabase.storage
        .from(LEADERSHIP_BUCKET)
        .remove([row.photo_storage_path])
        .catch(() => null)
    }
    const { error } = await supabase.from('leadership_seats').delete().eq('id', row.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Seat removed')
    setDeleteId(null)
    void load()
  }

  async function move(row: DbLeadershipSeat, direction: 'up' | 'down') {
    // Find siblings in same group ordered by display_order asc
    const siblings = rows
      .filter((r) => r.seat_group === row.seat_group)
      .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at))
    const idx = siblings.findIndex((s) => s.id === row.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return
    const other = siblings[swapIdx]!
    const ourNew = other.display_order
    const otherNew = row.display_order
    // If they're equal, bump by 1 so a real change happens
    const a = ourNew === otherNew ? otherNew : ourNew
    const b = ourNew === otherNew ? otherNew + 1 : otherNew
    const updates = await Promise.all([
      supabase.from('leadership_seats').update({ display_order: a }).eq('id', row.id),
      supabase.from('leadership_seats').update({ display_order: b }).eq('id', other.id),
    ])
    const firstErr = updates.find((u) => u.error)?.error
    if (firstErr) {
      toast.error(firstErr.message)
      return
    }
    void load()
  }

  async function toggleActive(row: DbLeadershipSeat) {
    const { error } = await supabase
      .from('leadership_seats')
      .update({ is_active: !row.is_active })
      .eq('id', row.id)
    if (error) toast.error(error.message)
    else void load()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leadership</h1>
          <p className="text-muted-foreground text-sm">
            Manage the public /leadership page. Add or remove seats, upload
            headshots, mark vacancies, and reorder within each group.
          </p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add seat
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map((g) => (
            <section key={g.group}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {g.label}
                </h2>
                <Button size="sm" variant="outline" onClick={() => openCreate(g.group)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add to {g.label.toLowerCase()}
                </Button>
              </div>
              {g.rows.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground text-center">
                  No seats in this group yet.
                </div>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {g.rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4"
                      data-testid={`leadership-row-${row.slug}`}
                    >
                      <div className="shrink-0">
                        {row.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.photo_url}
                            alt={row.name ?? row.titles[0] ?? 'Seat'}
                            className="h-14 w-14 rounded-xl border bg-muted object-cover"
                            loading="lazy"
                          />
                        ) : row.name ? (
                          <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                            {initialsForName(row.name)}
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground flex items-center justify-center">
                            <UserPlus className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {row.name ?? <span className="text-muted-foreground italic">Seat open</span>}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {row.titles.join(' · ')}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {row.is_active ? (
                            <Badge variant="secondary" className="text-[10px]">Visible</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Hidden</Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">order {row.display_order}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">{row.slug}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => void move(row, 'up')}
                          title="Move up in group"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => void move(row, 'down')}
                          title="Move down in group"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => void toggleActive(row)}
                          title={row.is_active ? 'Hide from public page' : 'Show on public page'}
                        >
                          {row.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(row.id)}
                          title="Delete seat"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Editor drawer (simple modal) */}
      {editorOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl bg-background rounded-t-2xl sm:rounded-2xl shadow-xl border max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Edit seat' : 'Add seat'}
              </h2>
              <Button size="icon" variant="ghost" onClick={closeEditor}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="seat-name">Name (leave blank for a vacant seat)</Label>
                  <Input
                    id="seat-name"
                    placeholder="e.g. Jane Wanjiru"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    onBlur={() =>
                      setDraft((d) => ({
                        ...d,
                        slug: d.slug || slugify(d.name),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seat-slug">Slug (URL key)</Label>
                  <Input
                    id="seat-slug"
                    placeholder="auto-generated from name"
                    value={draft.slug}
                    onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Lowercase letters, digits, hyphens. Used as a stable ID.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Group</Label>
                  <Select
                    value={draft.seat_group}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, seat_group: v as LeadershipSeat['group'] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEADERSHIP_GROUP_ORDER.map((g) => (
                        <SelectItem key={g} value={g}>
                          {LEADERSHIP_GROUP_LABEL[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="seat-titles">Titles (one per line)</Label>
                  <Textarea
                    id="seat-titles"
                    rows={3}
                    placeholder={"President / Chairperson\nActing Secretary"}
                    value={draft.titles}
                    onChange={(e) => setDraft((d) => ({ ...d, titles: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Each line renders on its own line in the card.
                  </p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="seat-blurb">Short bio (optional, ≤ 600 chars)</Label>
                  <Textarea
                    id="seat-blurb"
                    rows={3}
                    maxLength={600}
                    value={draft.blurb}
                    onChange={(e) => setDraft((d) => ({ ...d, blurb: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seat-order">Display order</Label>
                  <Input
                    id="seat-order"
                    type="number"
                    value={draft.display_order}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, display_order: Number(e.target.value) }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Lower numbers appear first within the group.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Visible on public page</Label>
                  <div className="flex items-center gap-2 h-10">
                    <input
                      id="seat-active"
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
                    />
                    <Label htmlFor="seat-active" className="text-sm">
                      Show this seat on /leadership
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border rounded-xl p-3">
                <Label className="text-sm">Photo (optional)</Label>
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview}
                      alt="preview"
                      className="h-16 w-16 rounded-xl border object-cover"
                    />
                  ) : editingId &&
                    !clearExistingPhoto &&
                    rows.find((r) => r.id === editingId)?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rows.find((r) => r.id === editingId)!.photo_url ?? undefined}
                      alt="current"
                      className="h-16 w-16 rounded-xl border object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center text-muted-foreground">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_PHOTO_TYPES}
                      className="hidden"
                      onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose file
                    </Button>
                    {(photoPreview ||
                      (editingId && rows.find((r) => r.id === editingId)?.photo_url)) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          setPhotoFile(null)
                          setPhotoPreview(null)
                          setClearExistingPhoto(true)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                      >
                        Remove photo
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  JPG, PNG, or WebP, up to 5 MB. Square photos (1:1) work best.
                </p>
              </div>
            </div>

            <div className="border-t p-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={closeEditor} disabled={saving}>Cancel</Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add seat'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this seat?"
        description="This removes the seat from the leadership roster and deletes its photo. This action cannot be undone."
        onConfirm={() => {
          const row = rows.find((r) => r.id === deleteId)
          if (row) void deleteRow(row)
        }}
      />
    </div>
  )
}
