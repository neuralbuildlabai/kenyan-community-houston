/**
 * Full-resolution official KIGH logo (1080px CMYK, filename contains a
 * space). Certificates use it because they are printed; screens use
 * the small copies below.
 */
export const KIGH_LOGO_PATH =
  '/kigh-media/' + encodeURIComponent('KIGH-LOGO-2024-FINAL 3.jpg')

/** On-screen logo (shown at 96px or less): sRGB WebP plus a JPEG fallback. */
export const KIGH_LOGO_UI = {
  webpSrcSet: '/kigh-media/logo/kigh-logo-128.webp 128w, /kigh-media/logo/kigh-logo-256.webp 256w',
  fallback: '/kigh-media/logo/kigh-logo-256.jpg',
  size: 256,
} as const

export const KIGH_LOGO_ALT = 'Kenyans in Greater Houston logo'
