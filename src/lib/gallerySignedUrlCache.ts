import { galleryObjectPath } from '@/lib/galleryConstants'

/**
 * Signed-URL cache for private gallery files (migrations 092/093), kept
 * free of Supabase and React so it can be tested with a fake signer and
 * clock. Entries belong to one viewer; a different viewer (sign-in,
 * sign-out, account switch) starts from an empty cache.
 *
 * A signed URL that was already handed out stays valid until it expires,
 * even after the viewer signs out. Keep the lifetime short.
 */

export type SignedPath = { path: string | null; signedUrl: string | null }
/** Resolves to one row per path, or null when the request itself failed. */
export type GallerySigner = (paths: string[]) => Promise<SignedPath[] | null>

export type GalleryImageState =
  | { state: 'none' }
  | { state: 'pending' }
  | { state: 'ready'; url: string }
  | { state: 'denied' }

type Entry = { url: string | null; expiresAt: number }

export type GallerySignedUrlCacheOptions = {
  signer: GallerySigner
  now?: () => number
  ttlMs?: number
  /** Re-sign this long before expiry. */
  refreshMarginMs?: number
  /** A refused or failed path is retried after this long, not on every render. */
  retryMs?: number
  batchSize?: number
}

export function createGallerySignedUrlCache({
  signer,
  now = Date.now,
  ttlMs = 60 * 60 * 1000,
  refreshMarginMs = 10 * 60 * 1000,
  retryMs = 5 * 60 * 1000,
  batchSize = 100,
}: GallerySignedUrlCacheOptions) {
  const entries = new Map<string, Entry>()
  const inFlight = new Map<string, Promise<void>>()
  let viewer: string | null = null
  let generation = 0

  function switchViewer(next: string | null) {
    if (next === viewer) return
    viewer = next
    generation++
    entries.clear()
    inFlight.clear()
  }

  function isFresh(e: Entry | undefined, t: number): boolean {
    if (!e) return false
    return e.url ? e.expiresAt - refreshMarginMs > t : e.expiresAt > t
  }

  async function signBatch(batch: string[], gen: number) {
    const rows = await signer(batch).catch(() => null)
    if (gen !== generation) return
    const t = now()
    const answered = new Set<string>()
    for (const row of rows ?? []) {
      if (!row.path) continue
      answered.add(row.path)
      entries.set(
        row.path,
        row.signedUrl ? { url: row.signedUrl, expiresAt: t + ttlMs } : { url: null, expiresAt: t + retryMs }
      )
    }
    for (const p of batch) {
      if (!answered.has(p)) entries.set(p, { url: null, expiresAt: t + retryMs })
    }
  }

  /** Signs every path that is missing, stale or due for refresh. */
  async function ensure(paths: string[], forViewer: string | null): Promise<void> {
    switchViewer(forViewer)
    const t = now()
    const waits: Promise<void>[] = []
    const todo: string[] = []
    for (const p of new Set(paths)) {
      const running = inFlight.get(p)
      if (running) waits.push(running)
      else if (!isFresh(entries.get(p), t)) todo.push(p)
    }
    const gen = generation
    for (let i = 0; i < todo.length; i += batchSize) {
      const batch = todo.slice(i, i + batchSize)
      const job = signBatch(batch, gen).finally(() => {
        for (const p of batch) if (inFlight.get(p) === job) inFlight.delete(p)
      })
      for (const p of batch) inFlight.set(p, job)
      waits.push(job)
    }
    await Promise.all(waits)
  }

  /** What to render for a stored image URL. Non-gallery URLs pass through. */
  function resolve(storedUrl: string | null | undefined, forViewer: string | null): GalleryImageState {
    if (!storedUrl) return { state: 'none' }
    const path = galleryObjectPath(storedUrl)
    if (!path) return { state: 'ready', url: storedUrl }
    if (forViewer !== viewer) return { state: 'pending' }
    const e = entries.get(path)
    if (!e) return { state: 'pending' }
    if (!e.url) return { state: 'denied' }
    // Never render a URL that has already expired; ensure() re-signs it.
    return e.expiresAt > now() ? { state: 'ready', url: e.url } : { state: 'pending' }
  }

  /** Earliest time any of these paths needs signing again, or null. */
  function nextRefreshAt(paths: string[]): number | null {
    let next: number | null = null
    for (const p of paths) {
      const e = entries.get(p)
      if (!e) continue
      const due = e.url ? e.expiresAt - refreshMarginMs : e.expiresAt
      if (next === null || due < next) next = due
    }
    return next
  }

  return { ensure, resolve, nextRefreshAt }
}
