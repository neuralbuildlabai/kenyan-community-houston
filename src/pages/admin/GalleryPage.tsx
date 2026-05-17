import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Archive,
  Star,
  Loader2,
  Eye,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { GALLERY_PUBLIC_BUCKET } from '@/lib/galleryConstants'
import {
  approveGalleryPendingImage,
  approveGalleryPendingImagesBulk,
} from '@/lib/galleryAdminApproval'
import { fetchAdminGalleryImages } from '@/lib/galleryAdminImages'
import {
  archiveGalleryImage,
  deleteGalleryImagePermanently,
  rejectGalleryImage,
  unpublishGalleryImage,
  unpublishGalleryImagesBulk,
} from '@/lib/galleryAdminPublished'
import { formatAdminActionError } from '@/lib/adminActionErrors'
import { buildGalleryWebAndThumb, GalleryImageProcessingError } from '@/lib/galleryImageProcessing'
import { PRIVATE_SIGNED_URL_EXPIRY_SEC } from '@/lib/kighPrivateStorage'
import { cn } from '@/lib/utils'

const NO_ALBUM = 'unassigned' as const

interface Album {
  id: string
  name: string
  slug: string
}

interface GalleryImageRow {
  id: string
  album_id: string | null
  caption: string | null
  alt_text: string | null
  image_url: string | null
  thumbnail_url: string | null
  status: string
  created_at: string
  submission_storage_bucket: string | null
  submission_storage_path: string | null
  submission_thumb_path: string | null
  is_homepage_featured: boolean
  sort_order: number
  submitted_by_name: string | null
  submitted_by_email: string | null
}

function albumIdForDb(value: string): string | null {
  return value === NO_ALBUM ? null : value
}

function contentTypeForExt(ext: 'webp' | 'jpg'): string {
  return ext === 'webp' ? 'image/webp' : 'image/jpeg'
}

function submitterLabel(row: GalleryImageRow): string {
  return row.submitted_by_name?.trim() || row.submitted_by_email?.trim() || 'unknown submitter'
}

type GalleryAdminTab = 'review' | 'library' | 'albums'

function tabFromSearchParams(tabParam: string | null, statusParam: string | null): GalleryAdminTab {
  if (tabParam === 'published' || tabParam === 'library') return 'library'
  if (tabParam === 'albums') return 'albums'
  if (tabParam === 'review' || statusParam === 'pending') return 'review'
  return 'review'
}

function tabToQueryValue(tab: GalleryAdminTab): string | null {
  if (tab === 'library') return 'published'
  if (tab === 'albums') return 'albums'
  return null
}

