/**
 * Feature flags (Vite env, baked at build time).
 * Google OAuth: enable only after Supabase + Google redirect URIs match production.
 */
export function isGoogleAuthEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true'
}
