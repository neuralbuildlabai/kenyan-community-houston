export type CertificateTemplateId =
  | 'volunteer-appreciation'
  | 'community-speaker'
  | 'community-service-leadership'
  | 'donor-sponsor'
  | 'youth-achievement'
  | 'vendor-partner'

/** @deprecated Legacy design style — auto-derived from template for DB compatibility. */
export type CertificateDesignStyleId = 'classic-official' | 'modern-community' | 'heritage-premium'

export type CertificateTemplateAccent =
  | 'warm'
  | 'formal'
  | 'prestigious'
  | 'premium'
  | 'celebratory'
  | 'partnership'

export type CertificateSignatureMode = 'none' | 'default' | 'selected'

export type CertificateTemplate = {
  id: CertificateTemplateId
  title: string
  subtitle: string
  category: string
  presentedToLabel: string
  /** Uppercase label for the optional event/program highlight line. */
  programHighlightLabel: string
  bodyText: string
  closingLine: string
  sealLabel: string
  accentVariant: CertificateTemplateAccent
  bigFiveBgKey: keyof typeof BIG_FIVE_CERTIFICATE_BG_OPTIONS
  defaultSignature1Title: string
  defaultSignature2Title: string
}

export type CertificateDesignStyle = {
  id: CertificateDesignStyleId
  label: string
  description: string
}

export const KIGH_ORG_NAME = 'Kenyans in Greater Houston Community'

export const CERTIFICATE_FOOTER_TEXT =
  'Official Certificate of Recognition | kenyansingreaterhouston.org'

export const BIG_FIVE_CERTIFICATE_BG_PATH = '/kigh-media/kigh-big-five-certificate-bg.png'

export const BIG_FIVE_CERTIFICATE_BG_OPTIONS = {
  default: '/kigh-media/kigh-big-five-certificate-bg.png',
  option1: '/kigh-media/certificates/kigh-big-five-certificate-bg-option-1.png',
  option2: '/kigh-media/certificates/kigh-big-five-certificate-bg-option-2.png',
  option3: '/kigh-media/certificates/kigh-big-five-certificate-bg-option-3.png',
  option4: '/kigh-media/certificates/kigh-big-five-certificate-bg-option-4.png',
} as const

export function getBigFiveCertificateBgPath(templateId: string): string {
  const template = getCertificateTemplate(templateId)
  if (template) {
    return BIG_FIVE_CERTIFICATE_BG_OPTIONS[template.bigFiveBgKey]
  }
  return BIG_FIVE_CERTIFICATE_BG_PATH
}

/** Legacy mapping kept for certificate_records.design_style column compatibility. */
export function getLegacyDesignStyleForTemplate(templateId: string): CertificateDesignStyleId {
  switch (templateId) {
    case 'volunteer-appreciation':
    case 'youth-achievement':
      return 'modern-community'
    case 'community-speaker':
    case 'vendor-partner':
      return 'classic-official'
    case 'community-service-leadership':
    case 'donor-sponsor':
      return 'heritage-premium'
    default:
      return 'modern-community'
  }
}

export const DEFAULT_SIGNATURE_1_TITLE = 'KIGH President / Chairperson'
export const DEFAULT_SIGNATURE_2_TITLE = 'KIGH Secretary / Community Representative'

export const CERTIFICATE_DESIGN_STYLES: CertificateDesignStyle[] = [
  {
    id: 'modern-community',
    label: 'Modern Community',
    description: 'Clean contemporary layout with slim Kenya accent, faint logo watermark, and subtle wildlife background.',
  },
  {
    id: 'classic-official',
    label: 'Classic Official',
    description: 'Formal double-line border, elegant corner accents, and restrained gold seal for ceremonial recognition.',
  },
  {
    id: 'heritage-premium',
    label: 'Heritage Premium',
    description: 'Refined heritage patterning with muted green and gold accents and distinguished cultural elegance.',
  },
]

