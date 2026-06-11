export type CertificateDesignStyleId = 'classic-official' | 'modern-community' | 'heritage-premium'

export type CertificateTemplate = {
  id: string
  title: string
  category: string
  presentedToLabel: string
  bodyText: string
  closingLine: string
  defaultSignature1Title: string
  defaultSignature2Title: string
}

export type CertificateDesignStyle = {
  id: CertificateDesignStyleId
  label: string
  description: string
}

export const CERTIFICATE_FOOTER_TEXT =
  'Official Certificate of Recognition | kenyansingreaterhouston.org'

export const DEFAULT_SIGNATURE_1_TITLE = 'KIGH President / Chairperson'
export const DEFAULT_SIGNATURE_2_TITLE = 'KIGH Secretary / Community Representative'

export const CERTIFICATE_DESIGN_STYLES: CertificateDesignStyle[] = [
  {
    id: 'classic-official',
    label: 'Classic Official',
    description: 'Formal border, centered logo, Kenya color ribbon, and gold seal accent.',
  },
  {
    id: 'modern-community',
    label: 'Modern Community',
    description: 'Clean layout with Kenya color side accent and faint logo watermark.',
  },
  {
    id: 'heritage-premium',
    label: 'Heritage Premium',
    description: 'Ceremonial layout with geometric pattern, crest area, and gold accents.',
  },
]

export const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'volunteer-appreciation',
    title: 'Certificate of Appreciation',
    category: 'Volunteer Appreciation',
    presentedToLabel: 'Presented to:',
    bodyText:
      'In sincere appreciation of your dedicated volunteer service, generous spirit, and meaningful contribution to the Kenyans in Greater Houston Community.\n\nYour time, effort, and commitment help strengthen our community, support our events, and create a welcoming space for families, friends, and future generations.',
    closingLine: 'With gratitude from Kenyans in Greater Houston Community',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
  {
    id: 'community-speaker',
    title: 'Certificate of Recognition',
    category: 'Community Speaker Recognition',
    presentedToLabel: 'Presented to:',
    bodyText:
      'In recognition of your valuable contribution as a speaker and community forum leader for the Kenyans in Greater Houston Community.\n\nYour knowledge, voice, and leadership have helped inform, inspire, and empower our community through meaningful dialogue and shared learning.',
    closingLine: 'Presented with appreciation by Kenyans in Greater Houston Community',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
  {
    id: 'community-service-leadership',
    title: 'Certificate of Community Service',
    category: 'Community Service & Leadership',
    presentedToLabel: 'Presented to:',
    bodyText:
      'In honor of your outstanding service, leadership, and commitment to the growth and unity of the Kenyans in Greater Houston Community.\n\nYour contribution reflects the spirit of service, togetherness, and responsibility that continues to uplift our community.',
    closingLine: 'With deep appreciation from Kenyans in Greater Houston Community',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
  {
    id: 'donor-sponsor',
    title: 'Certificate of Appreciation',
    category: 'Donor & Sponsor Appreciation',
    presentedToLabel: 'Presented to:',
    bodyText:
      'In grateful recognition of your generous support and contribution to the Kenyans in Greater Houston Community.\n\nYour kindness and partnership help make our community programs, events, and outreach efforts possible.',
    closingLine: 'Presented with sincere gratitude by Kenyans in Greater Houston Community',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
  {
    id: 'youth-achievement',
    title: 'Certificate of Achievement',
    category: 'Youth Achievement',
    presentedToLabel: 'Presented to:',
    bodyText:
      'In recognition of your achievement, participation, and positive representation within the Kenyans in Greater Houston Community.\n\nYour dedication, growth, and example bring pride to our community and inspire others to continue striving for excellence.',
    closingLine: 'Presented with pride by Kenyans in Greater Houston Community',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
  {
    id: 'vendor-partner',
    title: 'Certificate of Appreciation',
    category: 'Vendor & Community Partner',
    presentedToLabel: 'Presented to:',
    bodyText:
      'In appreciation of your partnership, participation, and support of Kenyans in Greater Houston Community events and initiatives.\n\nYour presence and contribution help create meaningful community experiences and strengthen connections across Greater Houston.',
    closingLine: 'With appreciation from Kenyans in Greater Houston Community',
    defaultSignature1Title: DEFAULT_SIGNATURE_1_TITLE,
    defaultSignature2Title: DEFAULT_SIGNATURE_2_TITLE,
  },
]

export function getCertificateTemplate(id: string): CertificateTemplate | undefined {
  return CERTIFICATE_TEMPLATES.find((t) => t.id === id)
}

export function getCertificateDesignStyle(id: string): CertificateDesignStyle | undefined {
  return CERTIFICATE_DESIGN_STYLES.find((s) => s.id === id)
}

export type CertificateFormData = {
  templateId: string
  designStyleId: CertificateDesignStyleId
  recipientName: string
  issueDate: string
  eventName: string
  signature1Name: string
  signature1Title: string
  signature2Name: string
  signature2Title: string
}

export function createDefaultCertificateForm(): CertificateFormData {
  const template = CERTIFICATE_TEMPLATES[0]
  return {
    templateId: template.id,
    designStyleId: 'classic-official',
    recipientName: '',
    issueDate: new Date().toISOString().slice(0, 10),
    eventName: '',
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
