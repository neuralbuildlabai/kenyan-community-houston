import { cn } from '@/lib/utils'
import { KIGH_LOGO_ALT, KIGH_LOGO_PATH } from '@/lib/kighAssets'
import {
  CERTIFICATE_FOOTER_TEXT,
  formatCertificateDate,
  getCertificateTemplate,
  KIGH_ORG_NAME,
  type CertificateFormData,
} from '@/lib/certificateTemplates'
import { getSignaturePublicUrl } from '@/lib/certificateSignatures'
import type { CertificateSignature } from '@/lib/types'
import { BigFiveWildlifeBackground } from '@/components/certificates/BigFiveWildlifeBackground'
import './certificate.css'

type CertificateDocumentProps = {
  data: CertificateFormData
  id?: string
  className?: string
  scale?: number
  resolvedSignature?: CertificateSignature | null
}

function CertificateLogo({ className }: { className?: string }) {
  return (
    <img
      src={KIGH_LOGO_PATH}
      alt={KIGH_LOGO_ALT}
      className={cn('cert-logo', className)}
      crossOrigin="anonymous"
    />
  )
}

function GuillochePattern() {
  return (
    <svg
      className="cert-guilloche"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <pattern id="certGuilloche" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M0 20 Q10 0 20 20 T40 20"
            fill="none"
            stroke="rgba(180,160,100,0.08)"
            strokeWidth="0.6"
          />
          <path
            d="M0 20 Q10 40 20 20 T40 20"
            fill="none"
            stroke="rgba(180,160,100,0.06)"
            strokeWidth="0.5"
          />
          <circle cx="20" cy="20" r="1.5" fill="rgba(180,160,100,0.05)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#certGuilloche)" />
    </svg>
  )
}

function OrnamentalBorder() {
  return (
    <>
      <div className="cert-border-outer" aria-hidden />
      <div className="cert-border-inner" aria-hidden />
      <div className="cert-corner cert-corner-tl" aria-hidden />
      <div className="cert-corner cert-corner-tr" aria-hidden />
      <div className="cert-corner cert-corner-bl" aria-hidden />
      <div className="cert-corner cert-corner-br" aria-hidden />
    </>
  )
}

function KenyaAccentBar() {
  return <div className="cert-kenya-accent" aria-hidden />
}

function OfficialSeal({ label }: { label: string }) {
  return (
    <div className="cert-official-seal" aria-hidden>
      <div className="cert-official-seal-ring">
        <div className="cert-official-seal-inner">
          <span className="cert-official-seal-kigh">KIGH</span>
          <span className="cert-official-seal-label">{label}</span>
        </div>
      </div>
    </div>
  )
}

function TemplateFlourish({ templateId }: { templateId: string }) {
  switch (templateId) {
    case 'volunteer-appreciation':
      return (
        <div className="cert-flourish cert-flourish-warm" aria-hidden>
          <span className="cert-flourish-line" />
          <span className="cert-flourish-ornament">✦</span>
          <span className="cert-flourish-line" />
        </div>
      )
    case 'community-speaker':
      return (
        <div className="cert-flourish cert-flourish-formal" aria-hidden>
          <span className="cert-flourish-bracket">⟨</span>
          <span className="cert-flourish-rule" />
          <span className="cert-flourish-bracket">⟩</span>
        </div>
      )
    case 'community-service-leadership':
      return (
        <div className="cert-flourish cert-flourish-prestigious" aria-hidden>
          <span className="cert-flourish-shield" />
        </div>
      )
    case 'donor-sponsor':
      return (
        <div className="cert-flourish cert-flourish-premium" aria-hidden>
          <span className="cert-flourish-star">★</span>
          <span className="cert-flourish-line cert-flourish-line-gold" />
          <span className="cert-flourish-star">★</span>
        </div>
      )
    case 'youth-achievement':
      return (
        <div className="cert-flourish cert-flourish-celebratory" aria-hidden>
          <span className="cert-flourish-laurel cert-flourish-laurel-left" />
          <span className="cert-flourish-ornament">◆</span>
          <span className="cert-flourish-laurel cert-flourish-laurel-right" />
        </div>
      )
    case 'vendor-partner':
      return (
        <div className="cert-flourish cert-flourish-partnership" aria-hidden>
          <span className="cert-flourish-link" />
          <span className="cert-flourish-ornament">∞</span>
          <span className="cert-flourish-link cert-flourish-link-right" />
        </div>
      )
    default:
      return null
  }
}

