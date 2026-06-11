import { cn } from '@/lib/utils'
import { KIGH_LOGO_ALT, KIGH_LOGO_PATH } from '@/lib/kighAssets'
import {
  CERTIFICATE_FOOTER_TEXT,
  formatCertificateDate,
  getCertificateDesignStyle,
  getCertificateTemplate,
  type CertificateFormData,
} from '@/lib/certificateTemplates'
import './certificate.css'

type CertificateDocumentProps = {
  data: CertificateFormData
  id?: string
  className?: string
  scale?: number
}

function CertificateLogo({ heightIn = '0.72in', className }: { heightIn?: string; className?: string }) {
  return (
    <img
      src={KIGH_LOGO_PATH}
      alt={KIGH_LOGO_ALT}
      className={cn('cert-logo', className)}
      style={{ height: heightIn, width: 'auto', maxWidth: '2.2in' }}
      crossOrigin="anonymous"
    />
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

      <p className="cert-presented-label">{template.presentedToLabel}</p>
      <p className="cert-recipient">{recipient}</p>

      {data.eventName.trim() ? (
        <p className="cert-event">In recognition of: {data.eventName.trim()}</p>
      ) : null}

      <p className="cert-body">{template.bodyText}</p>
      <p className="cert-closing">{template.closingLine}</p>

      <div className="cert-meta-row">
        <div className="cert-date-block">
          <div className="cert-date-label">Date</div>
          <div className="cert-date-value">{displayDate || '—'}</div>
        </div>

        <div className="cert-signatures">
          <div className="cert-signature">
            <div className="cert-signature-line">{sig1Name}</div>
            <div className="cert-signature-title">{data.signature1Title.trim() || 'Signature Title'}</div>
          </div>
          <div className="cert-signature">
            <div className="cert-signature-line">{sig2Name}</div>
            <div className="cert-signature-title">{data.signature2Title.trim() || 'Signature Title'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClassicOfficialDecor() {
  return (
    <>
      <div className="cert-classic-ribbon" aria-hidden />
      <div className="cert-classic-seal" aria-hidden>
        <div className="cert-classic-seal-inner">KIGH</div>
      </div>
    </>
  )
}

function ModernCommunityDecor() {
  return (
    <>
      <div className="cert-modern-accent" aria-hidden />
      <div className="cert-modern-watermark" aria-hidden>
        <img src={KIGH_LOGO_PATH} alt="" crossOrigin="anonymous" />
      </div>
    </>
  )
}

function HeritagePremiumDecor() {
  return (
    <>
      <div className="cert-heritage-pattern" aria-hidden />
      <div className="cert-heritage-frame" aria-hidden />
      <div className="cert-heritage-crest" aria-hidden />
      <div className="cert-heritage-corner cert-heritage-corner-tl" aria-hidden />
      <div className="cert-heritage-corner cert-heritage-corner-tr" aria-hidden />
      <div className="cert-heritage-corner cert-heritage-corner-bl" aria-hidden />
      <div className="cert-heritage-corner cert-heritage-corner-br" aria-hidden />
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

  return (
    <div
      className={cn('certificate-preview-scale', className)}
      style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
    >
      <article
        id={id}
        className={cn('certificate-sheet', styleClass)}
        aria-label="Certificate preview"
      >
        {style?.id === 'modern-community' && <ModernCommunityDecor />}
        {style?.id === 'heritage-premium' && <HeritagePremiumDecor />}
        {style?.id === 'classic-official' && <ClassicOfficialDecor />}

        <CertificateContent data={data} />

        <footer className="cert-footer">{CERTIFICATE_FOOTER_TEXT}</footer>
      </article>
    </div>
  )
}

/** Hidden mount point cloned into for window.print(). Lives at app root. */
export function CertificatePrintPortal() {
  return <div id="certificate-print-portal" aria-hidden="true" />
}
