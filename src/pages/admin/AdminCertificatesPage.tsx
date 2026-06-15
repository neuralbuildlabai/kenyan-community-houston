import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import {
  Download,
  Eye,
  Printer,
  RotateCcw,
  Save,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { SEOHead } from '@/components/SEOHead'
import { CertificateDocument } from '@/components/certificates/CertificateDocument'
import { CertificateSignatureLibrary } from '@/components/certificates/CertificateSignatureLibrary'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  cleanupCertificateExportState,
  downloadCertificatePdf,
  getCertificateSheetElement,
  printCertificate,
  CERTIFICATE_PRINT_ROOT_ID,
} from '@/lib/certificatePdf'
import {
  fetchAllCertificateSignatures,
  resolveCertificateSignature,
} from '@/lib/certificateSignatures'
import {
  CERTIFICATE_TEMPLATES,
  createDefaultCertificateForm,
  getCertificateTemplate,
  getLegacyDesignStyleForTemplate,
  type CertificateFormData,
  type CertificateSignatureMode,
} from '@/lib/certificateTemplates'
import { formatDateShort } from '@/lib/utils'
import type { CertificateRecord, CertificateSignature } from '@/lib/types'

const CERTIFICATE_PRINT_ID = 'kigh-certificate-print-target'
const CERTIFICATE_EXPORT_ID = 'kigh-certificate-export-target'

