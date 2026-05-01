import { useEffect, useState, useRef } from 'react'
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const NO_ALBUM = 'unassigned' as const

interface Album {
  id: string
  name: string
  slug: string
}

interface GalleryImage {
  id: string
  album_id: string | null
  caption: string | null
  image_url: string
  created_at: string
}

function albumIdForDb(value: string): string | null {
  return value === NO_ALBUM ? null : value
}

export function AdminGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [albumFilter, setAlbumFilter] = useState('all')
  const [newAlbumName, setNewAlbumName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [selectedAlbum, setSelectedAlbum] = useState<string>(NO_ALBUM)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadAlbums() {
    const { data } = await supabase.from('gallery_albums').select('id, name, slug').order('name')
    setAlbums(data ?? [])
  }

  async function loadImages() {
    let q = supabase.from('gallery_images').select('id, album_id, caption, image_url, created_at').order('created_at', { ascending: false })
    if (albumFilter === NO_ALBUM) q = q.is('album_id', null)
    else if (albumFilter !== 'all') q = q.eq('album_id', albumFilter)
    const { data } = await q
    setImages(data ?? [])
  }

  useEffect(() => {
    loadAlbums()
    loadImages()
  }, [])

  useEffect(() => {
    loadImages()
  }, [albumFilter])

  async function createAlbum() {
    if (!newAlbumName.trim()) return
    const slug = newAlbumName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
    const { error } = await supabase.from('gallery_albums').insert([{ name: newAlbumName.trim(), slug }])
    if (error) toast.error('Album creation failed')
    else {
      toast.success('Album created')
      setNewAlbumName('')
      loadAlbums()
    }
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `gallery/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('gallery').upload(path, file)
    if (uploadError) {
      toast.error('Upload failed')
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(path)
    const { error: dbError } = await supabase.from('gallery_images').insert([{
      image_url: publicUrl,
      caption: caption || null,
      album_id: albumIdForDb(selectedAlbum),
      status: 'published',
    }])
    if (dbError) toast.error('Failed to save image record')
    else {
      toast.success('Image uploaded')
      setCaption('')
      loadImages()
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function deleteImage() {
    if (!deleteId) return
    const { error } = await supabase.from('gallery_images').delete().eq('id', deleteId)
    if (error) toast.error('Delete failed')
    else {
      toast.success('Image deleted')
      loadImages()
    }
    setDeleteId(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Gallery</h1>
        <p className="text-muted-foreground text-sm">{images.length} images</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Upload Image</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Album (optional)</Label>
                <Select value={selectedAlbum} onValueChange={setSelectedAlbum}>
                  <SelectTrigger><SelectValue placeholder="No album" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ALBUM}>No album</SelectItem>
                    {albums.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caption">Caption</Label>
                <Input id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional caption" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading…' : 'Choose & Upload'}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={albumFilter} onValueChange={setAlbumFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All albums</SelectItem>
                <SelectItem value={NO_ALBUM}>Unassigned (no album)</SelectItem>
                {albums.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {images.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No images yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div key={img.id} className="group relative rounded-xl overflow-hidden bg-muted aspect-square">
                  <img src={img.image_url} alt={img.caption ?? ''} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => setDeleteId(img.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {img.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold">Albums</h2>
            <div className="flex gap-2">
              <Input
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="New album name"
                onKeyDown={(e) => e.key === 'Enter' && createAlbum()}
              />
              <Button onClick={createAlbum} size="sm">Add</Button>
            </div>
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
        </div>
      </div>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Image" description="This action cannot be undone." onConfirm={deleteImage} />
    </div>
  )
}