function TemplateAccent({ templateId }: { templateId: string }) {
  switch (templateId) {
    case 'volunteer-appreciation':
      return (
        <svg className="cert-template-accent cert-accent-warm" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="currentColor"
          />
        </svg>
      )
    case 'community-speaker':
      return (
        <svg className="cert-template-accent cert-accent-formal" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.21-1.79 4-4 4s-4-1.79-4-4H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
            fill="currentColor"
          />
        </svg>
      )
    case 'community-service-leadership':
      return (
        <svg className="cert-template-accent cert-accent-prestigious" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 3.87-2.69 7.52-6 8.56-3.31-1.04-6-4.69-6-8.56V6.43l6-2.25z"
            fill="currentColor"
          />
        </svg>
      )
    case 'donor-sponsor':
      return (
        <svg className="cert-template-accent cert-accent-premium" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2l2.4 4.86L20 7.64l-3.6 3.51.85 4.97L12 14.27l-5.25 2.85.85-4.97L3.6 7.64l5.6-.78L12 2z"
            fill="currentColor"
          />
        </svg>
      )
    case 'youth-achievement':
      return (
        <svg className="cert-template-accent cert-accent-celebratory" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"
            fill="currentColor"
          />
        </svg>
      )
    case 'vendor-partner':
      return (
        <svg className="cert-template-accent cert-accent-partnership" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
            fill="currentColor"
          />
        </svg>
      )
    default:
      return null
  }
}

function SignatureBlock({
  data,
  resolvedSignature,
}: {
  data: CertificateFormData
  resolvedSignature?: CertificateSignature | null
}) {
  const hasImage = Boolean(resolvedSignature?.image_url)
  const signerName =
    resolvedSignature?.signer_name?.trim() ||
    data.signature1Name.trim() ||
    '\u00A0'
  const signerTitle =
    resolvedSignature?.signer_title?.trim() ||
    data.signature1Title.trim() ||
    'Authorized Signatory'

  return (
    <div className="cert-meta-col cert-signature-col">
      <div className="cert-signature-area">
        {hasImage && resolvedSignature ? (
          <img
            src={getSignaturePublicUrl(resolvedSignature.image_url)}
            alt=""
            className="cert-signature-image"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="cert-signature-blank" aria-hidden />
        )}
      </div>
      <div className="cert-meta-line">{signerName}</div>
      <div className="cert-meta-caption">{signerTitle}</div>
    </div>
  )
}

function CertificateContent({
  data,
  resolvedSignature,
}: {
  data: CertificateFormData
  resolvedSignature?: CertificateSignature | null
}) {
  const template = getCertificateTemplate(data.templateId)
  if (!template) return null

  const displayDate = formatCertificateDate(data.issueDate)
  const recipient = data.recipientName.trim() || 'Recipient Name'

  return (
    <div className="cert-inner">
      <p className="cert-org-name">{KIGH_ORG_NAME}</p>

      <CertificateLogo />

      <div className="cert-title-block">
        <TemplateFlourish templateId={data.templateId} />
        <h1 className="cert-title">{template.title}</h1>
        <p className="cert-subtitle">{template.subtitle}</p>
      </div>

      <div className="cert-awarded-to">
        <span className="cert-awarded-line" aria-hidden>
          <span className="cert-awarded-diamond" />
        </span>
        <span className="cert-awarded-label">{template.presentedToLabel}</span>
        <span className="cert-awarded-line cert-awarded-line-right" aria-hidden>
          <span className="cert-awarded-diamond" />
        </span>
      </div>

      <p className="cert-recipient">{recipient}</p>

      <div className="cert-recipient-divider" aria-hidden>
        <span className="cert-divider-diamond" />
      </div>

      <TemplateAccent templateId={data.templateId} />

      {data.eventName.trim() ? (
        <p className="cert-event">In recognition of: {data.eventName.trim()}</p>
      ) : null}

      <p className="cert-body">{template.bodyText}</p>
      <p className="cert-closing">{template.closingLine}</p>

      <div className="cert-meta-zone">
        <div className="cert-meta-row">
          <div className="cert-meta-col cert-date-col">
            <div className="cert-meta-line">{displayDate || '—'}</div>
            <div className="cert-meta-caption">Date</div>
          </div>

          <div className="cert-meta-col cert-seal-col">
            <OfficialSeal label={template.sealLabel} />
          </div>

          <SignatureBlock data={data} resolvedSignature={resolvedSignature} />
        </div>
      </div>
    </div>
  )
}

export function CertificateDocument({
  data,
  id,
  className,
  scale = 1,
  resolvedSignature,
}: CertificateDocumentProps) {
  const template = getCertificateTemplate(data.templateId)
  const templateClass = template ? `cert-template-${template.id}` : ''
  const accentClass = template ? `cert-accent-${template.accentVariant}` : ''

  const sheet = (
    <article
      id={id}
      className={cn('certificate-sheet', templateClass, accentClass)}
      aria-label="Certificate preview"
    >
      <GuillochePattern />
      <div className="cert-watermark" aria-hidden>
        <img src={KIGH_LOGO_PATH} alt="" crossOrigin="anonymous" />
      </div>
      <BigFiveWildlifeBackground templateId={data.templateId} />
      <KenyaAccentBar />
      <OrnamentalBorder />

      <CertificateContent data={data} resolvedSignature={resolvedSignature} />

      <footer className="cert-footer">{CERTIFICATE_FOOTER_TEXT}</footer>
    </article>
  )

  if (scale === 1 && !className) {
    return sheet
  }

  return (
    <div
      className={cn('certificate-preview-scale', className)}
      style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
    >
      {sheet}
    </div>
  )
}
