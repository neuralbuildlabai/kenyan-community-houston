/**
 * Static memorial registry — lightweight, no CMS.
 * Add new entries here as the community needs them.
 */

export const MEMORIAL_SITE_ORIGIN = 'https://kenyansingreaterhouston.org'

export type MemorialEntry = {
  slug: string
  /** Full legal / preferred display name */
  fullName: string
  /** Short heading used on index cards and hero eyebrow contexts */
  memorialHeading: string
  /** One-line description for SEO and index cards — facts only */
  summary: string
  dateOfBirth: string
  /** Optional sunset date from approved program material only */
  dateOfPassing?: string
  parents?: string
  siblings?: string
  /** Public path to the funeral program PDF under /public */
  funeralProgramPath: string
  funeralProgramTitle: string
  /** Public path to QR PNG (clean code for on-page display) */
  qrPngPath: string
  /** Print-ready QR PNG with header label */
  qrPrintPngPath: string
  /** Public path to QR SVG */
  qrSvgPath: string
  /** Permanent public URL (no www) — must match printed QR destination */
  permanentUrl: string
  /** Short respectful intro drawn only from approved program material */
  introduction: string
  acknowledgment?: string
}

export const COLLINS_COLLO_NAMASWA_SLUG = 'collins-collo-namaswa'

export const COLLINS_COLLO_NAMASWA: MemorialEntry = {
  slug: COLLINS_COLLO_NAMASWA_SLUG,
  fullName: 'Collins “Collo” Namaswa',
  memorialHeading: 'Forever in Our Hearts',
  summary:
    'A respectful memorial page honoring the life and memory of Collins “Collo” Namaswa.',
  dateOfBirth: 'May 12, 2016',
  dateOfPassing: 'July 8, 2026',
  parents: 'Judy Cheruto and Nixon Namaswa Wetende',
  siblings: 'Trevor Kiplangat',
  funeralProgramPath:
    '/memorials/collins-collo-namaswa/collins-collo-namaswa-funeral-program.pdf',
  funeralProgramTitle: 'Funeral Program for Collins “Collo” Namaswa',
  qrPngPath: '/memorials/collins-collo-namaswa/collins-collo-namaswa-memorial-qr.png',
  /** Print-ready QR with “Scan For Funeral Program” header */
  qrPrintPngPath:
    '/memorials/collins-collo-namaswa/collins-collo-namaswa-memorial-qr-print.png',
  qrSvgPath: '/memorials/collins-collo-namaswa/collins-collo-namaswa-memorial-qr.svg',
  permanentUrl: `${MEMORIAL_SITE_ORIGIN}/memorials/${COLLINS_COLLO_NAMASWA_SLUG}`,
  introduction:
    'Collins “Collo” Namaswa was born on May 12, 2016, to his loving parents, Judy Cheruto and Nixon Namaswa Wetende. As the second-born child, he shared a special bond with his older brother, Trevor Kiplangat. His time with us was far too short, yet the love he shared and the joy he brought will remain in our hearts forever.',
  acknowledgment:
    'Kenyans in Greater Houston joins the family and community in remembering Collo with love, gratitude, and prayer.',
}

/** Ordered list for the memorials index — newest / featured first. */
export const MEMORIALS: readonly MemorialEntry[] = [COLLINS_COLLO_NAMASWA]

export function getMemorialBySlug(slug: string): MemorialEntry | undefined {
  return MEMORIALS.find((m) => m.slug === slug)
}

export function memorialPath(slug: string): string {
  return `/memorials/${slug}`
}
