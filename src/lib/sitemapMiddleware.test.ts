import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import middleware from '../../middleware'

const ORIGIN = 'https://www.kenyansingreaterhouston.org'
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const BINGBOT = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'
const INSPECTION =
  'Mozilla/5.0 (compatible; Google-InspectionTool/1.0; +http://www.google.com/bot.html)'
const WHATSAPP = 'WhatsApp/2.23.20.0'

function get(path: string, userAgent = GOOGLEBOT) {
  return middleware(new Request(`${ORIGIN}${path}`, { headers: { 'user-agent': userAgent } }))
}

/** Answers each Supabase table query with the rows given for that table. */
function mockTables(tables: Record<string, unknown[]>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const table = url.split('/rest/v1/')[1]?.split('?')[0] ?? ''
    return { ok: true, json: async () => tables[table] ?? [] } as unknown as Response
  })
}

describe('/sitemap.xml', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('lists static public pages and every published listing, with real lastmod only', async () => {
    const fetchSpy = mockTables({
      events: [{ slug: 'afrifest-2026', updated_at: '2026-10-01T12:00:00Z' }],
      businesses: [{ slug: 'errands-home', updated_at: null }],
      fundraisers: [{ slug: 'help-the-otieno-family', updated_at: '2026-09-02T08:00:00Z' }],
    })
    vi.stubGlobal('fetch', fetchSpy)

    const res = await get('/sitemap.xml')
    expect(res).toBeDefined()
    expect(res!.status).toBe(200)
    expect(res!.headers.get('content-type')).toContain('application/xml')
    const xml = await res!.text()

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain(`<url><loc>${ORIGIN}/</loc></url>`)
    expect(xml).toContain(`<url><loc>${ORIGIN}/events</loc></url>`)
    expect(xml).toContain(
      `<url><loc>${ORIGIN}/events/afrifest-2026</loc><lastmod>2026-10-01T12:00:00.000Z</lastmod></url>`,
    )
    expect(xml).toContain(`<url><loc>${ORIGIN}/businesses/errands-home</loc></url>`)
    expect(xml).toContain(`${ORIGIN}/community-support/help-the-otieno-family`)
  })

  it('only asks for published rows, and skips expired announcements', async () => {
    const fetchSpy = mockTables({})
    vi.stubGlobal('fetch', fetchSpy)
    await get('/sitemap.xml')
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]))
    expect(urls).toHaveLength(5)
    for (const u of urls) expect(u).toContain('status=eq.published')
    const ann = urls.find((u) => u.includes('/rest/v1/announcements?'))
    expect(ann).toContain('or=(expires_at.is.null,expires_at.gt.')
  })

  it('never lists private or form routes', async () => {
    vi.stubGlobal('fetch', mockTables({}))
    const xml = await (await get('/sitemap.xml'))!.text()
    for (const p of ['/admin', '/login', '/profile', '/chat', '/submit', '/membership/success', '/dev/', '/memorials']) {
      expect(xml).not.toContain(`${ORIGIN}${p}`)
    }
  })

  it('drops rows whose slug is not a clean slug', async () => {
    vi.stubGlobal('fetch', mockTables({ events: [{ slug: 'bad slug<script>' }, { slug: 'ok-one' }] }))
    const xml = await (await get('/sitemap.xml'))!.text()
    expect(xml).toContain(`${ORIGIN}/events/ok-one`)
    expect(xml).not.toContain('script')
  })

  it('still serves the static pages when Supabase fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    const res = await get('/sitemap.xml')
    expect(res!.status).toBe(200)
    expect(await res!.text()).toContain(`${ORIGIN}/about`)
  })

  it('still serves the static pages when Supabase is not configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    const res = await get('/sitemap.xml')
    expect(await res!.text()).toContain(`${ORIGIN}/events`)
  })

  it('is refused to AI training crawlers like every other path', async () => {
    const res = await get('/sitemap.xml', 'CCBot/2.0 (https://commoncrawl.org/faq/)')
    expect(res!.status).toBe(403)
  })
})

describe('search engines get the real app, not the link-preview stub', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it.each([
    ['Googlebot', GOOGLEBOT],
    ['bingbot', BINGBOT],
    ['Google-InspectionTool', INSPECTION],
  ])('%s falls through to the app on a listing page', async (_n, ua) => {
    const fetchSpy = mockTables({ businesses: [{ name: 'Errands Home' }] })
    vi.stubGlobal('fetch', fetchSpy)
    expect(await get('/businesses/errands-home', ua)).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('WhatsApp still gets the per-listing preview', async () => {
    vi.stubGlobal('fetch', mockTables({ businesses: [{ name: 'Errands Home' }] }))
    const res = await get('/businesses/errands-home', WHATSAPP)
    expect(await res!.text()).toContain('Errands Home — Kenyans in Greater Houston')
  })
})
