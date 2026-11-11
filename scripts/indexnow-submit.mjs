#!/usr/bin/env node
/**
 * Tells IndexNow search engines (Bing, Yandex, Seznam, Naver, ...) which
 * public URLs changed since the last run. Google does not use IndexNow; it
 * reads /sitemap.xml.
 *
 *   npm run seo:indexnow              submit what changed
 *   npm run seo:indexnow -- --dry-run show what would be submitted
 *
 * How it decides what to send: it reads the LIVE sitemap (the one the
 * middleware builds from published rows), compares each URL's lastmod with
 * the copy saved in .indexnow-state.json by the previous run, and submits only
 * new URLs, URLs whose lastmod moved, and URLs that left the sitemap. Static
 * pages carry no lastmod, so they are sent once and then only if they
 * disappear. Unchanged URLs are never re-sent on every deploy.
 *
 * The key file lives at public/<key>.txt and is public by design: IndexNow
 * proves ownership by fetching it. The script refuses to submit until the
 * live site serves that key, i.e. until the deploy carrying it is live.
 *
 * The state and log files are local to the machine that deploys (gitignored,
 * and outside the .vercelignore allowlist).
 */
import { readdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SITE = 'https://www.kenyansingreaterhouston.org'
const HOST = new URL(SITE).host
const ENDPOINT = 'https://api.indexnow.org/indexnow'
// middleware.ts refuses default library user agents; identify ourselves.
const UA = 'KIGH-IndexNow/1.0 (+https://www.kenyansingreaterhouston.org)'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STATE = path.join(root, '.indexnow-state.json')
const LOG = path.join(root, '.indexnow-log.jsonl')
const dryRun = process.argv.includes('--dry-run')

function fail(msg) {
  console.error(`IndexNow: ${msg}`)
  process.exit(1)
}

const keyFile = readdirSync(path.join(root, 'public')).find((f) => /^[a-f0-9]{32}\.txt$/.test(f))
if (!keyFile) fail('no public/<32-hex>.txt key file found')
const key = readFileSync(path.join(root, 'public', keyFile), 'utf8').trim()
const keyLocation = `${SITE}/${keyFile}`

async function get(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) })
    return { status: res.status, body: await res.text() }
  } catch (e) {
    fail(`could not fetch ${url}: ${e.cause?.code ?? e.message}`)
  }
}

const live = await get(keyLocation)
if (live.status !== 200 || live.body.trim() !== key) {
  fail(`${keyLocation} does not serve the key yet (HTTP ${live.status}). Deploy first.`)
}

const sm = await get(`${SITE}/sitemap.xml`)
if (sm.status !== 200 || !sm.body.includes('<urlset')) fail(`sitemap fetch failed (HTTP ${sm.status})`)

const current = {}
for (const m of sm.body.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)) {
  const loc = m[1].replace(/&amp;/g, '&').trim()
  if (new URL(loc).host === HOST) current[loc] = m[2] ?? ''
}
if (Object.keys(current).length === 0) fail('sitemap parsed to zero URLs; refusing to treat everything as removed')

const previous = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')).urls ?? {} : null
const added = [], changed = [], removed = []
for (const [loc, lastmod] of Object.entries(current)) {
  if (!previous || !(loc in previous)) added.push(loc)
  else if (previous[loc] !== lastmod) changed.push(loc)
}
if (previous) for (const loc of Object.keys(previous)) if (!(loc in current)) removed.push(loc)

const urlList = [...added, ...changed, ...removed]
console.log(
  `IndexNow: ${Object.keys(current).length} URLs in sitemap; ` +
    `${added.length} new, ${changed.length} changed, ${removed.length} removed` +
    (previous ? '' : ' (first run: submitting the full sitemap once)'),
)
if (urlList.length === 0) process.exit(0)
if (dryRun) {
  urlList.forEach((u) => console.log('  ', u))
  process.exit(0)
}

async function submit(batch) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8', 'user-agent': UA },
      body: JSON.stringify({ host: HOST, key, keyLocation, urlList: batch }),
      signal: AbortSignal.timeout(30000),
    })
    // 200 = received; 202 = received, key validation pending.
    if (res.status === 200 || res.status === 202) return res.status
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt))
      continue
    }
    // 400 bad request, 403 key not valid, 422 URLs not on this host.
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  throw new Error('rate-limited or server error after 4 attempts')
}

const results = []
try {
  for (let i = 0; i < urlList.length; i += 10000) {
    results.push(await submit(urlList.slice(i, i + 10000)))
  }
} catch (e) {
  appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ok: false, error: String(e), count: urlList.length }) + '\n')
  fail(`submission failed, state not updated so the next run retries: ${e}`)
}

writeFileSync(STATE, JSON.stringify({ updated: new Date().toISOString(), urls: current }, null, 1))
appendFileSync(
  LOG,
  JSON.stringify({ at: new Date().toISOString(), ok: true, statuses: results, added, changed, removed }) + '\n',
)
console.log(`IndexNow: submitted ${urlList.length} URL(s), HTTP ${results.join(', ')}`)
