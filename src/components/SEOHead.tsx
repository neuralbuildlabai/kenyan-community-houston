import { Helmet } from 'react-helmet-async'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'

interface SEOHeadProps {
  title?: string
  description?: string
  image?: string
  type?: 'website' | 'article'
  noIndex?: boolean
}

export function SEOHead({
  title,
  description = APP_DESCRIPTION,
  image,
  type = 'website',
  noIndex = false,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} — ${APP_NAME}` : APP_NAME
  const siteUrl = import.meta.env.VITE_APP_URL || 'https://kenyancommunityhouston.com'
  const defaultImage = `${siteUrl}/og-image.png`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image || defaultImage} />
      <meta property="og:site_name" content={APP_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image || defaultImage} />
    </Helmet>
  )
}
