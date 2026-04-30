import { useEffect, useState } from 'react'
import { Image, X } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { GalleryAlbum, GalleryImage } from '@/lib/types'

export function GalleryPage() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: alb }, { data: img }] = await Promise.all([
        supabase.from('gallery_albums').select('*').eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('gallery_images').select('*').eq('is_published', true).order('sort_order', { ascending: true }),
      ])
      setAlbums((alb as GalleryAlbum[]) ?? [])
      setImages((img as GalleryImage[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = selectedAlbum
    ? images.filter((i) => i.album_id === selectedAlbum)
    : images

  return (
    <>
      <SEOHead title="Gallery" description="Photos and memories from the Kenyan community in Houston." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gallery</h1>
          <p className="text-muted-foreground">Photos and memories from the community</p>
        </div>

        {/* Album filter */}
        {albums.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Button
              variant={selectedAlbum === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAlbum(null)}
            >
              All Photos
            </Button>
            {albums.map((a) => (
              <Button
                key={a.id}
                variant={selectedAlbum === a.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedAlbum(a.id)}
              >
                {a.title}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map((img) => (
              <button
                key={img.id}
                className="group relative overflow-hidden rounded-lg aspect-square bg-muted cursor-pointer"
                onClick={() => setLightbox(img)}
              >
                <img
                  src={img.url}
                  alt={img.caption ?? 'Gallery image'}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {img.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{img.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-7 w-7" />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.caption ?? 'Gallery image'}
            className="max-h-[90vh] max-w-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox.caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm">{lightbox.caption}</p>
          )}
        </div>
      )}
    </>
  )
}
