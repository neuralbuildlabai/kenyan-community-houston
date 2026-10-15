import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import middleware, { config } from '../../middleware'

/**
 * The bot filter sits in front of every page, so a bad pattern here would
 * take down Google indexing or WhatsApp previews. Drive the real middleware.
 */
const ORIGIN = 'https://www.kenyansingreaterhouston.org'

const BROWSER =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

const ALLOWED = {
  browser: BROWSER,
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  googleSmartphone:
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  whatsapp: 'WhatsApp/2.23.20.0',
  facebookPreview: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  applebot: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
  chatgptUser: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  curl: 'curl/8.7.1',
}

const BLOCKED = {
  gptbot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  claudebot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  ccbot: 'CCBot/2.0 (https://commoncrawl.org/faq/)',
  bytespider: 'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
  metaAi: 'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
  perplexity: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  ahrefs: 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
  pythonRequests: 'python-requests/2.32.3',
  goClient: 'Go-http-client/2.0',
  scrapy: 'Scrapy/2.11.2 (+https://scrapy.org)',
  empty: '',
}

function get(path: string, userAgent: string) {
  return middleware(new Request(`${ORIGIN}${path}`, { headers: { 'user-agent': userAgent } }))
}

beforeEach(() => {
  // Unconfigured Supabase: previews and the memorial gate fall straight
  // through, so any Response here came from the bot filter.
  vi.stubEnv('VITE_SUPABASE_URL', '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('bot filter', () => {
  it.each(Object.entries(ALLOWED))('lets %s through', async (_name, ua) => {
    for (const path of ['/', '/community-support/some-fundraiser', '/kigh-documents/bylaws.pdf']) {
      expect(await get(path, ua)).toBeUndefined()
    }
  })

  it.each(Object.entries(BLOCKED))('refuses %s with 403', async (_name, ua) => {
    const response = await get('/community-support/some-fundraiser', ua)
    expect(response?.status).toBe(403)
    expect(response?.headers.get('x-robots-tag')).toContain('noindex')
  })

  it('still serves robots.txt to blocked crawlers', async () => {
    expect(await get('/robots.txt', BLOCKED.gptbot)).toBeUndefined()
  })

  it('runs on pages and files but not on hashed bundles', () => {
    const pattern = new RegExp(`^${config.matcher[0]}$`)
    expect(pattern.test('/')).toBe(true)
    expect(pattern.test('/memorials/a-b/a-b-funeral-program.pdf')).toBe(true)
    expect(pattern.test('/assets/index-abc123.js')).toBe(false)
  })
})
