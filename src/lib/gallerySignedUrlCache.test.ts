import { describe, expect, it, vi } from 'vitest'
import { createGallerySignedUrlCache, type GallerySigner } from '@/lib/gallerySignedUrlCache'

const BASE = 'https://x.supabase.co/storage/v1/object/public/gallery-public/'
const url = (p: string) => BASE + p

function setup(allow: (path: string, call: number) => boolean = () => true) {
  let t = 1_000_000
  let calls = 0
  const signer = vi.fn<GallerySigner>(async (paths) => {
    calls++
    return paths.map((p) => ({ path: p, signedUrl: allow(p, calls) ? `signed:${p}:${calls}` : null }))
  })
  const cache = createGallerySignedUrlCache({
    signer,
    now: () => t,
    ttlMs: 60_000,
    refreshMarginMs: 10_000,
    retryMs: 30_000,
  })
  return { cache, signer, advance: (ms: number) => (t += ms) }
}

describe('gallery signed URL cache', () => {
  it('is pending until signed, then serves the signed URL', async () => {
    const { cache } = setup()
    expect(cache.resolve(url('a.jpg'), 'u1')).toEqual({ state: 'pending' })
    await cache.ensure(['a.jpg'], 'u1')
    expect(cache.resolve(url('a.jpg'), 'u1')).toEqual({ state: 'ready', url: 'signed:a.jpg:1' })
  })

  it('passes non-gallery URLs straight through and treats empty as none', () => {
    const { cache } = setup()
    expect(cache.resolve('/kigh-media/hero.jpg', null)).toEqual({ state: 'ready', url: '/kigh-media/hero.jpg' })
    expect(cache.resolve(null, null)).toEqual({ state: 'none' })
  })

  it('shows a refusal as denied — never the stored URL — and does not re-ask until the retry window', async () => {
    const { cache, signer, advance } = setup(() => false)
    await cache.ensure(['p.jpg'], null)
    expect(cache.resolve(url('p.jpg'), null)).toEqual({ state: 'denied' })
    await cache.ensure(['p.jpg'], null)
    await cache.ensure(['p.jpg'], null)
    expect(signer).toHaveBeenCalledTimes(1)
    advance(31_000)
    await cache.ensure(['p.jpg'], null)
    expect(signer).toHaveBeenCalledTimes(2)
  })

  it('treats a failed request as denied with the same back-off', async () => {
    const signer = vi.fn<GallerySigner>(async () => null)
    const cache = createGallerySignedUrlCache({ signer, now: () => 0, retryMs: 30_000 })
    await cache.ensure(['a.jpg', 'b.jpg'], 'u1')
    expect(cache.resolve(url('a.jpg'), 'u1')).toEqual({ state: 'denied' })
    await cache.ensure(['a.jpg', 'b.jpg'], 'u1')
    expect(signer).toHaveBeenCalledTimes(1)
  })

  it('re-signs before expiry and never serves an expired URL', async () => {
    const { cache, signer, advance } = setup()
    await cache.ensure(['a.jpg'], 'u1')
    expect(cache.nextRefreshAt(['a.jpg'])).toBe(1_000_000 + 50_000)
    advance(45_000)
    await cache.ensure(['a.jpg'], 'u1')
    expect(signer).toHaveBeenCalledTimes(1)
    advance(10_000) // inside the refresh margin
    await cache.ensure(['a.jpg'], 'u1')
    expect(signer).toHaveBeenCalledTimes(2)
    expect(cache.resolve(url('a.jpg'), 'u1')).toEqual({ state: 'ready', url: 'signed:a.jpg:2' })
    advance(61_000) // expired, not yet re-signed
    expect(cache.resolve(url('a.jpg'), 'u1')).toEqual({ state: 'pending' })
  })

  it('drops everything on sign-out and on account switch', async () => {
    const { cache, signer } = setup((_, call) => call === 1)
    await cache.ensure(['a.jpg'], 'member')
    expect(cache.resolve(url('a.jpg'), 'member').state).toBe('ready')
    // Signed out: the member's URL is not served to the anonymous viewer.
    expect(cache.resolve(url('a.jpg'), null)).toEqual({ state: 'pending' })
    await cache.ensure(['a.jpg'], null)
    expect(cache.resolve(url('a.jpg'), null)).toEqual({ state: 'denied' })
    // A different account starts fresh too.
    await cache.ensure(['a.jpg'], 'other')
    expect(signer).toHaveBeenCalledTimes(3)
    expect(cache.resolve(url('a.jpg'), 'member')).toEqual({ state: 'pending' })
  })

  it('ignores a signing response that lands after the viewer changed', async () => {
    const pending: Array<() => void> = []
    const signer = vi.fn<GallerySigner>(
      (paths) =>
        new Promise((r) => {
          const who = signer.mock.calls.length === 1 ? 'member' : 'anon'
          pending.push(() => r(paths.map((p) => ({ path: p, signedUrl: who === 'member' ? `member:${p}` : null }))))
        })
    )
    const cache = createGallerySignedUrlCache({ signer })
    const memberJob = cache.ensure(['a.jpg'], 'member')
    const anonJob = cache.ensure(['a.jpg'], null) // signs out before the member's answer arrives
    pending[1]() // anon answer first
    pending[0]() // then the stale member answer
    await Promise.all([memberJob, anonJob])
    expect(cache.resolve(url('a.jpg'), null)).toEqual({ state: 'denied' })
  })

  it('shares one request between callers asking at the same time', async () => {
    const { cache, signer } = setup()
    await Promise.all([cache.ensure(['a.jpg', 'b.jpg'], 'u1'), cache.ensure(['b.jpg', 'a.jpg'], 'u1')])
    expect(signer).toHaveBeenCalledTimes(1)
  })
})
