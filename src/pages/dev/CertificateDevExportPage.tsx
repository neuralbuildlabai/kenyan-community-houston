import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Eye, Printer } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CertificateDocument } from '@/components/certificates/CertificateDocument'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  cleanupCertificateExportState,
  downloadCertificatePdf,
  getCertificateSheetElement,
  printCertificate,
  CERTIFICATE_PRINT_ROOT_ID,
} from '@/lib/certificatePdf'
import {
  fetchActiveCertificateSignatures,
  resolveCertificateSignature,
  validateSignatureFile,
} from '@/lib/certificateSignatures'
import {
  CERTIFICATE_TEMPLATES,
  createDefaultCertificateForm,
  getCertificateTemplate,
  getLegacyDesignStyleForTemplate,
  type CertificateFormData,
  type CertificateSignatureMode,
} from '@/lib/certificateTemplates'
import type { CertificateSignature } from '@/lib/types'

const CERTIFICATE_DEV_PREVIEW_ID = 'kigh-certificate-dev-preview-target'
const CERTIFICATE_DEV_EXPORT_ID = 'kigh-certificate-dev-export-target'

function createDevDefaultForm(): CertificateFormData {
  const template = getCertificateTemplate('volunteer-appreciation') ?? CERTIFICATE_TEMPLATES[0]
  return {
    ...createDefaultCertificateForm(),
    templateId: template.id,
    designStyleId: getLegacyDesignStyleForTemplate(template.id),
    recipientName: 'Godfrey Maseno',
    issueDate: '2026-06-13',
    eventName: 'Family Fun Day June 13th 2026',
    signatureMode: 'none',
    signatureId: null,
    signatureImageUrl: null,
    signature1Name: 'Godfrey Maseno',
    signature1Title: 'KIGH Representative',
    signature2Name: '',
    signature2Title: template.defaultSignature2Title,
  }
}

function normalizeCertificateForm(form: CertificateFormData): CertificateFormData {
  return {
    ...form,
    designStyleId: getLegacyDesignStyleForTemplate(form.templateId),
    issueDate: form.issueDate || new Date().toISOString().slice(0, 10),
  }
}

async function waitForExportSheet(): Promise<HTMLElement | null> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  const printRoot = document.getElementById(CERTIFICATE_PRINT_ROOT_ID)
  if (!printRoot) return null
  return getCertificateSheetElement(CERTIFICATE_DEV_EXPORT_ID)
}

/** Local-only certificate export for development testing — not available in production. */
export function CertificateDevExportPage() {
  if (!import.meta.env.DEV) {
    return <Navigate to="/" replace />
  }

  return <CertificateDevExportPageContent />
}

