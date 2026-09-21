import { useEffect } from 'react'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'

interface SEOHeadProps {
  title?: string
  /** When set, used as the full document `<title>` without appending the site name. */
  documentTitle?: string
  description?: string
  image?: string
  type?: 'website' | 'article'
  noIndex?: boolean
  /** Absolute canonical URL (preferred when the permanent URL must not use www). */
  canonicalUrl?: string
  /** Path beginning with `/`; joined with the configured site origin. */
  canonicalPath?: string
}

/** Marks tags this component created, so they are recognisable in the DOM. */
const OWNED = 'data-seo-head'

function upsertMeta(keyAttr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${keyAttr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(keyAttr, key)
    el.setAttribute(OWNED, '')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    el.setAttribute(OWNED, '')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function removeTag(selector: string) {
  document.head.querySelector(selector)?.remove()
}

/**
 * Applies the document title and social metadata for the current page.
 *
 * Writes to `document.head` directly rather than going through
 * react-helmet-async, which emitted nothing at all under React 18 StrictMode
 * here — every page served the static index.html tags, so browser tabs,
 * bookmarks and JS-executing crawlers saw one generic title site-wide.
 *
 * Every render writes the complete set, so whichever page is mounted wins and
 * nothing is torn down on unmount — that would race the next page's tags
 * during a route change. The two conditional tags, robots and canonical, are
 * removed explicitly when they do not apply so a noindex page cannot leak its
 * directive onto the next one.
 *
 * Link previews are a separate problem: WhatsApp, Facebook and similar
 * scrapers do not run JavaScript, so they still see index.html. Per-page
 * previews need prerendering or SSR; this fixes what the browser and
 * JS-executing crawlers see.
 */
export function SEOHead({
  title,
  documentTitle,
  description = APP_DESCRIPTION,
  image,
  type = 'website',
  noIndex = false,
  canonicalUrl,
  canonicalPath,
}: SEOHeadProps) {
  const fullTitle = documentTitle ?? (title ? `${title} — ${APP_NAME}` : APP_NAME)
  const siteUrl = (import.meta.env.VITE_APP_URL || 'https://www.kenyansingreaterhouston.org').replace(
    /\/$/,
    '',
  )
  const defaultImage = `${siteUrl}/og-image.png`
  const resolvedImage = image || defaultImage
  const resolvedCanonical =
    canonicalUrl ||
    (canonicalPath
      ? `${siteUrl}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
      : undefined)

  useEffect(() => {
    document.title = fullTitle

    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:image', resolvedImage)
    upsertMeta('property', 'og:site_name', APP_NAME)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', resolvedImage)

    if (noIndex) upsertMeta('name', 'robots', 'noindex,nofollow')
    else removeTag('meta[name="robots"]')

    if (resolvedCanonical) {
      upsertCanonical(resolvedCanonical)
      upsertMeta('property', 'og:url', resolvedCanonical)
    } else {
      removeTag('link[rel="canonical"]')
      removeTag('meta[property="og:url"]')
    }
  }, [fullTitle, description, type, resolvedImage, noIndex, resolvedCanonical])

  return null
}
