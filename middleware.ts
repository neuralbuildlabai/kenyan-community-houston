/**
 * Two jobs, both of which have to happen before the app loads.
 *
 * 1. Real link previews for individual listings (the bulk of this file).
 * 2. Taking archived memorials offline. An archived memorial must stop
 *    serving its page *and* its funeral program, and those files are static
 *    assets under /public that the app cannot gate. Only the edge sees both.
 *
 * Nothing here is imported from src/ on purpose: this file is bundled
 * separately for the edge runtime and has no access to Vite's path aliases.
 * The few strings duplicated from src/lib are pinned by
 * memorialArchiveMiddleware.test.ts.
 *
 * WhatsApp, Facebook and X fetch a URL and read the HTML; none of them run
 * JavaScript. This is a Vite SPA, so every path returns the same index.html
 * and every shared link previewed identically — same title, same description,
 * no sense of what was shared.
 *
 * This middleware answers crawlers (and only crawlers) with a small HTML
 * document carrying that record's own title, description and image. Real
 * visitors fall straight through to the app and are never delayed by the
 * lookup. The metadata matches what the page itself shows, so this is
 * dynamic rendering rather than cloaking.
 *
 * Runs on Vercel's edge runtime. Uses the Supabase anon key, which is already
 * public in the client bundle, and reads only published rows.
 */
export const config = {
  matcher: [
    '/businesses/:slug',
    '/events/:slug',
    '/announcements/:slug',
    '/community-support/:slug',
    '/sports-youth/:slug',
    // Memorial pages and everything beneath them (funeral program, QR files).
    '/memorials/:slug',
    '/memorials/:slug/:asset*',
  ],
}

const SITE_URL = 'https://www.kenyansingreaterhouston.org'
const SITE_NAME = 'Kenyans in Greater Houston'
const FALLBACK_IMAGE = `${SITE_URL}/og-image.png`

/** Scrapers that read tags but never execute the app. */
const CRAWLER_UA =
  /(facebookexternalhit|facebookcatalog|WhatsApp|Twitterbot|LinkedInBot|Slackbot|Slack-ImgProxy|TelegramBot|Discordbot|Pinterest|redditbot|SkypeUriPreview|vkShare|Google-InspectionTool|Googlebot|bingbot|Applebot|embedly|iframely|Yahoo! Slurp|DuckDuckBot|Mastodon|Bluesky)/i

interface RouteConfig {
  table: string
  /** Columns to request, in the order the preview prefers them. */
  titleField: string
  descriptionFields: string[]
  imageFields: string[]
}

const ROUTES: Record<string, RouteConfig> = {
  businesses: {
    table: 'businesses',
    titleField: 'name',
    descriptionFields: ['description', 'services'],
    imageFields: ['logo_url'],
  },
  events: {
    table: 'events',
    titleField: 'title',
    descriptionFields: ['short_description', 'description'],
    imageFields: ['image_url'],
  },
  announcements: {
    table: 'announcements',
    titleField: 'title',
    descriptionFields: ['summary'],
    imageFields: ['image_url'],
  },
  'community-support': {
    table: 'fundraisers',
    titleField: 'title',
    descriptionFields: ['summary'],
    imageFields: ['image_url'],
  },
  'sports-youth': {
    table: 'sports_posts',
    titleField: 'title',
    descriptionFields: ['summary'],
    imageFields: ['image_url'],
  },
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Previews truncate anyway; a clean sentence beats a mid-word cut. */
function trim(value: string, max = 200): string {
  const flat = value.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

function absoluteUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`
}

function renderPreview(opts: {
  title: string
  description: string
  image: string
  url: string
}): string {
  const title = escapeHtml(opts.title)
  const description = escapeHtml(opts.description)
  const image = escapeHtml(opts.image)
  const url = escapeHtml(opts.url)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${url}" />
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${image}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
</head>
<body><p><a href="${url}">${title}</a></p></body>
</html>`
}

/* ---------------------------------------------------------------------- *
 * Archived memorials
 * ---------------------------------------------------------------------- */

/** Keep in sync with MEMORIAL_PREVIEW_COOKIE in src/lib/memorialPreview.ts. */
const MEMORIAL_PREVIEW_COOKIE = 'kigh_memorial_preview'

/** Keep in sync with ARCHIVED_MEMORIAL_* in src/lib/memorialLifecycle.ts. */
const ARCHIVED_MEMORIAL_HEADING = 'This memorial has been archived'
const ARCHIVED_MEMORIAL_NOTICE =
  'The funeral service has taken place and this page is no longer published. Our thoughts remain with the family.'

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie')
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() !== name) continue
    return part.slice(eq + 1).trim()
  }
  return undefined
}

