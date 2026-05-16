import { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PublicSection } from '@/components/public/PublicSection'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { GalleryAlbum, GalleryImage } from '@/lib/types'

type GalleryImageRow = GalleryImage & {
  thumbnail_url?: string | null
  alt_text?: string | null
}

function displayAlt(img: GalleryImageRow): string {
  const a = img.alt_text?.trim()
  if (a) return a
  const c = img.caption?.trim()
  if (c) return c
  return 'Community gallery photo'
}

export function GalleryPage() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([])
  const [images, setImages] = useState<GalleryImageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<GalleryImageRow | null>(null)

  useEffect(() => {
    async function load() {
      const { data: imgRows, error: imgErr } = await supabase
        .from('gallery_images_public')
        .select('id, album_id, image_url, thumbnail_url, caption, alt_text, created_at, status')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (imgErr) {
        console.warn('[gallery] could not load images:', imgErr.message)
      }

      const imgs = (imgRows ?? []) as GalleryImageRow[]
      const withUrl = imgs.filter((i) => (i.thumbnail_url ?? i.image_url)?.trim())

      const { data: albRows, error: albErr } = await supabase
        .from('gallery_albums_public')
        .select('id, name, slug, description, cover_url, created_at')
        .order('created_at', { ascending: false })

      if (albErr) {
        console.warn('[gallery] could not load albums:', albErr.message)
      }

      const albumIds = new Set(withUrl.map((i) => i.album_id).filter((id): id is string => !!id))
      const albs = ((albRows ?? []) as GalleryAlbum[]).filter((a) => albumIds.has(a.id))

      setImages(withUrl)
      setAlbums(albs)
      setLoading(false)
    }
    void load()
  }, [])

  const filtered = selectedAlbum ? images.filter((i) => i.album_id === selectedAlbum) : images

  // Featured album: most recent album with photos when no filter is active.
  const featuredAlbum = useMemo<GalleryAlbum | null>(() => {
    if (selectedAlbum) return null
    return albums[0] ?? null
  }, [albums, selectedAlbum])

  const featuredAlbumImages = useMemo(() => {
    if (!featuredAlbum) return [] as GalleryImageRow[]
    return images.filter((i) => i.album_id === featuredAlbum.id).slice(0, 5)
  }, [featuredAlbum, images])

  return (
    <>
      <SEOHead title="Gallery" description="Photos and memories from the Kenyan community in Houston." />

      <PublicPageHero
        eyebrow="Community gallery"
        title="Gallery"
        subtitle="Photos and memories from KIGH gatherings, cultural celebrations, family days, and the quiet moments in between. Submissions are reviewed before publication so the gallery stays community-safe."
        primaryAction={
          <Button asChild size="sm">
            <Link to="/gallery/submit" data-testid="gallery-cta-submit">
              Submit photos
            </Link>
          </Button>
        }
        tone="cream"
      />

      <PublicSection className="!py-10 sm:!py-12 lg:!py-14">
        {loading ? (
          <PageLoader />
        ) : images.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No photos yet"
            description="Check back for community photos and event galleries — or share your own."
            action={
              <Button asChild>
                <Link to="/gallery/submit">Submit photos</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-12">
            {/* Featured album hero */}
            {featuredAlbum && featuredAlbumImages.length > 0 ? (
              <section aria-labelledby="gallery-featured-heading">
                <header className="mb-5 max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Featured album
                  </p>
                  <h2
                    id="gallery-featured-heading"
                    className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    {featuredAlbum.name}
                  </h2>
                  {featuredAlbum.description ? (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {featuredAlbum.description}
                    </p>
                  ) : null}
                </header>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:grid-rows-2">
                  {featuredAlbumImages.map((img, idx) => {
                    const thumb = img.thumbnail_url ?? img.image_url ?? ''
                    const span =
                      idx === 0
                        ? 'col-span-2 row-span-2 aspect-square sm:aspect-auto'
                        : 'aspect-square'
                    return (
                      <button
                        key={img.id}
                        type="button"
                        className={`group relative overflow-hidden rounded-xl bg-muted ${span}`}
                        onClick={() => setLightbox(img)}
                      >
                        <img
                          src={thumb}
                          alt={displayAlt(img)}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {/* Album filter chips */}
            {albums.length > 0 ? (
              <section aria-label="Browse by album">
                <header className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                    Browse
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    All albums
                  </h2>
                </header>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedAlbum === null ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full h-8 px-3.5"
                    onClick={() => setSelectedAlbum(null)}
                  >
                    All photos
                    <Badge variant="secondary" className="ml-2 text-[11px]">{images.length}</Badge>
                  </Button>
                  {albums.map((a) => (
                    <Button
                      key={a.id}
                      variant={selectedAlbum === a.id ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-full h-8 px-3.5"
                      onClick={() => setSelectedAlbum(a.id)}
                      data-testid={
                        a.slug === 'community-park-event-2025'
                          ? 'gallery-album-community-park-2025'
                          : undefined
                      }
                    >
                      {a.name}
                      <Badge variant="secondary" className="ml-2 text-[11px]">
                        {images.filter((i) => i.album_id === a.id).length}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Photo grid */}
            <section aria-labelledby="gallery-grid-heading">
              <header className="mb-5">
                <h2 id="gallery-grid-heading" className="sr-only">
                  Photos
                </h2>
              </header>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photos in this album yet.</p>
              ) : (
                <div
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
                  data-testid="gallery-public-grid"
                >
                  {filtered.map((img) => {
                    const thumb = img.thumbnail_url ?? img.image_url ?? ''
                    return (
                      <button
                        key={img.id}
                        type="button"
                        className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-muted"
                        onClick={() => setLightbox(img)}
                      >
                        <img
                          src={thumb}
                          alt={displayAlt(img)}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                        {img.caption?.trim() ? (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                            <p className="truncate text-xs text-white">{img.caption}</p>
                          </div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Submit CTA strip */}
            <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-kenyan-gold-500/[0.05] p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Share a moment
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    Add your photos to the community archive
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Submissions are reviewed by the KIGH media team before they appear here.
                  </p>
                </div>
                <Button asChild size="lg" className="shrink-0">
                  <Link to="/gallery/submit">Submit photos</Link>
                </Button>
              </div>
            </section>
          </div>
        )}
      </PublicSection>

      {lightbox && (lightbox.image_url ?? lightbox.thumbnail_url) ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <button
            type="button"
            className="absolute right-4 top-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X className="h-7 w-7" />
          </button>
          <img
            src={lightbox.image_url ?? lightbox.thumbnail_url ?? ''}
            alt={displayAlt(lightbox)}
            className="max-h-[90vh] max-w-full rounded-lg"
            loading="eager"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox.caption?.trim() ? (
            <p className="absolute bottom-6 left-1/2 max-w-prose -translate-x-1/2 px-4 text-center text-sm text-white/80">
              {lightbox.caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
