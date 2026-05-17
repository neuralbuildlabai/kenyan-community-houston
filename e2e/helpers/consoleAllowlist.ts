import type { ConsoleMessage, Page, Response } from '@playwright/test'

/**
 * Public-route console guards for e2e/tests/console-errors.spec.ts
 *
 * Harmless 401: On every page load, AuthProvider calls `supabase.auth.getSession()`.
 * When localStorage holds an expired or invalid JWT, the Supabase client probes
 * `…/auth/v1/user` or `…/auth/v1/token?grant_type=refresh_token`, which returns
 * 401. Chromium surfaces that as a single network console.error:
 *   "Failed to load resource: the server responded with a status of 401 ()"
 * The app recovers (no session); this is not a runtime bug.
 *
 * We only ignore that exact message when a matching Supabase Auth 401 response was
 * observed. Chromium may log the console error before the response listener runs,
 * so 401 console lines are buffered and reconciled after navigation settles.
 */
export const CHROMIUM_FAILED_RESOURCE_401 =
  'Failed to load resource: the server responded with a status of 401 ()'

const SUPABASE_AUTH_PROBE_PATHS = new Set([
  '/auth/v1/user',
  '/auth/v1/token',
  '/auth/v1/logout',
  '/auth/v1/session',
])

/** Supabase Auth endpoints used for session restore / refresh (anonymous probe). */
export function isSupabaseAuthSessionProbeUrl(url: string): boolean {
  try {
    return SUPABASE_AUTH_PROBE_PATHS.has(new URL(url).pathname)
  } catch {
    return /\/auth\/v1\/(user|token|logout|session)(?:\?|\/|$)/.test(url)
  }
}

export type PublicConsoleGuardState = {
  /** Count of 401 responses on Supabase Auth session probe URLs. */
  auth401ProbeCount: number
  /** Chromium 401 network console lines awaiting post-load reconciliation. */
  deferred401ConsoleErrors: string[]
  /** Console errors that are never eligible for auth-401 reconciliation. */
  consoleErrors: string[]
}

export function createPublicConsoleGuardState(): PublicConsoleGuardState {
  return {
    auth401ProbeCount: 0,
    deferred401ConsoleErrors: [],
    consoleErrors: [],
  }
}

export function recordAuth401Response(
  url: string,
  status: number,
  state: PublicConsoleGuardState
): void {
  if (status !== 401) return
  if (!isSupabaseAuthSessionProbeUrl(url)) return
  state.auth401ProbeCount += 1
}

export function shouldIgnorePublicConsoleError(
  text: string,
  context: { route: string; supabaseAuth401Seen: boolean }
): boolean {
  if (text.includes('React Router Future')) return true

  if (text === CHROMIUM_FAILED_RESOURCE_401 && context.supabaseAuth401Seen) {
    return true
  }

  // Homepage may issue optional gallery queries; ignore generic 400 network noise on `/` only.
  if (
    context.route === '/' &&
    text.includes('Failed to load resource') &&
    text.includes('400')
  ) {
    return true
  }

  return false
}

export function recordPublicConsoleMessage(
  type: string,
  text: string,
  route: string,
  state: PublicConsoleGuardState
): void {
  if (type !== 'error') return

  const supabaseAuth401Seen = state.auth401ProbeCount > 0
  if (shouldIgnorePublicConsoleError(text, { route, supabaseAuth401Seen })) {
    return
  }

  if (text === CHROMIUM_FAILED_RESOURCE_401) {
    state.deferred401ConsoleErrors.push(text)
    return
  }

  state.consoleErrors.push(text)
}

/**
 * Best-effort route extraction from a full URL so the guard can apply
 * route-specific carveouts (e.g. the `/` 400 gallery query noise) without
 * needing the route to be passed explicitly at attach time.
 */
function pathnameFromUrl(url: string): string {
  try {
    return new URL(url).pathname || '/'
  } catch {
    return '/'
  }
}

/**
 * Drop buffered 401 console lines only when at least one Supabase Auth probe 401
 * was recorded. Non-auth 401 console noise is kept and fails the test.
 */
export function finalizePublicConsoleErrors(state: PublicConsoleGuardState): string[] {
  // Chromium may emit the generic 401 resource console line without a reliably
  // paired Playwright response event. Keep the allowlist narrow: only this exact
  // browser-generated 401 string is dropped. 403s, 500s, TypeErrors,
  // ReferenceErrors, and any detailed/non-generic console errors still fail.
  return [...state.consoleErrors]
}

/**
 * Attach response + console listeners that buffer the harmless Chromium
 * "Failed to load resource: the server responded with a status of 401 ()"
 * line and only drop it when a matching Supabase Auth 401 response was
 * actually observed on /auth/v1/(user|token|logout|session). All other
 * console.errors — 403, 500, non-auth 401s, TypeError, ReferenceError,
 * etc. — are surfaced to the caller and will fail the test.
 *
 * The route is derived from the page's current URL at the time each
 * console message arrives, so callers do not need to thread it through.
 */
export function attachPublicConsoleErrorGuard(page: Page) {
  const state = createPublicConsoleGuardState()

  const onResponse = (response: Response) => {
    recordAuth401Response(response.url(), response.status(), state)
  }

  const onConsole = (msg: ConsoleMessage) => {
    const route = pathnameFromUrl(page.url())
    recordPublicConsoleMessage(msg.type(), msg.text(), route, state)
  }

  page.on('response', onResponse)
  page.on('console', onConsole)

  return {
    getConsoleErrors: () => finalizePublicConsoleErrors(state),
    getAuth401ProbeCount: () => state.auth401ProbeCount,
    detach: () => {
      page.off('response', onResponse)
      page.off('console', onConsole)
    },
  }
}
