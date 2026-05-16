import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import {
  GALLERY_MAX_INPUT_BYTES,
  GALLERY_PUBLIC_BUCKET,
  GALLERY_SUBMISSIONS_BUCKET,
  gallerySubmissionThumbPath,
  gallerySubmissionWebPath,
} from '@/lib/galleryConstants'
import { buildGalleryWebAndThumb, GalleryImageProcessingError } from '@/lib/galleryImageProcessing'
import { supabase } from '@/lib/supabase'
import type { GalleryAlbum } from '@/lib/types'
import { toast } from 'sonner'

type QueuedFile = {
  id: string
  file: File
  previewUrl: string
  caption: string
  status: 'queued' | 'processing' | 'uploading' | 'saving' | 'done' | 'error'
  error?: string
}

function newId(): string {
  return crypto.randomUUID()
}

function mimeToExt(mime: 'image/webp' | 'image/jpeg'): 'webp' | 'jpg' {
  return mime === 'image/webp' ? 'webp' : 'jpg'
}

export function GallerySubmitPage() {
  const { user } = useAuth()
  const [albums, setAlbums] = useState<Pick<GalleryAlbum, 'id' | 'name' | 'slug'>[]>([])
  const [albumId, setAlbumId] = useState<string>('')
  const [queued, setQueued] = useState<QueuedFile[]>([])
  const [consent, setConsent] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progressPct, setProgressPct] = useState(0)

  const anonBatchId = useMemo(() => newId(), [])

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.from('gallery_albums').select('id, name, slug').order('name')
      if (error) {
        console.warn('[gallery-submit] albums:', error.message)
        toast.error('Could not load albums. Try again later.')
        return
      }
      const rows = (data ?? []) as Pick<GalleryAlbum, 'id' | 'name' | 'slug'>[]
      setAlbums(rows)
    })()
  }, [])

  useEffect(() => {
    if (albums.length > 0 && !albumId) setAlbumId(albums[0].id)
  }, [albums, albumId])

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return
    const next: QueuedFile[] = []
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image.`)
        continue
      }
      if (file.size > GALLERY_MAX_INPUT_BYTES) {
        toast.error(`${file.name} is too large (max ${Math.round(GALLERY_MAX_INPUT_BYTES / (1024 * 1024))} MB).`)
        continue
      }
      next.push({
        id: newId(),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
        status: 'queued',
      })
    }
    setQueued((q) => [...q, ...next])
  }

  function removeQueued(id: string) {
    setQueued((q) => {
      const row = q.find((x) => x.id === id)
      if (row) URL.revokeObjectURL(row.previewUrl)
      return q.filter((x) => x.id !== id)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!albumId) {
      toast.error('Choose an album.')
      return
    }
    if (!consent) {
      toast.error('Please confirm consent before submitting.')
      return
    }
    if (!user) {
      if (!guestName.trim() || !guestEmail.trim()) {
        toast.error('Please enter your name and email.')
        return
      }
    }
    if (queued.length === 0) {
      toast.error('Add at least one photo.')
      return
    }

    setSubmitting(true)
    setProgressPct(0)

    const owner =
      user != null
        ? ({ kind: 'user' as const, userId: user.id })
        : ({ kind: 'anon' as const, batchId: anonBatchId })

    let done = 0
    const total = queued.length

    for (const row of queued) {
      if (row.status === 'done') {
        done++
        continue
      }
      setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'processing' } : x)))
      let ext: 'webp' | 'jpg'
      let web: Blob
      let thumb: Blob
      try {
        const built = await buildGalleryWebAndThumb(row.file)
        web = built.web
        thumb = built.thumb
        ext = mimeToExt(built.mime)
      } catch (err) {
        const msg = err instanceof GalleryImageProcessingError ? err.message : 'Could not process image.'
        setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'error', error: msg } : x)))
        toast.error(msg)
        setSubmitting(false)
        return
      }

      const fileId = newId()
      const webPath = gallerySubmissionWebPath(owner, fileId, ext)
      const thumbPath = gallerySubmissionThumbPath(owner, fileId, ext)

      setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'uploading' } : x)))

      const { error: upWeb } = await supabase.storage.from(GALLERY_SUBMISSIONS_BUCKET).upload(webPath, web, {
        contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg',
        upsert: false,
      })
      if (upWeb) {
        const msg = upWeb.message
        setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'error', error: msg } : x)))
        toast.error(msg)
        setSubmitting(false)
        return
      }
      const { error: upTh } = await supabase.storage.from(GALLERY_SUBMISSIONS_BUCKET).upload(thumbPath, thumb, {
        contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg',
        upsert: false,
      })
      if (upTh) {
        const msg = upTh.message
        setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'error', error: msg } : x)))
        toast.error(msg)
        setSubmitting(false)
        return
      }

      setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'saving' } : x)))

      const { error: ins } = await supabase.from('gallery_images').insert([
        {
          album_id: albumId,
          status: 'pending',
          caption: row.caption.trim() || null,
          alt_text: null,
          image_url: null,
          thumbnail_url: null,
          submission_storage_bucket: GALLERY_SUBMISSIONS_BUCKET,
          submission_storage_path: webPath,
          submission_thumb_path: thumbPath,
          submitted_by_user_id: user?.id ?? null,
          submitted_by_name: user ? null : guestName.trim(),
          submitted_by_email: user ? null : guestEmail.trim(),
        },
      ])
      if (ins) {
        const msg = ins.message
        setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'error', error: msg } : x)))
        toast.error(msg)
        setSubmitting(false)
        return
      }

      done++
      setProgressPct(Math.round((done / total) * 100))
      setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'done' } : x)))
    }

    toast.success('Photos submitted for review. Thank you!')
    setSubmitting(false)
    setQueued([])
  }

  return (
    <>
      <SEOHead
        title="Submit gallery photos"
        description="Share photos from Kenyan Community Houston events for review before they appear in the public gallery."
      />

      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit photos</h1>
          <p className="text-muted-foreground text-sm">
            Uploads are reviewed by KIGH before publication. Photos appear only after approval.{' '}
            <Link to="/gallery" className="text-primary underline-offset-4 hover:underline">
              View public gallery
            </Link>
            .
          </p>
        </div>

        <form className="space-y-8" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="album">Album / event</Label>
            <Select value={albumId} onValueChange={setAlbumId} disabled={!albums.length}>
              <SelectTrigger id="album" data-testid="gallery-submit-album">
                <SelectValue placeholder={albums.length ? 'Select album' : 'No albums available'} />
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

          {!user && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gname">Your name</Label>
                <Input
                  id="gname"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  autoComplete="name"
                  data-testid="gallery-submit-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gemail">Email</Label>
                <Input
                  id="gemail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  autoComplete="email"
                  data-testid="gallery-submit-email"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label>Photos</Label>
            <p className="text-xs text-muted-foreground">
              Up to browser limits for multi-select. Max {Math.round(GALLERY_MAX_INPUT_BYTES / (1024 * 1024))} MB per
              file. Images are resized in your browser before upload (metadata is not kept).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2" asChild disabled={submitting}>
                <label>
                  <ImagePlus className="h-4 w-4" />
                  Add images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    data-testid="gallery-submit-file-input"
                    onChange={(ev) => {
                      onPickFiles(ev.target.files)
                      ev.target.value = ''
                    }}
                  />
                </label>
              </Button>
            </div>

            {queued.length > 0 && (
              <ul className="space-y-4 mt-4">
                {queued.map((row) => (
                  <li key={row.id} className="rounded-lg border p-3 flex gap-3">
                    <img
                      src={row.previewUrl}
                      alt=""
                      className="h-20 w-20 rounded-md object-cover shrink-0 bg-muted"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-xs text-muted-foreground truncate">{row.file.name}</p>
                      <Textarea
                        rows={2}
                        placeholder="Optional caption (not shown until approved)"
                        value={row.caption}
                        onChange={(e) =>
                          setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, caption: e.target.value } : x)))
                        }
                        className="text-sm resize-none"
                      />
                      {row.status !== 'queued' && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {row.status}
                          {row.error ? `: ${row.error}` : ''}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => removeQueued(row.id)}
                      disabled={submitting}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                data-testid="gallery-submit-consent"
              />
              <Label htmlFor="consent" className="text-sm leading-relaxed font-normal cursor-pointer">
                I confirm I have the right to share these photos with Kenyan Community Houston (KIGH), and I understand
                they may be cropped or edited for the website. KIGH may use approved images on this site and related
                community channels. I am not uploading private or sensitive information about others without their
                permission.
              </Label>
            </div>
          </div>

          {submitting && (
            <div className="space-y-2">
              <Progress value={progressPct} />
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting || queued.length === 0 || !albums.length} data-testid="gallery-submit-button">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit for review'
              )}
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link to="/gallery">Cancel</Link>
            </Button>
          </div>
        </form>

        <p className="mt-10 text-xs text-muted-foreground">
          Storage note: submissions go to the private <code className="text-[11px]">{GALLERY_SUBMISSIONS_BUCKET}</code>{' '}
          bucket. Approved images are copied to <code className="text-[11px]">{GALLERY_PUBLIC_BUCKET}</code> for the
          public gallery.
        </p>
      </div>
    </>
  )
}
