import { Helmet } from 'react-helmet-async'
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
  const resolvedCanonical =
    canonicalUrl ||
    (canonicalPath
      ? `${siteUrl}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
      : undefined)

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      {resolvedCanonical ? <link rel="canonical" href={resolvedCanonical} /> : null}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image || defaultImage} />
      <meta property="og:site_name" content={APP_NAME} />
      {resolvedCanonical ? <meta property="og:url" content={resolvedCanonical} /> : null}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image || defaultImage} />
    </Helmet>
  )
}
