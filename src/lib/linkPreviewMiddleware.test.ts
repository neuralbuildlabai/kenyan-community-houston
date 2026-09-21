import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import middleware from '../../middleware'

const CRAWLER = 'WhatsApp/2.23.20.0 A'
const HUMAN =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'

function request(path: string, userAgent: string) {
  return new Request(`https://www.kenyansingreaterhouston.org${path}`, {
    headers: { 'user-agent': userAgent },
  })
}

/** Stands in for the Supabase REST call the middleware makes. */
function mockRows(rows: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => rows,
  } as unknown as Response)
}

describe('link preview middleware', () => {
  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.VITE_SUPABASE_URL
    delete process.env.VITE_SUPABASE_ANON_KEY
  })

  it('leaves real visitors alone so the app loads normally', async () => {
    const fetchSpy = mockRows([{ name: 'Errands Home' }])
    vi.stubGlobal('fetch', fetchSpy)

    const res = await middleware(request('/businesses/errands-home', HUMAN))

    expect(res).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('answers a crawler with that listing’s own title, description and image', async () => {
    vi.stubGlobal(
      'fetch',
      mockRows([
        {
          name: 'Errands Home',
          description: 'Houston-based errand and home-support services.',
          logo_url: 'https://cdn.example.com/errands.png',
        },
      ]),
    )

    const res = await middleware(request('/businesses/errands-home', CRAWLER))
    expect(res).toBeDefined()
    const html = await res!.text()

    expect(res!.headers.get('content-type')).toContain('text/html')
    expect(html).toContain(
      '<meta property="og:title" content="Errands Home — Kenyans in Greater Houston" />',
    )
    expect(html).toContain(
      '<meta property="og:description" content="Houston-based errand and home-support services." />',
    )
    expect(html).toContain(
      '<meta property="og:image" content="https://cdn.example.com/errands.png" />',
    )
    expect(html).toContain(
      '<meta property="og:url" content="https://www.kenyansingreaterhouston.org/businesses/errands-home" />',
    )
  })

  it('falls back to the site image when a listing has none', async () => {
    vi.stubGlobal('fetch', mockRows([{ title: 'AfriFEST', summary: 'A cultural festival.' }]))

    const res = await middleware(request('/events/afrifest', CRAWLER))
    const html = await res!.text()

    expect(html).toContain(
      '<meta property="og:image" content="https://www.kenyansingreaterhouston.org/og-image.png" />',
    )
  })

  it('makes a relative image absolute so scrapers can fetch it', async () => {
    vi.stubGlobal(
      'fetch',
      mockRows([{ title: 'Back to School', summary: 'Supplies drive.', image_url: '/images/bts.jpg' }]),
    )

    const res = await middleware(request('/announcements/back-to-school', CRAWLER))
    const html = await res!.text()

    expect(html).toContain(
      '<meta property="og:image" content="https://www.kenyansingreaterhouston.org/images/bts.jpg" />',
    )
  })

  it('escapes quotes and angle brackets so a listing cannot break out of an attribute', async () => {
    vi.stubGlobal(
      'fetch',
      mockRows([
        {
          name: 'Bob "The Builder" & Co <script>alert(1)</script>',
          description: 'Quotes " and <tags> included.',
        },
      ]),
    )

    const res = await middleware(request('/businesses/bob', CRAWLER))
    const html = await res!.text()

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&quot;')
    expect(html).toContain('&amp;')
    expect(html).toContain('&lt;script&gt;')
  })

  it('falls through when no published record matches', async () => {
    vi.stubGlobal('fetch', mockRows([]))

    const res = await middleware(request('/businesses/does-not-exist', CRAWLER))

    expect(res).toBeUndefined()
  })

  it('falls through when the lookup fails, so a crawler never sees an error page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const res = await middleware(request('/businesses/errands-home', CRAWLER))

    expect(res).toBeUndefined()
  })

  it('ignores paths that are not listing pages', async () => {
    const fetchSpy = mockRows([{ name: 'x' }])
    vi.stubGlobal('fetch', fetchSpy)

    expect(await middleware(request('/about', CRAWLER))).toBeUndefined()
    expect(await middleware(request('/businesses', CRAWLER))).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does nothing when Supabase credentials are absent', async () => {
    delete process.env.VITE_SUPABASE_URL
    const fetchSpy = mockRows([{ name: 'x' }])
    vi.stubGlobal('fetch', fetchSpy)

    expect(await middleware(request('/businesses/errands-home', CRAWLER))).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('truncates a long description rather than shipping the whole body', async () => {
    vi.stubGlobal(
      'fetch',
      mockRows([{ title: 'Long one', summary: 'word '.repeat(200) }]),
    )

    const res = await middleware(request('/community-support/long-one', CRAWLER))
    const html = await res!.text()
    const match = html.match(/<meta name="description" content="([^"]*)"/)

    expect(match).toBeTruthy()
    expect(match![1].length).toBeLessThanOrEqual(201)
    expect(match![1].endsWith('…')).toBe(true)
  })
})
