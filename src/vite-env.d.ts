/// <reference types="vite/client" />

declare const __KIGH_APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_APP_NAME: string
  /** When `"true"`, show Continue with Google on login/membership. Default off for UAT. */
  readonly VITE_ENABLE_GOOGLE_AUTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
