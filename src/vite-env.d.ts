/// <reference types="vite/client" />

declare const __KIGH_APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_APP_NAME: string
  /** Public contact email shown sitewide; defaults in code if unset. */
  readonly VITE_CONTACT_EMAIL?: string
  /** Public website URL for invite links (e.g. https://kenyancommunityhouston.org). */
  readonly VITE_PUBLIC_SITE_URL?: string
  /** When true, logs Supabase error code/message/details/hint in the browser console (UAT debugging). */
  readonly VITE_DEBUG_SUPABASE_ERRORS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
