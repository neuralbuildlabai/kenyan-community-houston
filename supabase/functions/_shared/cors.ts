/**
 * CORS for browser calls to Supabase Edge Functions.
 *
 * Do not use Access-Control-Allow-Origin: * when the client sends
 * Authorization (supabase.functions.invoke does). Browsers reject
 * credentialed responses with a wildcard origin.
 */

const ALLOWED_ORIGIN_EXACT = new Set([
  'https://www.kenyansingreaterhouston.org',
  'https://kenyansingreaterhouston.org',
])

const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/kenyan-community-houston-[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
]

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGIN_EXACT.has(origin)) return true
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
}

export function corsHeadersForRequest(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  return headers
}

/** OPTIONS preflight — no Authorization required. */
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null
  return new Response(null, { status: 204, headers: corsHeadersForRequest(req) })
}

export function jsonResponse(
  req: Request,
  status: number,
  body: Record<string, unknown>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersForRequest(req),
      'Content-Type': 'application/json',
    },
  })
}
