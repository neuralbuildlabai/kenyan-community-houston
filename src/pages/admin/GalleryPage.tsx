import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Upload, Trash2, Image as ImageIcon, Check, X, Archive, Star, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  GALLERY_PUBLIC_BUCKET,
  galleryPublicObjectKeys,
} from '@/lib/galleryConstants'
import { buildGalleryWebAndThumb, GalleryImageProcessingError } from '@/lib/galleryImageProcessing'
import { PRIVATE_SIGNED_URL_EXPIRY_SEC } from '@/lib/kighPrivateStorage'

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

function extFromPath(p: string | null | undefined): 'webp' | 'jpg' {
  if (!p) return 'jpg'
  return p.endsWith('.webp') ? 'webp' : 'jpg'
}

function contentTypeForExt(ext: 'webp' | 'jpg'): string {
  return ext === 'webp' ? 'image/webp' : 'image/jpeg'
}

export function AdminGalleryPage() {
  const { user } = useAuth()
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

  const loadAlbums = useCallback(async () => {
    const { data } = await supabase.from('gallery_albums').select('id, name, slug').order('name')
    setAlbums(data ?? [])
  }, [])

  const loadImages = useCallback(async () => {
    const { data, error } = await supabase
      .from('gallery_images')
      .select(
        'id, album_id, caption, alt_text, image_url, thumbnail_url, status, created_at, submission_storage_bucket, submission_storage_path, submission_thumb_path, is_homepage_featured, sort_order, submitted_by_name, submitted_by_email'
      )
      .order('created_at', { ascending: false })
    if (error) {
      toast.error(error.message)
      return
    }
    setImages((data ?? []) as GalleryImageRow[])
  }, [])

  const publishedCount = useMemo(() => images.filter((i) => i.status === 'published').length, [images])

  const pendingRows = useMemo(() => images.filter((i) => i.status === 'pending'), [images])
  const publishedRows = useMemo(() => {
    let rows = images.filter((i) => i.status === 'published')
    if (albumFilter === NO_ALBUM) rows = rows.filter((i) => !i.album_id)
    else if (albumFilter !== 'all') rows = rows.filter((i) => i.album_id === albumFilter)
    return rows
  }, [images, albumFilter])

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
    const { error } = await supabase.from('gallery_images').delete().eq('id', deleteId)
    if (error) toast.error('Delete failed')
    else {
      toast.success('Image deleted')
      void loadImages()
    }
    setDeleteId(null)
  }

  async function setImageStatus(id: string, status: string) {
    const { error } = await supabase.from('gallery_images').update({ status }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Updated')
      void loadImages()
    }
  }

  async function saveMeta(
    id: string,
    patch: Partial<Pick<GalleryImageRow, 'caption' | 'alt_text' | 'album_id' | 'is_homepage_featured' | 'sort_order'>>
  ) {
    const { error } = await supabase.from('gallery_images').update(patch).eq('id', id)
    if (error) toast.error(error.message)
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

  async function confirmApprove() {
    if (!approveRow || !user) return
    const targetAlbum = approveAlbumId || approveRow.album_id
    if (!targetAlbum) {
      toast.error('Choose an album before approving.')
      return
    }
    const bucket = approveRow.submission_storage_bucket
    const webPath = approveRow.submission_storage_path
    const thumbPath = approveRow.submission_thumb_path
    if (!bucket || !webPath || !thumbPath) {
      toast.error('Missing submission paths.')
      return
    }
    setApproveBusy(true)
    try {
      const ext = extFromPath(webPath)
      const keys = galleryPublicObjectKeys(targetAlbum, approveRow.id, ext)
      const ct = contentTypeForExt(ext)

      const { data: webBlob, error: e1 } = await supabase.storage.from(bucket).download(webPath)
      if (e1 || !webBlob) {
        toast.error(e1?.message ?? 'Download web image failed')
        return
      }
      const { data: thumbBlob, error: e2 } = await supabase.storage.from(bucket).download(thumbPath)
      if (e2 || !thumbBlob) {
        toast.error(e2?.message ?? 'Download thumbnail failed')
        return
      }

      const { error: u1 } = await supabase.storage.from(GALLERY_PUBLIC_BUCKET).upload(keys.web, webBlob, {
        contentType: ct,
        upsert: true,
      })
      if (u1) {
        toast.error(u1.message)
        return
      }
      const { error: u2 } = await supabase.storage.from(GALLERY_PUBLIC_BUCKET).upload(keys.thumb, thumbBlob, {
        contentType: ct,
        upsert: true,
      })
      if (u2) {
        toast.error(u2.message)
        return
      }

      const { data: pubWeb } = supabase.storage.from(GALLERY_PUBLIC_BUCKET).getPublicUrl(keys.web)
      const { data: pubTh } = supabase.storage.from(GALLERY_PUBLIC_BUCKET).getPublicUrl(keys.thumb)

      const { error: upDb } = await supabase
        .from('gallery_images')
        .update({
          status: 'published',
          album_id: targetAlbum,
          image_url: pubWeb.publicUrl,
          thumbnail_url: pubTh.publicUrl,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          submission_storage_bucket: null,
          submission_storage_path: null,
          submission_thumb_path: null,
        })
        .eq('id', approveRow.id)

      if (upDb) {
        toast.error(upDb.message)
        return
      }

      await supabase.storage.from(bucket).remove([webPath, thumbPath])

      toast.success('Approved and published')
      setApproveRow(null)
      void loadImages()
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

      <Tabs defaultValue="review">
        <TabsList>
          <TabsTrigger value="review">Review queue ({pendingRows.length})</TabsTrigger>
          <TabsTrigger value="library">Published ({publishedCount})</TabsTrigger>
          <TabsTrigger value="albums">Albums</TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-6 pt-4">
          {pendingRows.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground">
              No pending submissions
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pendingRows.map((row) => (
                <Card key={row.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="aspect-square rounded-lg bg-muted overflow-hidden">
                      {pendingThumbs[row.id] ? (
                        <img src={pendingThumbs[row.id]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      )}
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
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => void setImageStatus(row.id, 'rejected')}>
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button size="sm" variant="secondary" className="gap-1" onClick={() => void setImageStatus(row.id, 'archived')}>
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
            <div className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No published images in this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {publishedRows.map((img) => {
                const thumb = img.thumbnail_url ?? img.image_url
                const full = img.image_url ?? img.thumbnail_url
                if (!thumb || !full) return null
                return (
                  <div key={img.id} className="group relative rounded-xl overflow-hidden bg-muted aspect-square">
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 p-2">
                      <Button size="sm" variant="secondary" className="gap-1" onClick={() => void saveMeta(img.id, { is_homepage_featured: !img.is_homepage_featured })}>
                        <Star className="h-3.5 w-3.5" />
                        {img.is_homepage_featured ? 'Unfeature' : 'Homepage'}
                      </Button>
                      {img.album_id && (
                        <Button size="sm" variant="secondary" onClick={() => void setAlbumCover(img.album_id!, img.thumbnail_url, img.image_url)}>
                          Set cover
                        </Button>
                      )}
                      <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => setDeleteId(img.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {img.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs px-2 py-1 truncate">{img.caption}</div>
                    )}
                  </div>
                )
              })}
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

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Image" description="This action cannot be undone." onConfirm={deleteImage} />
    </div>
  )
}
