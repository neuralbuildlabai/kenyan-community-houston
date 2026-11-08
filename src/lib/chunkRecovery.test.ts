import { describe, expect, it } from 'vitest'
import { claimStaleChunkReload, isChunkLoadError } from '@/lib/chunkRecovery'

function memoryStore() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('isChunkLoadError', () => {
  it('recognises stale-build chunk failures from each browser', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true)
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/a.css'))).toBe(true)
  })

  it('leaves ordinary render errors alone', () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'title')"))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })
})

describe('claimStaleChunkReload', () => {
  it('allows one reload, then refuses within the window so it cannot loop', () => {
    const store = memoryStore()
    expect(claimStaleChunkReload(store, 1_000_000)).toBe(true)
    expect(claimStaleChunkReload(store, 1_000_000 + 5_000)).toBe(false)
    expect(claimStaleChunkReload(store, 1_000_000 + 59_000)).toBe(false)
  })

  it('allows another reload after the window (a later deploy)', () => {
    const store = memoryStore()
    expect(claimStaleChunkReload(store, 0)).toBe(true)
    expect(claimStaleChunkReload(store, 61_000)).toBe(true)
  })

  it('never reloads without usable storage', () => {
    expect(claimStaleChunkReload(null)).toBe(false)
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {},
    }
    expect(claimStaleChunkReload(broken)).toBe(false)
  })
})
