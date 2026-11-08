/**
 * After a deploy, a tab opened on the previous build asks for route
 * chunks that no longer exist. One reload fetches the new build. The
 * reload is remembered in sessionStorage so a chunk that is genuinely
 * broken shows an error instead of reloading forever.
 */

const RELOAD_KEY = 'kigh:stale-chunk-reload-at'
const RELOAD_WINDOW_MS = 60_000

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
  /'text\/html' is not a valid JavaScript MIME type/i,
]

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : typeof error === 'string' ? error : ''
  return CHUNK_ERROR_PATTERNS.some((re) => re.test(message))
}

type ReloadStore = Pick<Storage, 'getItem' | 'setItem'>

/**
 * Records a reload attempt and says whether one is allowed: at most one
 * per minute per tab. With no usable storage it never allows one.
 */
export function claimStaleChunkReload(store: ReloadStore | null, now = Date.now()): boolean {
  if (!store) return false
  try {
    const raw = store.getItem(RELOAD_KEY)
    const last = raw === null ? NaN : Number(raw)
    if (Number.isFinite(last) && now - last < RELOAD_WINDOW_MS) return false
    store.setItem(RELOAD_KEY, String(now))
    return true
  } catch {
    return false
  }
}

function sessionStore(): ReloadStore | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/** Reloads once for a stale build. Returns false when it chose not to. */
export function reloadForStaleChunk(): boolean {
  if (!claimStaleChunkReload(sessionStore())) return false
  window.location.reload()
  return true
}

/** Vite fires this when a lazy route's preloaded chunk or CSS fails to load. */
export function installStaleChunkRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForStaleChunk()) event.preventDefault()
  })
}