export function AdminGalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const tabParam = searchParams.get('tab')
  const statusParam = searchParams.get('status')
  const activeGalleryTab = tabFromSearchParams(tabParam, statusParam)

  const setGalleryTab = (tab: string) => {
    const nextTab = tab as GalleryAdminTab
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        const queryTab = tabToQueryValue(nextTab)
        if (queryTab) next.set('tab', queryTab)
        else next.delete('tab')
        if (nextTab !== 'review') next.delete('status')
        return next
      },
      { replace: true }
    )
  }
  const [albums, setAlbums] = useState<Album[]>([])
  const [images, setImages] = useState<GalleryImageRow[]>([])
  const [albumFilter, setAlbumFilter] = useState('all')
  const [newAlbumName, setNewAlbumName] = useState('')
  const [newAlbumOpenSubs, setNewAlbumOpenSubs] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [selectedAlbum, setSelectedAlbum] = useState<string>(NO_ALBUM)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingThumbs, setPendingThumbs] = useState<Record<string, string>>({})
  const [approveRow, setApproveRow] = useState<GalleryImageRow | null>(null)
  const [approveAlbumId, setApproveAlbumId] = useState<string>('')
  const [approveBusy, setApproveBusy] = useState(false)
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(() => new Set())
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false)
  const [bulkApproveAlbumId, setBulkApproveAlbumId] = useState<string>('')
  const [selectedPublishedIds, setSelectedPublishedIds] = useState<Set<string>>(() => new Set())
  const [viewPublished, setViewPublished] = useState<GalleryImageRow | null>(null)
  const [unpublishTarget, setUnpublishTarget] = useState<GalleryImageRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<GalleryImageRow | null>(null)
  const [bulkUnpublishOpen, setBulkUnpublishOpen] = useState(false)
  const [publishedActionBusy, setPublishedActionBusy] = useState(false)

  const loadAlbums = useCallback(async () => {
    const { data } = await supabase.from('gallery_albums').select('id, name, slug').order('name')
    setAlbums(data ?? [])
  }, [])

  const loadImages = useCallback(async () => {
    const { data, error } = await fetchAdminGalleryImages(supabase)
    if (error) {
      toast.error(error)
      return
    }
    setImages(data as GalleryImageRow[])
  }, [])

  const publishedCount = useMemo(() => images.filter((i) => i.status === 'published').length, [images])

  const pendingRows = useMemo(() => images.filter((i) => i.status === 'pending'), [images])
  const selectedPendingCount = selectedPendingIds.size
  const selectedPendingRows = useMemo(
    () => pendingRows.filter((r) => selectedPendingIds.has(r.id)),
    [pendingRows, selectedPendingIds]
  )
  const publishedRows = useMemo(() => {
    let rows = images.filter((i) => i.status === 'published')
    if (albumFilter === NO_ALBUM) rows = rows.filter((i) => !i.album_id)
    else if (albumFilter !== 'all') rows = rows.filter((i) => i.album_id === albumFilter)
    return rows
  }, [images, albumFilter])

  const selectedPublishedCount = selectedPublishedIds.size
  const selectedPublishedRows = useMemo(
    () => publishedRows.filter((r) => selectedPublishedIds.has(r.id)),
    [publishedRows, selectedPublishedIds]
  )

  useEffect(() => {
    void loadAlbums()
    void loadImages()
  }, [loadAlbums, loadImages])

  useEffect(() => {
    void (async () => {
      const map: Record<string, string> = {}
      for (const row of pendingRows) {
        const b = row.submission_storage_bucket
        const p = row.submission_thumb_path
        if (!b || !p) continue
        const { data, error } = await supabase.storage.from(b).createSignedUrl(p, PRIVATE_SIGNED_URL_EXPIRY_SEC)
        if (!error && data?.signedUrl) map[row.id] = data.signedUrl
      }
      setPendingThumbs(map)
    })()
  }, [pendingRows])

  async function createAlbum() {
    if (!newAlbumName.trim()) return
    const slug = newAlbumName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
    const { error } = await supabase
      .from('gallery_albums')
      .insert([{ name: newAlbumName.trim(), slug, open_for_submissions: newAlbumOpenSubs }])
    if (error) toast.error('Album creation failed')
    else {
      toast.success('Album created')
      setNewAlbumName('')
      void loadAlbums()
    }
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const built = await buildGalleryWebAndThumb(file)
      const ext = built.mime === 'image/webp' ? 'webp' : 'jpg'
      const base = crypto.randomUUID()
      const webPath = `admin/${base}-web.${ext}`
      const thumbPath = `admin/${base}-thumb.${ext}`
      const ct = contentTypeForExt(ext)

      const { error: upWeb } = await supabase.storage.from(GALLERY_PUBLIC_BUCKET).upload(webPath, built.web, {
        contentType: ct,
        upsert: false,
      })
      if (upWeb) {
        toast.error(upWeb.message)
        return
      }
      const { error: upTh } = await supabase.storage.from(GALLERY_PUBLIC_BUCKET).upload(thumbPath, built.thumb, {
        contentType: ct,
        upsert: false,
      })
      if (upTh) {
        toast.error(upTh.message)
        return
      }
      const { data: webPub } = supabase.storage.from(GALLERY_PUBLIC_BUCKET).getPublicUrl(webPath)
      const { data: thPub } = supabase.storage.from(GALLERY_PUBLIC_BUCKET).getPublicUrl(thumbPath)

      const { error: dbError } = await supabase.from('gallery_images').insert([
        {
          image_url: webPub.publicUrl,
          thumbnail_url: thPub.publicUrl,
          caption: caption || null,
          album_id: albumIdForDb(selectedAlbum),
          status: 'published',
        },
      ])
      if (dbError) toast.error('Failed to save image record')
      else {
        toast.success('Image uploaded')
        setCaption('')
        void loadImages()
      }
    } catch (err) {
      toast.error(err instanceof GalleryImageProcessingError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function deleteImage() {
    if (!deleteId) return
    setPublishedActionBusy(true)
    try {
      const result = await deleteGalleryImagePermanently(supabase, deleteId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Image deleted permanently')
      if (result.storageWarning) toast.warning(result.storageWarning)
      setSelectedPublishedIds((prev) => {
        const next = new Set(prev)
        next.delete(deleteId)
        return next
      })
      setSelectedPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(deleteId)
        return next
      })
      void loadImages()
    } finally {
      setPublishedActionBusy(false)
      setDeleteId(null)
    }
  }

  async function rejectPendingImage(id: string) {
    const result = await rejectGalleryImage(supabase, id)
    if (!result.ok) toast.error(result.error)
    else {
      toast.success('Submission rejected')
      setSelectedPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      void loadImages()
    }
  }

  async function archivePendingImage(id: string) {
    const result = await archiveGalleryImage(supabase, id)
    if (!result.ok) toast.error(result.error)
    else {
      toast.success('Submission archived')
      setSelectedPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      void loadImages()
    }
  }

  async function saveMeta(
    id: string,
    patch: Partial<Pick<GalleryImageRow, 'caption' | 'alt_text' | 'album_id' | 'is_homepage_featured' | 'sort_order'>>
  ) {
    const { error } = await supabase.from('gallery_images').update(patch).eq('id', id)
    if (error) toast.error(formatAdminActionError(error))
    else {
      toast.success('Saved')
      void loadImages()
    }
  }

  async function setAlbumCover(albumId: string, thumbUrl: string | null, imageUrl: string | null) {
    const cover = thumbUrl ?? imageUrl
    if (!cover) return
    const { error } = await supabase.from('gallery_albums').update({ cover_url: cover }).eq('id', albumId)
    if (error) toast.error(error.message)
    else {
      toast.success('Cover updated')
      void loadAlbums()
    }
  }

  function togglePendingSelection(id: string, checked: boolean) {
    setSelectedPendingIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function selectAllVisiblePending() {
    setSelectedPendingIds(new Set(pendingRows.map((r) => r.id)))
  }

  function clearPendingSelection() {
    setSelectedPendingIds(new Set())
  }

  async function confirmApprove() {
    if (!approveRow || !user) return
    const targetAlbum = approveAlbumId || approveRow.album_id
    if (!targetAlbum) {
      toast.error('Choose an album before approving.')
      return
    }
    setApproveBusy(true)
    try {
      const result = await approveGalleryPendingImage(supabase, approveRow, targetAlbum, user.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Approved and published')
      setApproveRow(null)
      setSelectedPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(approveRow.id)
        return next
      })
      void loadImages()
    } finally {
      setApproveBusy(false)
    }
  }

  function togglePublishedSelection(id: string, checked: boolean) {
    setSelectedPublishedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function selectAllVisiblePublished() {
    setSelectedPublishedIds(new Set(publishedRows.map((r) => r.id)))
  }

  function clearPublishedSelection() {
    setSelectedPublishedIds(new Set())
  }

  async function confirmUnpublish() {
    if (!unpublishTarget) return
    setPublishedActionBusy(true)
    try {
      const result = await unpublishGalleryImage(supabase, unpublishTarget.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Image unpublished — moved back to review queue')
      setUnpublishTarget(null)
      setSelectedPublishedIds((prev) => {
        const next = new Set(prev)
        next.delete(unpublishTarget.id)
        return next
      })
      setGalleryTab('review')
      void loadImages()
    } finally {
      setPublishedActionBusy(false)
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return
    setPublishedActionBusy(true)
    try {
      const result = await archiveGalleryImage(supabase, archiveTarget.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Image archived')
      setArchiveTarget(null)
      setSelectedPublishedIds((prev) => {
        const next = new Set(prev)
        next.delete(archiveTarget.id)
        return next
      })
      void loadImages()
    } finally {
      setPublishedActionBusy(false)
    }
  }

  async function confirmBulkUnpublish() {
    if (selectedPublishedRows.length === 0) return
    setPublishedActionBusy(true)
    try {
      const result = await unpublishGalleryImagesBulk(
        supabase,
        selectedPublishedRows.map((r) => r.id)
      )
      const succeededIds = new Set(
        selectedPublishedRows
          .filter((row) => !result.errors.some((e) => e.id === row.id))
          .map((r) => r.id)
      )
      setSelectedPublishedIds((prev) => {
        const next = new Set(prev)
        for (const id of succeededIds) next.delete(id)
        return next
      })
      setBulkUnpublishOpen(false)
      void loadImages()

      if (result.failed === 0) {
        toast.success(`Unpublished ${result.succeeded} image${result.succeeded === 1 ? '' : 's'}.`)
      } else if (result.succeeded === 0) {
        toast.error(`Could not unpublish ${result.failed} image${result.failed === 1 ? '' : 's'}.`)
      } else {
        toast.warning(
          `Unpublished ${result.succeeded} image${result.succeeded === 1 ? '' : 's'}. ${result.failed} could not be unpublished.`
        )
      }
    } finally {
      setPublishedActionBusy(false)
    }
  }

  async function confirmBulkApprove() {
    if (!user || selectedPendingRows.length === 0) return
    if (!bulkApproveAlbumId) {
      toast.error('Choose an album before publishing.')
      return
    }
    setApproveBusy(true)
    try {
      const result = await approveGalleryPendingImagesBulk(
        supabase,
        selectedPendingRows,
        bulkApproveAlbumId,
        user.id
      )
      const succeededIds = new Set(
        selectedPendingRows
          .filter((row) => !result.errors.some((e) => e.id === row.id))
          .map((r) => r.id)
      )
      setSelectedPendingIds((prev) => {
        const next = new Set(prev)
        for (const id of succeededIds) next.delete(id)
        return next
      })
      setBulkApproveOpen(false)
      void loadImages()

      if (result.failed === 0) {
        toast.success(`Published ${result.succeeded} image${result.succeeded === 1 ? '' : 's'}.`)
      } else if (result.succeeded === 0) {
        toast.error(`Could not publish ${result.failed} image${result.failed === 1 ? '' : 's'}.`)
      } else {
        toast.warning(
          `Published ${result.succeeded} image${result.succeeded === 1 ? '' : 's'}. ${result.failed} could not be published.`
        )
      }
    } finally {
      setApproveBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Gallery</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review public submissions, publish to <code className="text-xs">{GALLERY_PUBLIC_BUCKET}</code>, or upload
          directly as published.
        </p>
      </div>

      <Tabs value={activeGalleryTab} onValueChange={setGalleryTab}>
        <TabsList>
          <TabsTrigger value="review" data-testid="gallery-tab-review">
            Review queue ({pendingRows.length})
          </TabsTrigger>
          <TabsTrigger value="library" data-testid="gallery-tab-published">
            Published ({publishedCount})
          </TabsTrigger>
          <TabsTrigger value="albums" data-testid="gallery-tab-albums">
            Albums
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-6 pt-4">
          {pendingRows.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground" data-testid="gallery-review-empty">
              No pending gallery images.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllVisiblePending}
                  data-testid="gallery-select-all-pending"
                >
                  Select all ({pendingRows.length})
                </Button>
              </div>

              {selectedPendingCount > 0 ? (
                <div
                  className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 shadow-sm backdrop-blur-sm"
                  data-testid="gallery-bulk-action-bar"
                >
                  <p className="text-sm font-medium text-foreground">
                    {selectedPendingCount} selected
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1"
                      data-testid="gallery-bulk-publish-open"
                      onClick={() => {
                        const sharedAlbum =
                          selectedPendingRows.find((r) => r.album_id)?.album_id ?? albums[0]?.id ?? ''
                        setBulkApproveAlbumId(sharedAlbum)
                        setBulkApproveOpen(true)
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Publish selected
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="gallery-bulk-clear-selection"
                      onClick={clearPendingSelection}
                    >
                      Clear selection
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pendingRows.map((row) => {
                const isSelected = selectedPendingIds.has(row.id)
                return (
                <Card
                  key={row.id}
                  className={cn(
                    'transition-colors',
                    isSelected && 'border-primary/50 bg-primary/[0.04] ring-2 ring-primary/25'
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="relative">
                      <div className="absolute right-2 top-2 z-[1] rounded-md bg-background/90 p-1 shadow-sm">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(v) => togglePendingSelection(row.id, v === true)}
                          aria-label={`Select image from ${submitterLabel(row)}`}
                          data-testid={`gallery-pending-select-${row.id}`}
                        />
                      </div>
                    <div className="aspect-square rounded-lg bg-muted overflow-hidden">
                      {pendingThumbs[row.id] ? (
                        <img src={pendingThumbs[row.id]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      )}
                    </div>
                    </div>
                    {(row.submitted_by_name || row.submitted_by_email) && (
                      <p className="text-xs text-muted-foreground">
                        From {row.submitted_by_name ?? '—'} · {row.submitted_by_email ?? '—'}
                      </p>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Caption</Label>
                      <Input
                        defaultValue={row.caption ?? ''}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          if (v !== (row.caption ?? '')) void saveMeta(row.id, { caption: v || null })
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Alt text</Label>
                      <Input
                        defaultValue={row.alt_text ?? ''}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          if (v !== (row.alt_text ?? '')) void saveMeta(row.id, { alt_text: v || null })
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Album</Label>
                      <Select
                        value={row.album_id ?? NO_ALBUM}
                        onValueChange={(v) => void saveMeta(row.id, { album_id: albumIdForDb(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_ALBUM}>Unassigned</SelectItem>
                          {albums.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          setApproveRow(row)
                          setApproveAlbumId(row.album_id ?? albums[0]?.id ?? '')
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => void rejectPendingImage(row.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        onClick={() => void archivePendingImage(row.id)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        data-testid="gallery-review-delete"
                        onClick={() => setDeleteId(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )})}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="space-y-6 pt-4">
          <div className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Direct upload (published)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Album (optional)</Label>
                <Select value={selectedAlbum} onValueChange={setSelectedAlbum}>
                  <SelectTrigger>
                    <SelectValue placeholder="No album" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ALBUM}>No album</SelectItem>
                    {albums.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caption">Caption</Label>
                <Input id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional caption" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading…' : 'Choose & Upload'}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={albumFilter} onValueChange={setAlbumFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All albums</SelectItem>
                <SelectItem value={NO_ALBUM}>Unassigned (no album)</SelectItem>
                {albums.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {publishedRows.length === 0 ? (
            <div
              className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground"
              data-testid="gallery-published-empty"
            >
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No published images in this filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllVisiblePublished}
                  data-testid="gallery-select-all-published"
                >
                  Select all ({publishedRows.length})
                </Button>
              </div>
              {selectedPublishedCount > 0 ? (
                <div
                  className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 shadow-sm backdrop-blur-sm"
                  data-testid="gallery-published-bulk-action-bar"
                >
                  <p className="text-sm font-medium text-foreground">{selectedPublishedCount} selected</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      data-testid="gallery-published-bulk-unpublish-open"
                      onClick={() => setBulkUnpublishOpen(true)}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Unpublish selected
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="gallery-published-bulk-clear"
                      onClick={clearPublishedSelection}
                    >
                      Clear selection
                    </Button>
                  </div>
                </div>
              ) : null}
              <div
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                data-testid="gallery-published-grid"
              >
              {publishedRows.map((img) => {
                const thumb = img.thumbnail_url ?? img.image_url
                const full = img.image_url ?? img.thumbnail_url
                if (!thumb || !full) return null
                const isSelected = selectedPublishedIds.has(img.id)
                return (
                  <div
                    key={img.id}
                    className={cn(
                      'relative rounded-xl overflow-hidden bg-muted aspect-square ring-2',
                      isSelected ? 'ring-primary/50' : 'ring-transparent'
                    )}
                  >
                    <div className="absolute right-2 top-2 z-[1] rounded-md bg-background/90 p-1 shadow-sm">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(v) => togglePublishedSelection(img.id, v === true)}
                        aria-label="Select published image"
                        data-testid={`gallery-published-select-${img.id}`}
                      />
                    </div>
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                    
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-black/80 p-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 px-2 text-xs"
                        data-testid="gallery-published-view"
                        onClick={() => setViewPublished(img)}
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 px-2 text-xs"
                        data-testid="gallery-published-unpublish"
                        onClick={() => setUnpublishTarget(img)}
                      >
                        <Undo2 className="h-3 w-3" />
                        Unpublish
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 px-2 text-xs"
                        data-testid="gallery-published-archive"
                        onClick={() => setArchiveTarget(img)}
                      >
                        <Archive className="h-3 w-3" />
                        Archive
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => void saveMeta(img.id, { is_homepage_featured: !img.is_homepage_featured })}
                      >
                        <Star className="h-3 w-3" />
                        {img.is_homepage_featured ? 'Unfeature' : 'Home'}
                      </Button>
                      {img.album_id ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-xs"
                          onClick={() => void setAlbumCover(img.album_id!, img.thumbnail_url, img.image_url)}
                        >
                          Cover
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7 gap-1 px-2 text-xs"
                        data-testid="gallery-published-delete"
                        onClick={() => setDeleteId(img.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                    {img.caption ? (
                      <div className="absolute top-2 left-2 max-w-[70%] rounded bg-black/60 px-2 py-0.5 text-[10px] text-white truncate">{img.caption}</div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="albums" className="space-y-4 pt-4">
          <div className="rounded-xl border p-5 space-y-3 max-w-md">
            <h2 className="font-semibold">Albums</h2>
            <div className="flex gap-2">
              <Input
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="New album name"
                onKeyDown={(e) => e.key === 'Enter' && createAlbum()}
              />
              <Button onClick={() => void createAlbum()} size="sm">
                Add
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newAlbumOpenSubs} onChange={(e) => setNewAlbumOpenSubs(e.target.checked)} />
              Open for public submissions before first publish
            </label>
            <div className="space-y-1">
              {albums.length === 0 ? (
                <p className="text-sm text-muted-foreground">No albums yet</p>
              ) : (
                albums.map((a) => (
                  <div key={a.id} className="text-sm py-1.5 px-2 rounded hover:bg-muted flex items-center justify-between">
                    <span>{a.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={bulkApproveOpen}
        onOpenChange={(open) => {
          if (!open) setBulkApproveOpen(false)
        }}
      >
        <DialogContent data-testid="gallery-bulk-publish-dialog">
          <DialogHeader>
            <DialogTitle>Publish selected images</DialogTitle>
            <DialogDescription>
              This will publish {selectedPendingCount} selected image
              {selectedPendingCount === 1 ? '' : 's'} to the public gallery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Album</Label>
            <Select value={bulkApproveAlbumId} onValueChange={setBulkApproveAlbumId}>
              <SelectTrigger data-testid="gallery-bulk-album-select">
                <SelectValue placeholder="Select album" />
              </SelectTrigger>
              <SelectContent>
                {albums.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkApproveOpen(false)}
              disabled={approveBusy}
            >
              Cancel
            </Button>
            <Button
              data-testid="gallery-bulk-publish-confirm"
              onClick={() => void confirmBulkApprove()}
              disabled={approveBusy || !bulkApproveAlbumId || !albums.length || selectedPendingCount === 0}
            >
              {approveBusy
                ? 'Publishing…'
                : `Publish ${selectedPendingCount} image${selectedPendingCount === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!approveRow}
        onOpenChange={(open) => {
          if (!open) setApproveRow(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve submission</DialogTitle>
            <DialogDescription>Copies optimized files to public storage and marks the image published.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Album</Label>
            <Select value={approveAlbumId} onValueChange={setApproveAlbumId}>
              <SelectTrigger>
                <SelectValue placeholder="Select album" />
              </SelectTrigger>
              <SelectContent>
                {albums.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveRow(null)} disabled={approveBusy}>
              Cancel
            </Button>
            <Button onClick={() => void confirmApprove()} disabled={approveBusy || !approveAlbumId || !albums.length}>
              {approveBusy ? 'Publishing…' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewPublished} onOpenChange={(open) => !open && setViewPublished(null)}>
        <DialogContent className="sm:max-w-3xl" data-testid="gallery-published-view-dialog">
          <DialogHeader>
            <DialogTitle>Published image</DialogTitle>
            <DialogDescription>{viewPublished?.caption || 'No caption'}</DialogDescription>
          </DialogHeader>
          {viewPublished ? (
            <img
              src={viewPublished.image_url ?? viewPublished.thumbnail_url ?? ''}
              alt={viewPublished.alt_text ?? viewPublished.caption ?? 'Gallery image'}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPublished(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!unpublishTarget}
        onOpenChange={(open) => !open && setUnpublishTarget(null)}
        title="Unpublish image?"
        description="This removes the image from the public gallery but keeps it in admin records."
        confirmLabel="Unpublish"
        loading={publishedActionBusy}
        onConfirm={() => void confirmUnpublish()}
        contentTestId="gallery-unpublish-dialog"
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive image?"
        description="This hides the image from the public gallery and the published list, but keeps it for audit."
        confirmLabel="Archive"
        loading={publishedActionBusy}
        onConfirm={() => void confirmArchive()}
      />

      <ConfirmDialog
        open={bulkUnpublishOpen}
        onOpenChange={(open) => !open && setBulkUnpublishOpen(false)}
        title="Unpublish selected images?"
        description="This removes the selected images from the public gallery but keeps them in admin records."
        confirmLabel="Unpublish"
        loading={publishedActionBusy}
        onConfirm={() => void confirmBulkUnpublish()}
        contentTestId="gallery-bulk-unpublish-dialog"
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete image permanently?"
        description="This permanently deletes the image record and removes files from gallery storage when possible."
        confirmLabel="Delete permanently"
        variant="destructive"
        loading={publishedActionBusy}
        onConfirm={() => void deleteImage()}
      />
    </div>
  )
}
