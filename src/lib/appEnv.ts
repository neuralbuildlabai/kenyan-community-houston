/**
 * App-environment helpers.
 *
 * `VITE_APP_ENV` is the source of truth for which deployment we are
 * running in. Three values are recognised:
 *
 *   - `production` : real production deployment
 *   - `staging`    : staging / UAT
 *   - `development`/`local` (default) : local dev or unspecified
 *
 * The build also exposes `VITE_PRODUCTION_SUPABASE_URLS` and
 * `VITE_STAGING_SUPABASE_URLS` (comma-separated allow-lists) which the
 * runtime guard in `src/lib/supabase.ts` uses to refuse to boot when
 * the configured URL does not match the declared environment. This is
 * a defence-in-depth check; secrets still come from build-time env.
 */

export type AppEnv = 'production' | 'staging' | 'development'

function normalize(value: string | undefined): AppEnv {
  const v = (value ?? '').trim().toLowerCase()
  if (v === 'production' || v === 'prod') return 'production'
  if (v === 'staging' || v === 'uat' || v === 'preview') return 'staging'
  return 'development'
}

export const appEnv: AppEnv = normalize(import.meta.env.VITE_APP_ENV as string | undefined)

export const isProduction = appEnv === 'production'
export const isStaging = appEnv === 'staging'
export const isDevelopment = appEnv === 'development'

/** Comma-separated allow-list of Supabase URLs that may be used in this env. */
function parseAllowList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export const productionSupabaseUrlAllowList = parseAllowList(
  import.meta.env.VITE_PRODUCTION_SUPABASE_URLS as string | undefined
)

export const stagingSupabaseUrlAllowList = parseAllowList(
  import.meta.env.VITE_STAGING_SUPABASE_URLS as string | undefined
)

export interface EnvGuardResult {
  ok: boolean
  reason?: string
}

/**
 * Returns ok=false if VITE_APP_ENV declares production but the
 * configured Supabase URL is not in the production allow-list, or
 * vice versa for staging. Empty allow-lists are treated as "not
 * configured yet" — the guard logs a warning but does not refuse to
 * boot in that case.
 */
export function checkSupabaseUrlAgainstAppEnv(supabaseUrl: string): EnvGuardResult {
  if (!supabaseUrl) {
    return { ok: false, reason: 'Missing VITE_SUPABASE_URL.' }
  }

  if (appEnv === 'production') {
    if (productionSupabaseUrlAllowList.length === 0) {
      return {
        ok: true,
        reason:
          'VITE_PRODUCTION_SUPABASE_URLS is empty; skipping production allow-list check.',
      }
    }
    if (!productionSupabaseUrlAllowList.includes(supabaseUrl)) {
      return {
        ok: false,
        reason:
          'VITE_APP_ENV=production but VITE_SUPABASE_URL is not in VITE_PRODUCTION_SUPABASE_URLS.',
      }
    }
  } else if (appEnv === 'staging') {
    if (stagingSupabaseUrlAllowList.length === 0) {
      return {
        ok: true,
        reason:
          'VITE_STAGING_SUPABASE_URLS is empty; skipping staging allow-list check.',
      }
    }
    if (!stagingSupabaseUrlAllowList.includes(supabaseUrl)) {
      return {
        ok: false,
        reason:
          'VITE_APP_ENV=staging but VITE_SUPABASE_URL is not in VITE_STAGING_SUPABASE_URLS.',
      }
    }
    // In staging, refuse to point at production allow-list.
    if (productionSupabaseUrlAllowList.includes(supabaseUrl)) {
      return {
        ok: false,
        reason:
          'VITE_APP_ENV=staging but VITE_SUPABASE_URL matches a production allow-list entry.',
      }
    }
  }

  return { ok: true }
}

export const APP_ENV_LABEL: Record<AppEnv, string> = {
  production: 'Production',
  staging: 'Staging / UAT',
  development: 'Development',
}