export const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'volunteer-appreciation',
    title: 'Certificate',
    subtitle: 'of Appreciation',
    category: 'Volunteer Appreciation',
    presentedToLabel: 'This is awarded to',
    programHighlightLabel: 'Service / Program',
    bodyText:
      'In sincere appreciation of your generous volunteer service, dedication, and meaningful contribution to the Kenyans in Greater Houston Community.\n\nThrough your time, effort, and willingness to serve, you have helped strengthen our programs, uplift our events, and create a welcoming space for families and the wider community.',
    closingLine: 'Presented with heartfelt gratitude by Kenyans in Greater Houston Community',
    sealLabel: 'Community Service',
    accentVariant: 'warm',
    bigFiveBgKey: 'default',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
  {
    id: 'community-speaker',
    title: 'Certificate',
    subtitle: 'of Recognition',
    category: 'Community Speaker Recognition',
    presentedToLabel: 'This is awarded to',
    programHighlightLabel: 'Recognition Occasion',
    bodyText:
      'In honor of your valuable contribution as a speaker and community forum leader for the Kenyans in Greater Houston Community.\n\nYour insight, leadership, and willingness to share knowledge have helped inform, inspire, and empower our community through meaningful dialogue and shared learning.',
    closingLine: 'Presented with sincere appreciation by Kenyans in Greater Houston Community',
    sealLabel: 'Forum Leadership',
    accentVariant: 'formal',
    bigFiveBgKey: 'option3',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
  {
    id: 'community-service-leadership',
    title: 'Certificate',
    subtitle: 'of Community Service',
    category: 'Community Service & Leadership',
    presentedToLabel: 'This is awarded to',
    programHighlightLabel: 'Service / Program',
    bodyText:
      'In honor of your outstanding service, leadership, and commitment to the growth and unity of the Kenyans in Greater Houston Community.\n\nYour dedication reflects the spirit of service, responsibility, and togetherness that continues to strengthen and uplift our community.',
    closingLine: 'Presented with deep appreciation by Kenyans in Greater Houston Community',
    sealLabel: 'Civic Leadership',
    accentVariant: 'prestigious',
    bigFiveBgKey: 'option1',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
  {
    id: 'donor-sponsor',
    title: 'Certificate',
    subtitle: 'of Appreciation',
    category: 'Donor & Sponsor Appreciation',
    presentedToLabel: 'This is awarded to',
    programHighlightLabel: 'Recognition Occasion',
    bodyText:
      'In grateful appreciation of your generous support and valued partnership with the Kenyans in Greater Houston Community.\n\nYour contribution helps make our community programs, events, outreach, and shared initiatives possible, leaving a meaningful impact on the people we serve.',
    closingLine: 'Presented with sincere gratitude by Kenyans in Greater Houston Community',
    sealLabel: 'Generous Support',
    accentVariant: 'premium',
    bigFiveBgKey: 'option4',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
  {
    id: 'youth-achievement',
    title: 'Certificate',
    subtitle: 'of Achievement',
    category: 'Youth Achievement',
    presentedToLabel: 'This is awarded to',
    programHighlightLabel: 'Recognition Occasion',
    bodyText:
      'In celebration of your achievement, participation, and positive representation within the Kenyans in Greater Houston Community.\n\nYour dedication, growth, and example bring pride to our community and inspire others to pursue excellence with confidence and purpose.',
    closingLine: 'Presented with pride and encouragement by Kenyans in Greater Houston Community',
    sealLabel: 'Youth Excellence',
    accentVariant: 'celebratory',
    bigFiveBgKey: 'option2',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
  {
    id: 'vendor-partner',
    title: 'Certificate',
    subtitle: 'of Appreciation',
    category: 'Vendor & Community Partner',
    presentedToLabel: 'This is awarded to',
    programHighlightLabel: 'Service / Program',
    bodyText:
      'In appreciation of your valued partnership, participation, and support of Kenyans in Greater Houston Community events and initiatives.\n\nYour presence and contribution help create meaningful community experiences, strengthen local connections, and support the spirit of collaboration across Greater Houston.',
    closingLine: 'Presented with sincere appreciation by Kenyans in Greater Houston Community',
    sealLabel: 'Community Partner',
    accentVariant: 'partnership',
    bigFiveBgKey: 'option3',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
]

export function getCertificateTemplate(id: string): CertificateTemplate | undefined {
  return CERTIFICATE_TEMPLATES.find((t) => t.id === id)
}

export type CertificateEventProgramDisplay = {
  label: string
  name: string
}

/** Returns highlight content for the optional event/program field, or null when empty. */
export function getCertificateEventProgramDisplay(
  eventName: string,
  templateId: string,
): CertificateEventProgramDisplay | null {
  const name = eventName.trim()
  if (!name) return null

  const template = getCertificateTemplate(templateId)
  return {
    label: template?.programHighlightLabel ?? 'Recognition Occasion',
    name,
  }
}

/** Legacy event line prefix — must not appear in rendered certificate output. */
export const LEGACY_CERTIFICATE_EVENT_PREFIX = 'In recognition of:'

export function getCertificateDesignStyle(id: string): CertificateDesignStyle | undefined {
  return CERTIFICATE_DESIGN_STYLES.find((s) => s.id === id)
}

export type CertificateFormData = {
  templateId: string
  /** @deprecated Auto-derived from templateId — kept for DB backward compatibility. */
  designStyleId: CertificateDesignStyleId
  recipientName: string
  issueDate: string
  eventName: string
  signatureMode: CertificateSignatureMode
  signatureId: string | null
  /** Snapshot of signature image at issuance (preserved on saved records). */
  signatureImageUrl: string | null
  signature1Name: string
  signature1Title: string
  signature2Name: string
  signature2Title: string
}

export function createDefaultCertificateForm(): CertificateFormData {
  const template = CERTIFICATE_TEMPLATES[0]
  return {
    templateId: template.id,
    designStyleId: getLegacyDesignStyleForTemplate(template.id),
    recipientName: '',
    issueDate: new Date().toISOString().slice(0, 10),
    eventName: '',
    signatureMode: 'none',
    signatureId: null,
    signatureImageUrl: null,
    signature1Name: '',
    signature1Title: template.defaultSignature1Title,
    signature2Name: '',
    signature2Title: template.defaultSignature2Title,
  }
}

export function formatCertificateDate(isoDate: string): string {
  if (!isoDate) return ''
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function certificatePdfFilename(recipientName: string, category: string): string {
  const safeName = recipientName.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40) || 'recipient'
  const safeCategory = category.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 30)
  return `KIGH-Certificate-${safeCategory}-${safeName}.pdf`
}