/**
 * Fails open: a slow or broken lookup reports "not archived", because
 * wrongly hiding a memorial is far worse than briefly serving one.
 */
async function memorialIsArchived(
  slug: string,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<boolean> {
  try {
    const endpoint =
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/memorial_states` +
      `?slug=eq.${encodeURIComponent(slug)}&select=status&limit=1`
    const response = await fetch(endpoint, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      signal: AbortSignal.timeout(2500),
    })
    if (!response.ok) return false
    const rows = (await response.json()) as Array<{ status?: string | null }>
    return rows[0]?.status === 'archived'
  } catch {
    return false
  }
}

/**
 * Fails closed: only a token the database itself confirms as an elevated
 * admin unlocks an archived memorial.
 */
async function isElevatedAdmin(
  token: string,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/kigh_is_elevated_admin`,
      {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: '{}',
        signal: AbortSignal.timeout(2500),
      },
    )
    if (!response.ok) return false
    return (await response.json()) === true
  } catch {
    return false
  }
}

function renderArchivedMemorial(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(ARCHIVED_MEMORIAL_HEADING)} — ${escapeHtml(SITE_NAME)}</title>
<meta name="robots" content="noindex, nofollow" />
<style>
  :root { color-scheme: light }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #fdfbf7; color: #2b2724; padding: 2rem 1.5rem;
         font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif }
  main { max-width: 32rem; text-align: center }
  h1 { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.01em;
       font-family: "Cormorant Garamond", Georgia, serif }
  p { margin: 0 0 1.75rem; font-size: 0.975rem; line-height: 1.7; color: #5d564f }
  a { color: #8a6a1f; font-weight: 500; text-decoration: underline;
      text-underline-offset: 5px }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(ARCHIVED_MEMORIAL_HEADING)}</h1>
<p>${escapeHtml(ARCHIVED_MEMORIAL_NOTICE)}</p>
<p><a href="${SITE_URL}/memorials">View all memorials</a></p>
</main>
</body>
</html>`
}

/**
 * Returns a notice for an archived memorial, or nothing at all — which lets
 * the page, the funeral program, and the QR files through as usual.
 */
async function archivedMemorialGate(
  request: Request,
  slug: string,
): Promise<Response | undefined> {
  if (!SLUG_PATTERN.test(slug)) return

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return

  if (!(await memorialIsArchived(slug, supabaseUrl, supabaseKey))) return

  const token = readCookie(request, MEMORIAL_PREVIEW_COOKIE)
  if (token && (await isElevatedAdmin(token, supabaseUrl, supabaseKey))) return

  return new Response(renderArchivedMemorial(), {
    // Gone, not Not Found: this page existed and was withdrawn on purpose.
    status: 410,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // An admin and a visitor must never share a cached answer, and the
      // state can change the moment an admin restores the memorial.
      'cache-control': 'no-store',
      vary: 'cookie',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}

export default async function middleware(request: Request) {
  const url = new URL(request.url)
  const [, section, slug] = url.pathname.split('/')

  // Runs for every visitor, crawlers included — unlike the preview below.
  if (section === 'memorials' && slug) return archivedMemorialGate(request, slug)

  const userAgent = request.headers.get('user-agent') || ''
  if (!CRAWLER_UA.test(userAgent)) return

  const route = ROUTES[section]
  if (!route || !slug) return

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return

  const columns = [
    route.titleField,
    ...route.descriptionFields,
    ...route.imageFields,
  ].join(',')

  let row: Record<string, string | null> | undefined
  try {
    const endpoint =
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${route.table}` +
      `?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=${columns}&limit=1`
    const response = await fetch(endpoint, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      signal: AbortSignal.timeout(2500),
    })
    if (!response.ok) return
    const rows = (await response.json()) as Array<Record<string, string | null>>
    row = rows[0]
  } catch {
    // A slow or failing lookup must never break the page; fall through to the
    // app, which still renders correctly for a human.
    return
  }
  if (!row) return

  const title = (row[route.titleField] || '').trim()
  if (!title) return

  const description =
    route.descriptionFields.map((f) => row?.[f]).find((v) => v && v.trim()) || ''
  const image = route.imageFields.map((f) => row?.[f]).find((v) => v && v.trim())

  return new Response(
    renderPreview({
      title: `${title} — ${SITE_NAME}`,
      description: description ? trim(description) : `${title} on ${SITE_NAME}.`,
      image: image ? absoluteUrl(image) : FALLBACK_IMAGE,
      url: `${SITE_URL}${url.pathname}`,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Previews are re-fetched often; let the edge absorb repeats.
        'cache-control': 'public, max-age=300, s-maxage=3600',
      },
    },
  )
}
