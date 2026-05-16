import { useEffect, useState } from 'react'
import { Image, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SEOHead } from '@/components/SEOHead'
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
      // Reads from the public-safe view (migration 036). The view exposes
      // only non-PII columns and is already filtered to status='published'.
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
        .from('gallery_albums')
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

  return (
    <>
      <SEOHead title="Gallery" description="Photos and memories from the Kenyan community in Houston." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gallery</h1>
            <p className="text-muted-foreground">Photos and memories from the community</p>
          </div>
          <Button asChild variant="outline" className="w-fit shrink-0">
            <Link to="/gallery/submit" data-testid="gallery-cta-submit">
              Submit photos
            </Link>
          </Button>
        </div>

        {albums.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Button variant={selectedAlbum === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedAlbum(null)}>
              All Photos
            </Button>
            {albums.map((a) => (
              <Button
                key={a.id}
                variant={selectedAlbum === a.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedAlbum(a.id)}
                data-testid={a.slug === 'community-park-event-2025' ? 'gallery-album-community-park-2025' : undefined}
              >
                {a.name}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {images.filter((i) => i.album_id === a.id).length}
                </Badge>
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Image} title="No photos yet" description="Check back for community photos and event galleries." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2" data-testid="gallery-public-grid">
            {filtered.map((img) => {
              const thumb = img.thumbnail_url ?? img.image_url ?? ''
              return (
                <button
                  key={img.id}
                  type="button"
                  className="group relative overflow-hidden rounded-lg aspect-square bg-muted cursor-pointer"
                  onClick={() => setLightbox(img)}
                >
                  <img
                    src={thumb}
                    alt={displayAlt(img)}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {img.caption?.trim() && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate">{img.caption}</p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {lightbox && (lightbox.image_url ?? lightbox.thumbnail_url) && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
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
          {lightbox.caption?.trim() && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm max-w-prose text-center px-4">
              {lightbox.caption}
            </p>
          )}
        </div>
      )}
    </>
  )
}
