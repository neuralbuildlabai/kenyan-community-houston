import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { GALLERY_PUBLIC_BUCKET, galleryObjectPath } from '@/lib/galleryConstants'
import { createGallerySignedUrlCache, type GalleryImageState } from '@/lib/gallerySignedUrlCache'

/**
 * Gallery files are private (migrations 092/093). Rows still store the
 * upload-time public URL, so everything that displays a gallery image
 * asks for a signed URL here. Storage policy decides what this viewer
 * may sign; a refusal renders as a placeholder, never as the stored URL.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60

const cache = createGallerySignedUrlCache({
  ttlMs: SIGNED_URL_TTL_SECONDS * 1000,
  signer: async (paths) => {
    const { data, error } = await supabase.storage
      .from(GALLERY_PUBLIC_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    if (error || !data) {
      console.warn('[gallery] could not sign image URLs:', error?.message)
      return null
    }
    return data.map((row) => ({ path: row.path, signedUrl: row.signedUrl }))
  },
})

export type { GalleryImageState }

/**
 * Signs every gallery URL in `urls` (batched, cached for this viewer,
 * refreshed before expiry) and returns a resolver for rendering. Keep
 * raw URLs in component state; only the rendered image uses the result.
 */
export function useGalleryImageUrls(
  urls: ReadonlyArray<string | null | undefined>
): (url: string | null | undefined) => GalleryImageState {
  const { user, loading } = useAuth()
  const viewer = user?.id ?? null
  const key = [...new Set(urls.map(galleryObjectPath).filter((p): p is string => !!p))]
    .sort()
    .join('\n')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (loading || !key) return
    const paths = key.split('\n')
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = () => {
      void cache.ensure(paths, viewer).then(() => {
        if (cancelled) return
        setVersion((v) => v + 1)
        const due = cache.nextRefreshAt(paths)
        if (due !== null) timer = setTimeout(run, Math.max(due - Date.now(), 1000))
      })
    }
    run()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [key, viewer, loading])

  return useCallback(
    (url: string | null | undefined) =>
      loading ? { state: 'pending' as const } : cache.resolve(url, viewer),
    // `version` re-creates the resolver when signatures land or refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, viewer, loading]
  )
}
