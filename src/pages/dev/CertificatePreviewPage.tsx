import { CertificateDocument } from '@/components/certificates/CertificateDocument'
import { createDefaultCertificateForm } from '@/lib/certificateTemplates'
import type { CertificateDesignStyleId } from '@/lib/certificateTemplates'

const STYLES: CertificateDesignStyleId[] = [
  'modern-community',
  'classic-official',
  'heritage-premium',
]

const STYLE_LABELS: Record<CertificateDesignStyleId, string> = {
  'modern-community': 'Modern Community',
  'classic-official': 'Classic Official',
  'heritage-premium': 'Heritage Premium',
}

/** Dev-only page for reviewing all certificate styles side by side. */
export function CertificatePreviewPage() {
  const base = {
    ...createDefaultCertificateForm(),
    templateId: 'community-speaker',
    recipientName: 'Jane Wambui',
    issueDate: '2026-06-11',
    signature1Title: 'KIGH President / Chairperson',
    signature2Title: 'KIGH Secretary / Community Representative',
  }

  return (
    <div className="min-h-screen bg-muted/40 py-10 px-4 space-y-12">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Certificate Style Preview (Dev)</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Review all three KIGH certificate designs. This page is only available in development.
        </p>
      </div>

      {STYLES.map((styleId) => (
        <section key={styleId} className="space-y-3">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {STYLE_LABELS[styleId]}
          </h2>
          <div className="flex justify-center overflow-x-auto rounded-lg border bg-white p-6 shadow-sm">
            <CertificateDocument
              data={{ ...base, designStyleId: styleId }}
              scale={0.72}
            />
          </div>
        </section>
      ))}
    </div>
  )
}
