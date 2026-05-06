import { createClient } from '@supabase/supabase-js'
import { appEnv, checkSupabaseUrlAgainstAppEnv } from './appEnv'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

// Defence-in-depth: refuse to boot when the configured Supabase URL
// does not match the declared VITE_APP_ENV (e.g. a build labelled
// production pointing at a non-prod project, or vice versa).
const envCheck = checkSupabaseUrlAgainstAppEnv(supabaseUrl)
if (!envCheck.ok) {
  if (appEnv === 'production') {
    // Hard fail in production. We never want a prod build pointing
    // at the wrong database.
    throw new Error(
      `Supabase environment guard failed: ${envCheck.reason ?? 'unknown reason'}`
    )
  }
  // In staging / development, log loudly but do not block boot.
  console.warn('[supabase] env guard:', envCheck.reason)
} else if (envCheck.reason) {
  console.info('[supabase] env guard:', envCheck.reason)
}

/** Untyped client: local `database.types.ts` is not kept in sync with migrations. Regenerate types when schema stabilizes. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type SupabaseClient = typeof supabase
