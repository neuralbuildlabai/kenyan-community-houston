import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import middleware from '../../middleware'
import {
  ARCHIVED_MEMORIAL_HEADING,
  ARCHIVED_MEMORIAL_NOTICE,
} from './memorialLifecycle'
import { MEMORIAL_PREVIEW_COOKIE } from './memorialPreview'

/**
 * The edge gate is the only thing standing between an archived memorial and
 * the public, and it also guards a 12 MB funeral program that the app itself
 * cannot gate. So these tests drive the real middleware rather than asserting
 * on its source.
 */
const ORIGIN = 'https://www.kenyansingreaterhouston.org'
const SLUG = 'collins-collo-namaswa'
const PAGE = `${ORIGIN}/memorials/${SLUG}`
const PROGRAM = `${ORIGIN}/memorials/${SLUG}/${SLUG}-funeral-program.pdf`

const STATES = '/rest/v1/memorial_states'
const ADMIN_RPC = '/rest/v1/rpc/kigh_is_elevated_admin'

type Reply = { ok?: boolean; body?: unknown; throws?: boolean }

function stubFetch({ states, admin }: { states?: Reply; admin?: Reply }) {
  const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = String(typeof input === 'object' && 'url' in input ? input.url : input)
    const reply = url.includes(ADMIN_RPC) ? admin : url.includes(STATES) ? states : undefined
    if (!reply) throw new Error(`unexpected fetch: ${url}`)
    if (reply.throws) throw new Error('network down')
    return new Response(JSON.stringify(reply.body ?? null), {
      status: reply.ok === false ? 500 : 200,
      headers: { 'content-type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const archived = { body: [{ status: 'archived' }] }
const published = { body: [] as unknown[] }

function get(url: string, headers: Record<string, string> = {}) {
  return middleware(new Request(url, { headers }))
}

function previewCookie(token = 'admin-token') {
  return { cookie: `${MEMORIAL_PREVIEW_COOKIE}=${token}` }
}

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://project.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key'
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.VITE_SUPABASE_URL
  delete process.env.VITE_SUPABASE_ANON_KEY
})

describe('published memorials pass straight through', () => {
  it('serves the page when no state is stored', async () => {
    stubFetch({ states: published })
    expect(await get(PAGE)).toBeUndefined()
  })

  it('serves the page when the state says active', async () => {
    stubFetch({ states: { body: [{ status: 'active' }] } })
    expect(await get(PAGE)).toBeUndefined()
  })

  it('serves the funeral program', async () => {
    stubFetch({ states: published })
    expect(await get(PROGRAM)).toBeUndefined()
  })

  it('looks the slug up by itself, with the anon key', async () => {
    const fetchMock = stubFetch({ states: published })
    await get(PAGE)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain(`${STATES}?slug=eq.${SLUG}`)
    expect(String(url)).toContain('select=status')
    expect(init?.headers).toMatchObject({ apikey: 'anon-key' })
  })
})

describe('archived memorials go offline', () => {
  it('answers the page with 410 Gone and the archive notice', async () => {
    stubFetch({ states: archived })
    const response = await get(PAGE)

    expect(response?.status).toBe(410)
    expect(response?.headers.get('content-type')).toContain('text/html')
    const html = await response!.text()
    expect(html).toContain(ARCHIVED_MEMORIAL_HEADING)
    expect(html).toContain(ARCHIVED_MEMORIAL_NOTICE)
    // A scan has to lead somewhere, not into a dead end.
    expect(html).toContain(`${ORIGIN}/memorials`)
  })

  it('also withholds the funeral program, which lives in /public', async () => {
    stubFetch({ states: archived })
    expect((await get(PROGRAM))?.status).toBe(410)
  })

  it('is never cached and never indexed', async () => {
    stubFetch({ states: archived })
    const response = await get(PAGE)

    expect(response?.headers.get('cache-control')).toBe('no-store')
    expect(response?.headers.get('vary')).toBe('cookie')
    expect(response?.headers.get('x-robots-tag')).toContain('noindex')
  })

  it('hides it from crawlers and link previews too', async () => {
    stubFetch({ states: archived })
    const response = await get(PAGE, { 'user-agent': 'WhatsApp/2.23' })
    expect(response?.status).toBe(410)
  })
})

describe('a broken lookup never takes a memorial offline', () => {
  it('serves the page when the lookup throws', async () => {
    stubFetch({ states: { throws: true } })
    expect(await get(PAGE)).toBeUndefined()
  })

  it('serves the page when the lookup errors', async () => {
    stubFetch({ states: { ok: false } })
    expect(await get(PAGE)).toBeUndefined()
  })

  it('serves the page when Supabase is not configured', async () => {
    delete process.env.VITE_SUPABASE_URL
    const fetchMock = stubFetch({ states: archived })
    expect(await get(PAGE)).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('admin preview', () => {
  it('lets a verified elevated admin through', async () => {
    stubFetch({ states: archived, admin: { body: true } })
    expect(await get(PAGE, previewCookie())).toBeUndefined()
  })

  it('verifies the cookie against the database as that user', async () => {
    const fetchMock = stubFetch({ states: archived, admin: { body: true } })
    await get(PAGE, previewCookie('token-123'))

    const call = fetchMock.mock.calls.find(([url]) => String(url).includes(ADMIN_RPC))
    expect(call).toBeDefined()
    expect(call?.[1]?.headers).toMatchObject({ Authorization: 'Bearer token-123' })
  })

  it('blocks a cookie the database does not consider an admin', async () => {
    stubFetch({ states: archived, admin: { body: false } })
    expect((await get(PAGE, previewCookie('member-token')))?.status).toBe(410)
  })

  it('fails closed when the admin check itself fails', async () => {
    stubFetch({ states: archived, admin: { throws: true } })
    expect((await get(PAGE, previewCookie()))?.status).toBe(410)
  })

  it('ignores unrelated cookies', async () => {
    stubFetch({ states: archived })
    const response = await get(PAGE, { cookie: 'theme=dark; other=1' })
    expect(response?.status).toBe(410)
  })
})

describe('scope', () => {
  it('leaves the memorials index to the app', async () => {
    const fetchMock = stubFetch({ states: archived })
    expect(await get(`${ORIGIN}/memorials`)).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses to look up a malformed slug', async () => {
    const fetchMock = stubFetch({ states: archived })
    expect(await get(`${ORIGIN}/memorials/..%2Fadmin`)).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still renders link previews for other sections', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify([{ title: 'Harambee', summary: 'Join us' }]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
      )
    )
    const response = await middleware(
      new Request(`${ORIGIN}/events/harambee`, { headers: { 'user-agent': 'Twitterbot/1.0' } })
    )
    expect(response?.status).toBe(200)
    expect(await response!.text()).toContain('Harambee')
  })
})

describe('middleware stays in sync with the app', () => {
  const source = readFileSync(resolve(process.cwd(), 'middleware.ts'), 'utf8')

  it('matches the memorial page and everything beneath it', () => {
    expect(source).toContain("'/memorials/:slug'")
    expect(source).toContain("'/memorials/:slug/:asset*'")
  })

  it('duplicates the shared copy and cookie name verbatim', () => {
    for (const value of [
      ARCHIVED_MEMORIAL_HEADING,
      ARCHIVED_MEMORIAL_NOTICE,
      MEMORIAL_PREVIEW_COOKIE,
    ]) {
      expect(source).toContain(value)
    }
  })

  it('imports nothing, because the edge bundle has no path aliases', () => {
    expect(source).not.toMatch(/^\s*import\s/m)
  })
})
