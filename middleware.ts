/**
 * Serves real link previews for individual listings.
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

export default async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || ''
  if (!CRAWLER_UA.test(userAgent)) return

  const url = new URL(request.url)
  const [, section, slug] = url.pathname.split('/')
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
