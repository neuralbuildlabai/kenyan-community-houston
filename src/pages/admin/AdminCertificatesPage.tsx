import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Button } from '@/components/ui/button'
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
import { downloadCertificatePdf, getCertificateSheetElement, printCertificate } from '@/lib/certificatePdf'
import {
  CERTIFICATE_DESIGN_STYLES,
  CERTIFICATE_TEMPLATES,
  createDefaultCertificateForm,
  getCertificateTemplate,
  type CertificateFormData,
  type CertificateDesignStyleId,
} from '@/lib/certificateTemplates'
import { formatDateShort } from '@/lib/utils'
import type { CertificateRecord } from '@/lib/types'

const CERTIFICATE_PRINT_ID = 'kigh-certificate-print-target'

function recordToForm(record: CertificateRecord): CertificateFormData {
  return {
    templateId: record.template_id,
    designStyleId: record.design_style as CertificateDesignStyleId,
    recipientName: record.recipient_name,
    issueDate: record.issue_date,
    eventName: record.event_name ?? '',
    signature1Name: record.signature_1_name ?? '',
    signature1Title: record.signature_1_title ?? '',
    signature2Name: record.signature_2_name ?? '',
    signature2Title: record.signature_2_title ?? '',
  }
}

async function waitForCertificateSheet(): Promise<HTMLElement | null> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  return getCertificateSheetElement(CERTIFICATE_PRINT_ID)
}

export function AdminCertificatesPage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState<CertificateFormData>(createDefaultCertificateForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [records, setRecords] = useState<CertificateRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [historySearch, setHistorySearch] = useState('')
  const [historyCategory, setHistoryCategory] = useState('all')
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(0.55)

  const template = useMemo(() => getCertificateTemplate(form.templateId), [form.templateId])

  const getCurrentCertificateData = useCallback((): CertificateFormData => form, [form])

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
  }, [loadRecords])

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

  function updateForm(patch: Partial<CertificateFormData>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function handleTemplateChange(templateId: string) {
    const next = getCertificateTemplate(templateId)
    if (!next) return
    setForm((prev) => ({
      ...prev,
      templateId,
      signature1Title: next.defaultSignature1Title,
      signature2Title: next.defaultSignature2Title,
    }))
  }

  function handleReset() {
    setForm(createDefaultCertificateForm())
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
    return true
  }

  function handlePreview() {
    if (!validateRecipientOnly()) return
    toast.success('Certificate preview updated.')
  }

  async function handlePrint() {
    if (!validateRecipientOnly()) return
    setIsPrinting(true)
    try {
      const sheet = await waitForCertificateSheet()
      if (!sheet) {
        throw new Error('Certificate preview not ready')
      }
      await printCertificate(sheet)
    } catch (e) {
      console.error('Certificate print failed:', e)
      toast.error('Print preview failed. Please try again.')
    } finally {
      setIsPrinting(false)
    }
  }

  async function handleDownloadPdf() {
    if (!validateRecipientOnly()) return
    const data = getCurrentCertificateData()
    const tmpl = getCertificateTemplate(data.templateId)
    setIsDownloading(true)
    try {
      const sheet = await waitForCertificateSheet()
      if (!sheet) {
        throw new Error('Certificate preview not ready')
      }
      await downloadCertificatePdf(
        sheet,
        data.recipientName.trim(),
        tmpl?.category ?? 'Certificate'
      )
      toast.success('PDF downloaded.')
    } catch (e) {
      console.error('Certificate PDF download failed:', e)
      toast.error('PDF download failed. Please try Print instead.')
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleSaveRecord() {
    if (!validateForSave()) return
    if (!user) {
      toast.error('You must be signed in to save records.')
      return
    }
    setIsSaving(true)
    const payload = {
      template_id: form.templateId,
      design_style: form.designStyleId,
      recipient_name: form.recipientName.trim(),
      certificate_type: template?.category ?? form.templateId,
      event_name: form.eventName.trim() || null,
      issue_date: form.issueDate,
      signature_1_name: form.signature1Name.trim() || null,
      signature_1_title: form.signature1Title.trim() || null,
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
    setForm(recordToForm(record))
    toast.success('Certificate loaded for reprint.')
    setIsPrinting(true)
    try {
      const sheet = await waitForCertificateSheet()
      if (!sheet) {
        throw new Error('Certificate preview not ready')
      }
      await printCertificate(sheet)
    } catch (e) {
      console.error('Certificate reprint failed:', e)
      toast.error('Print preview failed. Please try again.')
    } finally {
      setIsPrinting(false)
    }
  }

  async function loadRecordAndPdf(record: CertificateRecord) {
    setForm(recordToForm(record))
    const tmpl = getCertificateTemplate(record.template_id)
    setIsDownloading(true)
    try {
      const sheet = await waitForCertificateSheet()
      if (!sheet) {
        throw new Error('Certificate preview not ready')
      }
      await downloadCertificatePdf(
        sheet,
        record.recipient_name,
        tmpl?.category ?? record.certificate_type
      )
      toast.success('PDF downloaded.')
    } catch (e) {
      console.error('Certificate PDF download failed:', e)
      toast.error('PDF download failed. Please try Print instead.')
    } finally {
      setIsDownloading(false)
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

  return (
    <>
      <SEOHead title="Certificates & Acknowledgements" noIndex />

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certificates & Acknowledgements</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Generate official KIGH certificates for volunteers, speakers, donors, youth leaders, vendors, and
            community partners. Select a template, enter recipient details, preview, then print or download.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
          {/* Form */}
          <Card className="no-print">
            <CardHeader>
              <CardTitle className="text-lg">Certificate details</CardTitle>
              <CardDescription>Wording is pre-filled — only edit recipient, date, and signatures.</CardDescription>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="cert-style">Design style</Label>
                <Select
                  value={form.designStyleId}
                  onValueChange={(v) => updateForm({ designStyleId: v as CertificateDesignStyleId })}
                >
                  <SelectTrigger id="cert-style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {CERTIFICATE_DESIGN_STYLES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {CERTIFICATE_DESIGN_STYLES.find((s) => s.id === form.designStyleId)?.description}
                </p>
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sig1-name">Signature 1 name</Label>
                  <Input
                    id="sig1-name"
                    value={form.signature1Name}
                    onChange={(e) => updateForm({ signature1Name: e.target.value })}
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sig1-title">Signature 1 title</Label>
                  <Input
                    id="sig1-title"
                    value={form.signature1Title}
                    onChange={(e) => updateForm({ signature1Title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sig2-name">Signature 2 name</Label>
                  <Input
                    id="sig2-name"
                    value={form.signature2Name}
                    onChange={(e) => updateForm({ signature2Name: e.target.value })}
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sig2-title">Signature 2 title</Label>
                  <Input
                    id="sig2-title"
                    value={form.signature2Title}
                    onChange={(e) => updateForm({ signature2Title: e.target.value })}
                  />
                </div>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDownloadPdf()}
                  disabled={isDownloading}
                >
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

          {/* Preview — always live from current form state */}
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between no-print">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Live preview</h2>
              <span className="text-xs text-muted-foreground">US Letter · Landscape · 11 × 8.5 in</span>
            </div>
            <div
              ref={previewContainerRef}
              className="overflow-x-auto rounded-lg border bg-muted/30 p-4 flex justify-center min-h-[280px]"
            >
              <CertificateDocument id={CERTIFICATE_PRINT_ID} data={form} scale={previewScale} />
            </div>
          </div>
        </div>

        {/* History */}
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
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => loadRecordIntoForm(record)}
                            >
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
