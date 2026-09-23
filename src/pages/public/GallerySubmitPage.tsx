import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Loader2, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import {
  createdGalleryAlbumFromRpc,
  GALLERY_NEW_ALBUM_ID,
  galleryAlbumDescriptionError,
  galleryAlbumNameError,
  galleryAlbumOptionsFromRpc,
  mergeGalleryAlbumOptions,
} from '@/lib/galleryAlbumCreate'
import {
  GALLERY_MAX_INPUT_BYTES,
  GALLERY_PUBLIC_BUCKET,
  GALLERY_SUBMISSIONS_BUCKET,
  gallerySubmissionThumbPath,
  gallerySubmissionWebPath,
} from '@/lib/galleryConstants'
import { loginNextFromLocation } from '@/lib/loginNext'
import { buildGalleryWebAndThumb, GalleryImageProcessingError } from '@/lib/galleryImageProcessing'
import { isHeicFile, isLikelyImageFile } from '@/lib/imageOptimization'
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
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const [albums, setAlbums] = useState<Pick<GalleryAlbum, 'id' | 'name' | 'slug'>[]>([])
  const [albumId, setAlbumId] = useState<string>('')
  const [newAlbumName, setNewAlbumName] = useState('')
  const [newAlbumDescription, setNewAlbumDescription] = useState('')
  const [queued, setQueued] = useState<QueuedFile[]>([])
  const [consent, setConsent] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progressPct, setProgressPct] = useState(0)

  const anonBatchId = useMemo(() => newId(), [])

  const creatingAlbum = albumId === GALLERY_NEW_ALBUM_ID

  const canSubmit = useMemo(() => {
    if (!consent || queued.length === 0) return false
    if (creatingAlbum) {
      if (!user) return false
      if (galleryAlbumNameError(newAlbumName) || galleryAlbumDescriptionError(newAlbumDescription)) return false
    } else if (!albumId || albums.length === 0) {
      return false
    }
    if (user) return true
    return guestName.trim().length >= 2 && guestEmail.trim().includes('@')
  }, [
    albumId,
    albums.length,
    consent,
    creatingAlbum,
    guestEmail,
    guestName,
    newAlbumDescription,
    newAlbumName,
    queued.length,
    user,
  ])

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('gallery_albums_public')
        .select('id, name, slug')
        .eq('open_for_submissions', true)
        .order('name')
      if (cancelled) return
      if (error) {
        console.warn('[gallery-submit] albums:', error.message)
        toast.error('Could not load albums for submission. Try again later.')
        return
      }
      const openRows = (data ?? []) as Pick<GalleryAlbum, 'id' | 'name' | 'slug'>[]
      let mine: Pick<GalleryAlbum, 'id' | 'name' | 'slug'>[] = []
      if (user) {
        const mineRes = await supabase.rpc('kigh_list_my_gallery_albums')
        if (cancelled) return
        if (mineRes.error) {
          console.warn('[gallery-submit] my albums:', mineRes.error.message)
        } else {
          mine = galleryAlbumOptionsFromRpc(mineRes.data)
        }
      }
      const rows = mergeGalleryAlbumOptions(openRows, mine)
      setAlbums(rows)
      if (rows.length === 0 && !user) {
        toast.message('No albums are open for submissions right now.', {
          description: 'Sign in to create an album, or check back later.',
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  useEffect(() => {
    if (albumId) return
    if (albums.length > 0) setAlbumId(albums[0].id)
    else if (user) setAlbumId(GALLERY_NEW_ALBUM_ID)
  }, [albums, albumId, user])

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return
    const next: QueuedFile[] = []
    for (const file of Array.from(list)) {
      if (!isLikelyImageFile(file)) {
        toast.error(`${file.name} is not an image.`)
        continue
      }
      if (isHeicFile(file)) {
        toast.error(`${file.name} is HEIC/HEIF, which is not supported. Please convert to JPEG first.`)
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
    if (creatingAlbum) {
      if (!user) {
        toast.error('Sign in to create a new album.')
        return
      }
      const nameError = galleryAlbumNameError(newAlbumName)
      if (nameError) {
        toast.error(nameError)
        return
      }
      const descriptionError = galleryAlbumDescriptionError(newAlbumDescription)
      if (descriptionError) {
        toast.error(descriptionError)
        return
      }
    } else if (!albumId) {
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

    let targetAlbumId = albumId
    if (creatingAlbum && user) {
      const { data, error } = await supabase.rpc('kigh_create_member_gallery_album', {
        p_name: newAlbumName.trim(),
        p_description: newAlbumDescription.trim() || null,
      })
      const created = createdGalleryAlbumFromRpc(data)
      if (error || !created) {
        toast.error(error?.message ?? 'Could not create the album.')
        setSubmitting(false)
        return
      }
      targetAlbumId = created.id
      setAlbumId(created.id)
      setAlbums((prev) => mergeGalleryAlbumOptions(prev, [created]))
      setNewAlbumName('')
      setNewAlbumDescription('')
    }

    const owner =
      user != null
        ? ({ kind: 'user' as const, userId: user.id })
        : ({ kind: 'anon' as const, batchId: anonBatchId })

    let done = 0
    let failed = 0
    let optimizedCount = 0
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
        if (built.wasOptimized) optimizedCount += 1
      } catch (err) {
        const msg =
          err instanceof GalleryImageProcessingError ? err.message : 'Could not process image.'
        setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'error', error: msg } : x)))
        failed += 1
        console.warn(`[gallery submit] ${row.file.name}: ${msg}`)
        continue
      }

      const fileId = newId()
      const webPath = gallerySubmissionWebPath(owner, fileId, ext)
      const thumbPath = gallerySubmissionThumbPath(owner, fileId, ext)

      setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'uploading' } : x)))

      const { error: upWeb } = await supabase.storage
        .from(GALLERY_SUBMISSIONS_BUCKET)
        .upload(webPath, web, {
          contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg',
          upsert: false,
        })
      if (upWeb) {
        const msg = upWeb.message
        setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'error', error: msg } : x)))
        failed += 1
        console.warn(`[gallery submit] ${row.file.name}: ${msg}`)
        continue
      }
      const { error: upTh } = await supabase.storage
        .from(GALLERY_SUBMISSIONS_BUCKET)
        .upload(thumbPath, thumb, {
          contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg',
          upsert: false,
        })
      if (upTh) {
        const msg = upTh.message
        setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'error', error: msg } : x)))
        failed += 1
        console.warn(`[gallery submit] ${row.file.name}: ${msg}`)
        continue
      }

      setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'saving' } : x)))

      const { error: ins } = await supabase.from('gallery_images').insert([
        {
          album_id: targetAlbumId,
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
        failed += 1
        console.warn(`[gallery submit] ${row.file.name}: ${msg}`)
        continue
      }

      done++
      setProgressPct(Math.round(((done + failed) / total) * 100))
      setQueued((q) => q.map((x) => (x.id === row.id ? { ...x, status: 'done' } : x)))
    }

    if (done > 0 && failed === 0) {
      if (optimizedCount > 0) {
        toast.success('Photos submitted for review. Some large photos were optimized before upload. Thank you!')
      } else {
        toast.success('Photos submitted for review. Thank you!')
      }
      setQueued([])
    } else if (done > 0 && failed > 0) {
      toast.warning(`${done} photo${done === 1 ? '' : 's'} submitted for review. ${failed} could not be uploaded.`)
      if (optimizedCount > 0) {
        toast.message('Some large photos were optimized before upload.')
      }
    } else if (failed > 0) {
      toast.error(`${failed} photo${failed === 1 ? '' : 's'} could not be uploaded. See queue details below.`)
    }

    setSubmitting(false)
  }

  return (
    <>
      <SEOHead
        title="Submit gallery photos"
        description="Share photos from Kenyans in Greater Houston events for review before they appear in the public gallery."
      />

      <PublicPageHero
        eyebrow="Community gallery"
        title="Submit photos"
        subtitle="Share moments from KIGH events and community gatherings. Please upload only community-safe photos — no images of children without guardian consent, and nothing private or sensitive. Approved photos appear in the public gallery."
        primaryAction={
          <Button asChild variant="ghost" size="sm" className="-ml-3 gap-1">
            <Link to="/gallery">
              <ArrowLeft className="h-4 w-4" /> Back to gallery
            </Link>
          </Button>
        }
        tone="cream"
      />

      <section className="py-10 sm:py-14 lg:py-16">
        <div className="public-container grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-2">
            <form className="form-page-card space-y-10" onSubmit={(e) => void handleSubmit(e)}>
              <fieldset className="space-y-6">
                <legend className="text-base font-semibold text-foreground">Album &amp; uploader</legend>
                <div className="space-y-2">
                  <Label htmlFor="album">Album / event</Label>
                  <Select
                    value={albumId}
                    onValueChange={setAlbumId}
                    disabled={!user && albums.length === 0}
                  >
                    <SelectTrigger id="album" data-testid="gallery-submit-album">
                      <SelectValue
                        placeholder={
                          albums.length
                            ? 'Select album'
                            : user
                              ? 'Create a new album'
                              : 'No albums available'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {user ? (
                        <SelectItem value={GALLERY_NEW_ALBUM_ID}>Create a new album</SelectItem>
                      ) : null}
                      {albums.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {creatingAlbum ? (
                    <div className="space-y-4 pt-2" data-testid="gallery-submit-new-album">
                      <div className="space-y-2">
                        <Label htmlFor="new-album-name">New album name *</Label>
                        <Input
                          id="new-album-name"
                          required
                          value={newAlbumName}
                          onChange={(e) => setNewAlbumName(e.target.value)}
                          placeholder="e.g. Madaraka Day 2026"
                          maxLength={80}
                          data-testid="gallery-submit-new-album-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-album-description">Description</Label>
                        <Textarea
                          id="new-album-description"
                          rows={3}
                          value={newAlbumDescription}
                          onChange={(e) => setNewAlbumDescription(e.target.value)}
                          placeholder="Optional. Shown with the album after photos are approved."
                          maxLength={500}
                          data-testid="gallery-submit-new-album-description"
                        />
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Photos in a new album are reviewed before they appear in the gallery. An
                        admin publishes them.
                      </p>
                    </div>
                  ) : null}
                  {!user ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <Link
                        to={loginNextFromLocation(location)}
                        className="link-editorial"
                        data-testid="gallery-submit-create-album-sign-in"
                      >
                        Sign in
                      </Link>{' '}
                      to create a new album, then add photos to it.
                    </p>
                  ) : null}
                </div>

                {!user && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gname">Your name *</Label>
                      <Input
                        id="gname"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        autoComplete="name"
                        data-testid="gallery-submit-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gemail">Email *</Label>
                      <Input
                        id="gemail"
                        type="email"
                        required
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        autoComplete="email"
                        data-testid="gallery-submit-email"
                      />
                    </div>
                  </div>
                )}
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-base font-semibold text-foreground">Photos</legend>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Large originals are accepted. Images are optimized in your browser before upload (up
                  to {Math.round(GALLERY_MAX_INPUT_BYTES / (1024 * 1024))} MB after optimization). Metadata
                  is not kept.
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
                  <ul className="mt-4 space-y-4" data-testid="gallery-submit-preview-list">
                    {queued.map((row) => (
                      <li
                        key={row.id}
                        data-testid="gallery-submit-preview-item"
                        className="flex gap-3 rounded-xl border border-border/60 bg-background p-3"
                      >
                        <img
                          src={row.previewUrl}
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-md bg-muted object-cover"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="truncate text-xs text-muted-foreground">{row.file.name}</p>
                          <Textarea
                            rows={2}
                            placeholder="Optional caption (not shown until approved)"
                            value={row.caption}
                            onChange={(e) =>
                              setQueued((q) =>
                                q.map((x) =>
                                  x.id === row.id ? { ...x, caption: e.target.value } : x
                                )
                              )
                            }
                            className="resize-none text-sm"
                          />
                          {row.status !== 'queued' && (
                            <p className="text-xs capitalize text-muted-foreground">
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
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-border/55 bg-muted/30 p-5">
                <legend className="-ml-1 px-1 text-base font-semibold text-foreground">Consent</legend>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(v) => setConsent(v === true)}
                    data-testid="gallery-submit-consent"
                  />
                  <Label htmlFor="consent" className="cursor-pointer text-sm font-normal leading-relaxed">
                    I confirm I have the right to share these photos with Kenyans in Greater Houston
                    (KIGH), and I understand they may be cropped or edited for the website. KIGH may
                    use approved images on this site and related community channels. I am not
                    uploading private or sensitive information about others without their permission.
                  </Label>
                </div>
              </fieldset>

              {submitting && (
                <div className="space-y-2">
                  <Progress value={progressPct} />
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading…
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || !canSubmit}
                  data-testid="gallery-submit-button"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

            <p className="mt-8 text-xs text-muted-foreground">
              Storage note: submissions go to the private{' '}
              <code className="text-[11px]">{GALLERY_SUBMISSIONS_BUCKET}</code> bucket. Approved
              images are copied to <code className="text-[11px]">{GALLERY_PUBLIC_BUCKET}</code> for
              the public gallery.
            </p>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Photo guidelines
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                What we publish
              </h2>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Community moments.</span> Events,
                    gatherings, celebrations, and family-friendly community life.
                  </span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Respect &amp; privacy.</span>{' '}
                    Don&apos;t submit photos of identifiable minors or private moments without
                    consent.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 text-xs text-muted-foreground leading-relaxed">
              <p>
                Want to request a photo be removed or corrected? Email the KIGH team via the{' '}
                <Link to="/contact" className="link-editorial">
                  Contact page
                </Link>{' '}
                with details.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
