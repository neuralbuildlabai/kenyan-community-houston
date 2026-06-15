import { CertificateDocument } from '@/components/certificates/CertificateDocument'
import {
  CERTIFICATE_TEMPLATES,
  createDefaultCertificateForm,
} from '@/lib/certificateTemplates'

const SAMPLE = {
  ...createDefaultCertificateForm(),
  recipientName: 'Jane Wambui',
  issueDate: '2026-06-11',
  signature1Title: 'KIGH President / Chairperson',
}

/** Dev-only page for reviewing all certificate templates side by side. */
export function CertificatePreviewPage() {
  return (
    <div className="min-h-screen bg-muted/40 py-10 px-4 space-y-12">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Certificate Template Preview (Dev)</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Review all six KIGH premium certificate templates. This page is only available in development.
        </p>
      </div>

      {CERTIFICATE_TEMPLATES.map((template) => (
        <section key={template.id} className="space-y-3">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {template.category}
          </h2>
          <div className="flex justify-center overflow-x-auto rounded-lg border bg-white p-6 shadow-sm">
            <CertificateDocument
              data={{ ...SAMPLE, templateId: template.id }}
              scale={0.72}
            />
          </div>
        </section>
      ))}
    </div>
  )
}
