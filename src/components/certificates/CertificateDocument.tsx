import { cn } from '@/lib/utils'
import { KIGH_LOGO_ALT, KIGH_LOGO_PATH } from '@/lib/kighAssets'
import {
  CERTIFICATE_FOOTER_TEXT,
  formatCertificateDate,
  getCertificateDesignStyle,
  getCertificateTemplate,
  type CertificateFormData,
} from '@/lib/certificateTemplates'
import { BigFiveWildlifeBackground } from '@/components/certificates/BigFiveWildlifeBackground'
import './certificate.css'

type CertificateDocumentProps = {
  data: CertificateFormData
  id?: string
  className?: string
  scale?: number
}

function CertificateLogo({ heightIn = '0.62in', className }: { heightIn?: string; className?: string }) {
  return (
    <img
      src={KIGH_LOGO_PATH}
      alt={KIGH_LOGO_ALT}
      className={cn('cert-logo', className)}
      style={{ height: heightIn, width: 'auto', maxWidth: '2.15in' }}
      crossOrigin="anonymous"
    />
  )
}

function GoldSeal({ className }: { className?: string }) {
  return (
    <div className={cn('cert-gold-seal', className)} aria-hidden>
      <div className="cert-gold-seal-ring">
        <div className="cert-gold-seal-inner">
          <span className="cert-gold-seal-text">KIGH</span>
        </div>
      </div>
    </div>
  )
}

function SharedCertificateDecor({ designStyleId }: { designStyleId: CertificateFormData['designStyleId'] }) {
  return (
    <>
      <div className="cert-watermark" aria-hidden>
        <img src={KIGH_LOGO_PATH} alt="" crossOrigin="anonymous" />
      </div>
      <BigFiveWildlifeBackground designStyleId={designStyleId} />
    </>
  )
}

function CertificateContent({ data }: { data: CertificateFormData }) {
  const template = getCertificateTemplate(data.templateId)
  if (!template) return null

  const displayDate = formatCertificateDate(data.issueDate)
  const recipient = data.recipientName.trim() || 'Recipient Name'
  const sig1Name = data.signature1Name.trim() || '\u00A0'
  const sig2Name = data.signature2Name.trim() || '\u00A0'

  return (
    <div className="cert-inner">
      <CertificateLogo />

      <h1 className="cert-title">{template.title}</h1>

      <p className="cert-recipient">{recipient}</p>
      <div className="cert-recipient-divider" aria-hidden>
        <span className="cert-divider-diamond" />
      </div>

      {data.eventName.trim() ? (
        <p className="cert-event">In recognition of: {data.eventName.trim()}</p>
      ) : null}

      <p className="cert-body">{template.bodyText}</p>
      <p className="cert-closing">{template.closingLine}</p>

      <div className="cert-meta-zone">
        <div className="cert-meta-row">
          <div className="cert-meta-col cert-date-col">
            <div className="cert-meta-label">Date</div>
            <div className="cert-meta-line">{displayDate || '—'}</div>
            <div className="cert-meta-caption cert-meta-caption-empty" aria-hidden>
              &nbsp;
            </div>
          </div>

          <div className="cert-meta-col">
            <div className="cert-meta-label cert-meta-label-spacer" aria-hidden>
              &nbsp;
            </div>
            <div className="cert-meta-line">{sig1Name}</div>
            <div className="cert-meta-caption">
              {data.signature1Title.trim() || 'Signature Title'}
            </div>
          </div>

          <div className="cert-meta-col">
            <div className="cert-meta-label cert-meta-label-spacer" aria-hidden>
              &nbsp;
            </div>
            <div className="cert-meta-line">{sig2Name}</div>
            <div className="cert-meta-caption">
              {data.signature2Title.trim() || 'Signature Title'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClassicOfficialDecor() {
  return (
    <>
      <div className="cert-classic-accent" aria-hidden />
      <div className="cert-classic-corner cert-classic-corner-tl" aria-hidden />
      <div className="cert-classic-corner cert-classic-corner-tr" aria-hidden />
      <div className="cert-classic-corner cert-classic-corner-bl" aria-hidden />
      <div className="cert-classic-corner cert-classic-corner-br" aria-hidden />
      <GoldSeal className="cert-classic-seal-pos" />
    </>
  )
}

function ModernCommunityDecor() {
  return (
    <>
      <div className="cert-modern-accent" aria-hidden />
      <GoldSeal className="cert-modern-seal-pos" />
    </>
  )
}

function HeritagePremiumDecor() {
  return (
    <>
      <div className="cert-heritage-frame" aria-hidden />
      <div className="cert-heritage-frame-inner" aria-hidden />
      <div className="cert-heritage-accent-bar" aria-hidden />
      <div className="cert-heritage-corner cert-heritage-corner-tl" aria-hidden />
      <div className="cert-heritage-corner cert-heritage-corner-tr" aria-hidden />
      <div className="cert-heritage-corner cert-heritage-corner-bl" aria-hidden />
      <div className="cert-heritage-corner cert-heritage-corner-br" aria-hidden />
      <GoldSeal className="cert-heritage-seal-pos" />
    </>
  )
}

export function CertificateDocument({ data, id, className, scale = 1 }: CertificateDocumentProps) {
  const style = getCertificateDesignStyle(data.designStyleId)
  const styleClass =
    style?.id === 'modern-community'
      ? 'cert-style-modern-community'
      : style?.id === 'heritage-premium'
        ? 'cert-style-heritage-premium'
        : 'cert-style-classic-official'

  const sheet = (
    <article
      id={id}
      className={cn('certificate-sheet', styleClass)}
      aria-label="Certificate preview"
    >
      <SharedCertificateDecor designStyleId={data.designStyleId} />
      {style?.id === 'modern-community' && <ModernCommunityDecor />}
      {style?.id === 'heritage-premium' && <HeritagePremiumDecor />}
      {style?.id === 'classic-official' && <ClassicOfficialDecor />}

      <CertificateContent data={data} />

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

/** Hidden mount point cloned into for window.print(). Lives at app root. */
export function CertificatePrintPortal() {
  return <div id="certificate-print-portal" aria-hidden="true" />
}