function CertificateDevExportPageContent() {
  const [form, setForm] = useState<CertificateFormData>(createDevDefaultForm)
  const [signatures, setSignatures] = useState<CertificateSignature[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const modalPreviewContainerRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(0.55)
  const [modalPreviewScale, setModalPreviewScale] = useState(0.75)

  const displayForm = useMemo(() => normalizeCertificateForm(form), [form])
  const template = useMemo(() => getCertificateTemplate(displayForm.templateId), [displayForm.templateId])

  const resolvedSignature = useMemo(
    () =>
      resolveCertificateSignature(
        displayForm.signatureMode,
        displayForm.signatureId,
        signatures,
        displayForm.signatureImageUrl
          ? {
              signerName: displayForm.signature1Name,
              signerTitle: displayForm.signature1Title,
              imageUrl: displayForm.signatureImageUrl,
            }
          : null
      ),
    [
      displayForm.signatureMode,
      displayForm.signatureId,
      displayForm.signatureImageUrl,
      displayForm.signature1Name,
      displayForm.signature1Title,
      signatures,
    ]
  )

  const activeSignatures = useMemo(
    () => signatures.filter((signature) => signature.is_active),
    [signatures]
  )

  const certificateDocProps = {
    data: displayForm,
    resolvedSignature,
  }

  useEffect(() => {
    return () => {
      cleanupCertificateExportState()
    }
  }, [])

  useEffect(() => {
    void fetchActiveCertificateSignatures()
      .then(setSignatures)
      .catch(() => {
        setSignatures([])
      })
  }, [])

  useEffect(() => {
    function updateScale() {
      const el = previewContainerRef.current
      if (!el) return
      const available = el.clientWidth - 16
      const sheetWidthInPx = 11 * 96
      const next = Math.min(1, Math.max(0.35, available / sheetWidthInPx))
      setPreviewScale(next)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  useEffect(() => {
    if (!isPreviewOpen) return

    function updateModalScale() {
      const el = modalPreviewContainerRef.current
      const availableWidth = el ? el.clientWidth - 24 : window.innerWidth * 0.88
      const availableHeight = el ? el.clientHeight - 24 : window.innerHeight * 0.75
      const sheetWidthInPx = 11 * 96
      const sheetHeightInPx = 8.5 * 96
      const scaleByWidth = availableWidth / sheetWidthInPx
      const scaleByHeight = availableHeight / sheetHeightInPx
      const next = Math.min(1, Math.max(0.45, Math.min(scaleByWidth, scaleByHeight)))
      setModalPreviewScale(next)
    }

    updateModalScale()
    window.addEventListener('resize', updateModalScale)
    return () => window.removeEventListener('resize', updateModalScale)
  }, [isPreviewOpen])

  function updateForm(patch: Partial<CertificateFormData>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function handleTemplateChange(templateId: string) {
    const next = getCertificateTemplate(templateId)
    if (!next) return
    setForm((prev) => ({
      ...prev,
      templateId,
      designStyleId: getLegacyDesignStyleForTemplate(templateId),
      signature1Title: prev.signature1Title || next.defaultSignature1Title,
      signature2Title: next.defaultSignature2Title,
    }))
  }

  function handleSignatureModeChange(mode: CertificateSignatureMode) {
    if (mode === 'selected' && !form.signatureId && activeSignatures.length > 0) {
      const defaultSig = activeSignatures.find((signature) => signature.is_default) ?? activeSignatures[0]
      updateForm({
        signatureMode: mode,
        signatureId: defaultSig.id,
        signatureImageUrl: null,
      })
      return
    }
    updateForm({ signatureMode: mode, signatureImageUrl: null })
  }

  function validateRecipientOnly(): boolean {
    if (!form.recipientName.trim()) {
      toast.error('Please enter the recipient name.')
      return false
    }
    return true
  }

  function handlePreview() {
    if (!validateRecipientOnly()) return
    setIsPreviewOpen(true)
  }

  async function handlePrint() {
    if (!validateRecipientOnly()) return
    setIsPrinting(true)
    try {
      await printCertificate(CERTIFICATE_DEV_EXPORT_ID)
    } catch (error) {
      console.error('[certificate-print] failed', error)
      const message = error instanceof Error ? error.message : 'Print preview failed. Please try again.'
      toast.error(message)
    } finally {
      setIsPrinting(false)
      cleanupCertificateExportState()
    }
  }

  async function handleDownloadPdf() {
    if (!validateRecipientOnly()) return
    const data = normalizeCertificateForm(form)
    const tmpl = getCertificateTemplate(data.templateId)
    setIsDownloading(true)
    try {
      const sheet = await waitForExportSheet()
      if (!sheet) {
        throw new Error('Certificate export sheet not ready')
      }
      await downloadCertificatePdf(sheet, data.recipientName.trim(), tmpl?.category ?? 'Certificate', {
        templateId: data.templateId,
        designStyleId: data.designStyleId,
        recipientNamePresent: data.recipientName.trim().length > 0,
      })
      toast.success('PDF downloaded.')
    } catch (error) {
      console.error('[certificate-pdf] failed', error)
      toast.error('PDF download failed. Please use Print or try again.')
    } finally {
      setIsDownloading(false)
      cleanupCertificateExportState()
    }
  }

  async function handleLocalSignatureUpload(file: File | null) {
    if (!file) return
    const validationError = validateSignatureFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read signature image.'))
      reader.readAsDataURL(file)
    })

    updateForm({ signatureImageUrl: dataUrl })
    toast.success('Local signature image loaded.')
  }

  return (
    <>
      {createPortal(
        <div id={CERTIFICATE_PRINT_ROOT_ID} className="certificate-print-root" aria-hidden="true">
          <CertificateDocument
            id={CERTIFICATE_DEV_EXPORT_ID}
            {...certificateDocProps}
            scale={1}
            printSafe
          />
        </div>,
        document.body
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="no-print max-w-[96vw] w-[96vw] max-h-[96vh] overflow-hidden flex flex-col gap-4 p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Certificate Preview</DialogTitle>
            <DialogDescription>{template?.category ?? 'Certificate'}</DialogDescription>
          </DialogHeader>

          <div
            ref={modalPreviewContainerRef}
            className="flex-1 min-h-0 overflow-auto flex justify-center items-start rounded-md border bg-muted/30 p-4"
          >
            <CertificateDocument {...certificateDocProps} scale={modalPreviewScale} />
          </div>

          <DialogFooter className="shrink-0 gap-2 sm:gap-2">
            <Button type="button" onClick={() => void handlePrint()} disabled={isPrinting}>
              <Printer className="h-4 w-4 mr-1.5" />
              {isPrinting ? 'Opening…' : 'Print'}
            </Button>
            <Button type="button" onClick={() => void handleDownloadPdf()} disabled={isDownloading}>
              <Download className="h-4 w-4 mr-1.5" />
              {isDownloading ? 'Generating…' : 'Download PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-muted/40 py-8 px-4">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-lg border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            Development-only certificate export page. Do not deploy as a public feature.
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Certificate Export (Dev)</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Preview, print, and download KIGH certificates locally without admin login. Records are not saved
              from this page.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
            <Card className="no-print">
              <CardHeader>
                <CardTitle className="text-lg">Certificate details</CardTitle>
                <CardDescription>Edit fields and export using print-safe output.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dev-cert-template">Certificate type</Label>
                  <Select value={form.templateId} onValueChange={handleTemplateChange}>
                    <SelectTrigger id="dev-cert-template">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CERTIFICATE_TEMPLATES.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-cert-recipient">Recipient name</Label>
                  <Input
                    id="dev-cert-recipient"
                    value={form.recipientName}
                    onChange={(event) => updateForm({ recipientName: event.target.value })}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-cert-date">Date</Label>
                  <Input
                    id="dev-cert-date"
                    type="date"
                    value={form.issueDate}
                    onChange={(event) => updateForm({ issueDate: event.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-cert-event">Event / program (optional)</Label>
                  <Input
                    id="dev-cert-event"
                    value={form.eventName}
                    onChange={(event) => updateForm({ eventName: event.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-cert-signature-mode">Signature</Label>
                  <Select
                    value={form.signatureMode}
                    onValueChange={(value) => handleSignatureModeChange(value as CertificateSignatureMode)}
                  >
                    <SelectTrigger id="dev-cert-signature-mode">
                      <SelectValue placeholder="Signature option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No signature image (name/title only)</SelectItem>
                      <SelectItem value="default">Use default saved signature</SelectItem>
                      <SelectItem value="selected">Select saved signature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.signatureMode === 'selected' ? (
                  <div className="space-y-2">
                    <Label htmlFor="dev-cert-signature-id">Saved signature</Label>
                    <Select
                      value={form.signatureId ?? ''}
                      onValueChange={(value) => updateForm({ signatureId: value || null, signatureImageUrl: null })}
                    >
                      <SelectTrigger id="dev-cert-signature-id">
                        <SelectValue placeholder="Choose signature" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSignatures.length === 0 ? (
                          <SelectItem value="__none" disabled>
                            No saved signatures available
                          </SelectItem>
                        ) : (
                          activeSignatures.map((signature) => (
                            <SelectItem key={signature.id} value={signature.id}>
                              {signature.signer_name}
                              {signature.is_default ? ' (default)' : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dev-sig1-name">Signer name</Label>
                    <Input
                      id="dev-sig1-name"
                      value={form.signature1Name}
                      onChange={(event) => updateForm({ signature1Name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dev-sig1-title">Signer title</Label>
                    <Input
                      id="dev-sig1-title"
                      value={form.signature1Title}
                      onChange={(event) => updateForm({ signature1Title: event.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-sig-upload">Upload signature image (local, optional)</Label>
                  <Input
                    id="dev-sig-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(event) => void handleLocalSignatureUpload(event.target.files?.[0] ?? null)}
                  />
                  {form.signatureImageUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 text-xs"
                      onClick={() => updateForm({ signatureImageUrl: null })}
                    >
                      Remove uploaded signature image
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={handlePreview}>
                    <Eye className="h-4 w-4 mr-1.5" />
                    Preview
                  </Button>
                  <Button type="button" onClick={() => void handlePrint()} disabled={isPrinting}>
                    <Printer className="h-4 w-4 mr-1.5" />
                    {isPrinting ? 'Opening…' : 'Print'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void handleDownloadPdf()} disabled={isDownloading}>
                    <Download className="h-4 w-4 mr-1.5" />
                    {isDownloading ? 'Generating…' : 'Download PDF'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="min-w-0">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between no-print">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Live preview</h2>
                <span className="text-xs text-muted-foreground">US Letter · Landscape · 11 × 8.5 in</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground no-print">
                For best results, print from the downloaded PDF using high-quality color settings on 65–80 lb ivory
                or linen certificate paper.
              </p>
              <div
                ref={previewContainerRef}
                className="overflow-x-auto rounded-lg border bg-white p-4 flex justify-center min-h-[280px]"
              >
                <CertificateDocument
                  id={CERTIFICATE_DEV_PREVIEW_ID}
                  {...certificateDocProps}
                  scale={previewScale}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