function recordToForm(record: CertificateRecord): CertificateFormData {
  return {
    templateId: record.template_id,
    designStyleId: getLegacyDesignStyleForTemplate(record.template_id),
    recipientName: record.recipient_name,
    issueDate: record.issue_date,
    eventName: record.event_name ?? '',
    signatureMode: record.signature_mode ?? 'none',
    signatureId: record.signature_id ?? null,
    signatureImageUrl: record.signature_image_url ?? null,
    signature1Name: record.signature_1_name ?? '',
    signature1Title: record.signature_1_title ?? '',
    signature2Name: record.signature_2_name ?? '',
    signature2Title: record.signature_2_title ?? '',
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
  return getCertificateSheetElement(CERTIFICATE_EXPORT_ID)
}

export function AdminCertificatesPage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState<CertificateFormData>(createDefaultCertificateForm)
  const [signatures, setSignatures] = useState<CertificateSignature[]>([])
  const [signaturesLoading, setSignaturesLoading] = useState(true)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [records, setRecords] = useState<CertificateRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [historySearch, setHistorySearch] = useState('')
  const [historyCategory, setHistoryCategory] = useState('all')
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
    () => signatures.filter((s) => s.is_active),
    [signatures]
  )

  const getCurrentCertificateData = useCallback((): CertificateFormData => displayForm, [displayForm])

  const loadSignatures = useCallback(async () => {
    setSignaturesLoading(true)
    try {
      setSignatures(await fetchAllCertificateSignatures())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load signatures.')
      setSignatures([])
    } finally {
      setSignaturesLoading(false)
    }
  }, [])

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true)
    const { data, error } = await supabase
      .from('certificate_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      toast.error(error.message)
      setRecords([])
    } else {
      setRecords((data as CertificateRecord[]) ?? [])
    }
    setRecordsLoading(false)
  }, [])

  useEffect(() => {
    void loadRecords()
    void loadSignatures()
  }, [loadRecords, loadSignatures])

  useEffect(() => {
    return () => {
      cleanupCertificateExportState()
    }
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
      const availableHeight = window.innerHeight * 0.58
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
      signature1Title: next.defaultSignature1Title,
      signature2Title: next.defaultSignature2Title,
    }))
  }

  function handleSignatureModeChange(mode: CertificateSignatureMode) {
    if (mode === 'selected' && !form.signatureId && activeSignatures.length > 0) {
      const defaultSig = activeSignatures.find((s) => s.is_default) ?? activeSignatures[0]
      updateForm({
        signatureMode: mode,
        signatureId: defaultSig.id,
        signatureImageUrl: null,
      })
      return
    }
    updateForm({ signatureMode: mode, signatureImageUrl: null })
  }

  function handleReset() {
    setForm(createDefaultCertificateForm())
    setIsPreviewOpen(false)
  }

  function validateRecipientOnly(): boolean {
    if (!form.recipientName.trim()) {
      toast.error('Please enter the recipient name.')
      return false
    }
    return true
  }

  function validateForSave(): boolean {
    if (!validateRecipientOnly()) return false
    if (!form.issueDate) {
      toast.error('Please select the certificate date.')
      return false
    }
    if (form.signatureMode === 'selected' && !form.signatureId) {
      toast.error('Please select a saved signature.')
      return false
    }
    if (form.signatureMode === 'default' && !activeSignatures.some((s) => s.is_default)) {
      toast.error('No default signature is set. Choose a saved signature or use a blank line.')
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
      await printCertificate(CERTIFICATE_EXPORT_ID)
    } catch (e) {
      console.error('[certificate-print] failed', e)
      const message = e instanceof Error ? e.message : 'Print preview failed. Please try again.'
      toast.error(message)
    } finally {
      setIsPrinting(false)
      cleanupCertificateExportState()
    }
  }

  async function handleDownloadPdf() {
    if (!validateRecipientOnly()) return
    const data = getCurrentCertificateData()
    const tmpl = getCertificateTemplate(data.templateId)
    setIsDownloading(true)
    try {
      const sheet = await waitForExportSheet()
      if (!sheet) {
        throw new Error('Certificate export sheet not ready')
      }
      await downloadCertificatePdf(
        sheet,
        data.recipientName.trim(),
        tmpl?.category ?? 'Certificate',
        {
          templateId: data.templateId,
          designStyleId: data.designStyleId,
          recipientNamePresent: data.recipientName.trim().length > 0,
        }
      )
      toast.success('PDF downloaded.')
    } catch (e) {
      console.error('[certificate-pdf] failed', e)
      toast.error('PDF download failed. Please use Print or try again.')
    } finally {
      setIsDownloading(false)
      cleanupCertificateExportState()
    }
  }

  async function handleSaveRecord() {
    if (!validateForSave()) return
    if (!user) {
      toast.error('You must be signed in to save records.')
      return
    }
    setIsSaving(true)

    const sig = resolvedSignature
    const signatureImageUrl =
      sig?.image_url ??
      (form.signatureMode !== 'none' && form.signatureImageUrl ? form.signatureImageUrl : null)

    const payload = {
      template_id: form.templateId,
      design_style: getLegacyDesignStyleForTemplate(form.templateId),
      recipient_name: form.recipientName.trim(),
      certificate_type: template?.category ?? form.templateId,
      event_name: form.eventName.trim() || null,
      issue_date: form.issueDate,
      signature_mode: form.signatureMode,
      signature_id: form.signatureMode === 'selected' ? form.signatureId : (sig?.id !== 'snapshot' ? sig?.id ?? null : form.signatureId),
      signature_image_url: signatureImageUrl,
      signature_1_name: (sig?.signer_name ?? form.signature1Name.trim()) || null,
      signature_1_title: (sig?.signer_title ?? form.signature1Title.trim()) || null,
      signature_2_name: form.signature2Name.trim() || null,
      signature_2_title: form.signature2Title.trim() || null,
      created_by: user.id,
    }
    const { error } = await supabase.from('certificate_records').insert(payload)
    setIsSaving(false)
    if (error) {
      console.error('Certificate save failed:', error)
      toast.error('Certificate record could not be saved. You can still print or download the certificate.')
      return
    }
    toast.success('Certificate record saved.')
    void loadRecords()
  }

  function loadRecordIntoForm(record: CertificateRecord) {
    setForm(recordToForm(record))
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast.success('Certificate loaded for reprint.')
  }

  async function loadRecordAndPrint(record: CertificateRecord) {
    flushSync(() => {
      setForm(recordToForm(record))
    })
    toast.success('Certificate loaded for reprint.')
    setIsPrinting(true)
    try {
      await printCertificate(CERTIFICATE_EXPORT_ID)
    } catch (e) {
      console.error('[certificate-print] failed', e)
      const message = e instanceof Error ? e.message : 'Print preview failed. Please try again.'
      toast.error(message)
    } finally {
      setIsPrinting(false)
      cleanupCertificateExportState()
    }
  }

  async function loadRecordAndPdf(record: CertificateRecord) {
    setForm(recordToForm(record))
    const tmpl = getCertificateTemplate(record.template_id)
    setIsDownloading(true)
    try {
      const sheet = await waitForExportSheet()
      if (!sheet) {
        throw new Error('Certificate export sheet not ready')
      }
      await downloadCertificatePdf(
        sheet,
        record.recipient_name,
        tmpl?.category ?? record.certificate_type,
        {
          templateId: record.template_id,
          designStyleId: getLegacyDesignStyleForTemplate(record.template_id),
          recipientNamePresent: record.recipient_name.trim().length > 0,
        }
      )
      toast.success('PDF downloaded.')
    } catch (e) {
      console.error('[certificate-pdf] failed', e)
      toast.error('PDF download failed. Please use Print or try again.')
    } finally {
      setIsDownloading(false)
      cleanupCertificateExportState()
    }
  }

  const filteredRecords = records.filter((r) => {
    if (historyCategory !== 'all' && r.template_id !== historyCategory) return false
    if (!historySearch.trim()) return true
    const q = historySearch.toLowerCase()
    return (
      r.recipient_name.toLowerCase().includes(q) ||
      r.certificate_type.toLowerCase().includes(q) ||
      (r.event_name?.toLowerCase().includes(q) ?? false) ||
      r.issue_date.includes(q)
    )
  })

  const createdByLabel = (record: CertificateRecord) => {
    if (record.created_by === user?.id && profile?.full_name) return profile.full_name
    return record.created_by ? `${record.created_by.slice(0, 8)}…` : '—'
  }

  const certificateDocProps = {
    data: displayForm,
    resolvedSignature,
  }

  return (
    <>
      <SEOHead title="Certificates & Acknowledgements" noIndex />

      {createPortal(
        <div id={CERTIFICATE_PRINT_ROOT_ID} className="certificate-print-root" aria-hidden="true">
          <CertificateDocument id={CERTIFICATE_EXPORT_ID} {...certificateDocProps} scale={1} />
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
            <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
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

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certificates & Acknowledgements</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Generate official KIGH certificates for volunteers, speakers, donors, youth leaders, vendors, and
            community partners. Each category has its own premium template design.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
          <Card className="no-print">
            <CardHeader>
              <CardTitle className="text-lg">Certificate details</CardTitle>
              <CardDescription>
                Select a certificate type, enter recipient details, and choose a signature option.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cert-template">Certificate type</Label>
                <Select value={form.templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger id="cert-template">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CERTIFICATE_TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {template ? (
                  <p className="text-xs text-muted-foreground">
                    {template.title} {template.subtitle}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cert-recipient">Recipient name</Label>
                <Input
                  id="cert-recipient"
                  value={form.recipientName}
                  onChange={(e) => updateForm({ recipientName: e.target.value })}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cert-date">Date</Label>
                <Input
                  id="cert-date"
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => updateForm({ issueDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cert-event">Event / program (optional)</Label>
                <Input
                  id="cert-event"
                  value={form.eventName}
                  onChange={(e) => updateForm({ eventName: e.target.value })}
                  placeholder="e.g. Annual Community Forum 2026"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cert-signature-mode">Signature</Label>
                <Select
                  value={form.signatureMode}
                  onValueChange={(v) => handleSignatureModeChange(v as CertificateSignatureMode)}
                >
                  <SelectTrigger id="cert-signature-mode">
                    <SelectValue placeholder="Signature option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No signature (blank line)</SelectItem>
                    <SelectItem value="default">Use default signature</SelectItem>
                    <SelectItem value="selected">Select saved signature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.signatureMode === 'selected' ? (
                <div className="space-y-2">
                  <Label htmlFor="cert-signature-id">Saved signature</Label>
                  <Select
                    value={form.signatureId ?? ''}
                    onValueChange={(v) => updateForm({ signatureId: v || null, signatureImageUrl: null })}
                  >
                    <SelectTrigger id="cert-signature-id">
                      <SelectValue placeholder="Choose signature" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSignatures.map((sig) => (
                        <SelectItem key={sig.id} value={sig.id}>
                          {sig.signer_name}
                          {sig.is_default ? ' (default)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {form.signatureMode === 'none' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sig1-name">Signer name (optional)</Label>
                    <Input
                      id="sig1-name"
                      value={form.signature1Name}
                      onChange={(e) => updateForm({ signature1Name: e.target.value })}
                      placeholder="Leave blank for empty line"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sig1-title">Signer title</Label>
                    <Input
                      id="sig1-title"
                      value={form.signature1Title}
                      onChange={(e) => updateForm({ signature1Title: e.target.value })}
                    />
                  </div>
                </div>
              ) : null}

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
                <Button type="button" variant="outline" onClick={() => void handleSaveRecord()} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {isSaving ? 'Saving…' : 'Save record'}
                </Button>
                <Button type="button" variant="ghost" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between no-print">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Live preview</h2>
              <span className="text-xs text-muted-foreground">US Letter · Landscape · 11 × 8.5 in</span>
            </div>
            <div
              ref={previewContainerRef}
              className="overflow-x-auto rounded-lg border bg-muted/30 p-4 flex justify-center min-h-[280px]"
            >
              <CertificateDocument id={CERTIFICATE_PRINT_ID} {...certificateDocProps} scale={previewScale} />
            </div>
          </div>
        </div>

        <Card className="no-print">
          <CardHeader>
            <CardTitle className="text-lg">Signature library</CardTitle>
            <CardDescription>
              Upload and manage authorized signatory images. Only admins can access this library.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signaturesLoading ? (
              <p className="text-sm text-muted-foreground">Loading signatures…</p>
            ) : (
              <CertificateSignatureLibrary
                signatures={signatures}
                onChanged={() => void loadSignatures()}
                createdBy={user?.id ?? null}
              />
            )}
          </CardContent>
        </Card>

        <Card className="no-print">
          <CardHeader>
            <CardTitle className="text-lg">Issued certificate history</CardTitle>
            <CardDescription>Optional records of certificates generated by admins.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search recipient, type, event, or date…"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
              <Select value={historyCategory} onValueChange={setHistoryCategory}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {CERTIFICATE_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Certificate type</TableHead>
                    <TableHead>Date issued</TableHead>
                    <TableHead>Event / program</TableHead>
                    <TableHead>Created by</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No certificate records yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.recipient_name}</TableCell>
                        <TableCell>{record.certificate_type}</TableCell>
                        <TableCell>{formatDateShort(record.issue_date)}</TableCell>
                        <TableCell>{record.event_name ?? '—'}</TableCell>
                        <TableCell>{createdByLabel(record)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button type="button" size="sm" variant="ghost" onClick={() => loadRecordIntoForm(record)}>
                              View
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void loadRecordAndPrint(record)}
                              disabled={isPrinting}
                            >
                              Reprint
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void loadRecordAndPdf(record)}
                              disabled={isDownloading}
                            >
                              PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
