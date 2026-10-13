/**
 * Locked PDF versions of admin table exports — the format to share on
 * WhatsApp, which previews a PDF on any phone but cannot open .xlsx without
 * a spreadsheet app.
 *
 * Takes the same `LockedXlsxSheet` the Excel export uses, so the two files
 * always carry the same columns, rows and total. Like the certificates, the
 * PDF opens and prints without a password, while editing, copying and
 * annotating need an owner password nobody is given.
 */
import type { jsPDF as JsPdf } from 'jspdf'
import type { LockedXlsxSheet, XlsxCell, XlsxColumn } from '@/lib/lockedXlsx'
import { formatDateShort, formatDateTime } from '@/lib/utils'

export interface LockedPdfOptions {
  title: string
  subtitle?: string
  /** Defaults to now; shown in Houston time. */
  generatedAt?: Date
}

const MARGIN = 36
const FONT_SIZE = 9.5
const LINE_HEIGHT = FONT_SIZE * 1.3
const CELL_PAD_X = 5
const CELL_PAD_Y = 4
const HEADER_FILL: [number, number, number] = [232, 240, 232]
const RULE: [number, number, number] = [210, 214, 210]

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function cellText(value: XlsxCell, kind: XlsxColumn['kind']): string {
  if (value === null || value === undefined) return ''
  if (kind === 'money' && typeof value === 'number') return USD.format(value)
  if (kind === 'date' && typeof value === 'string') return formatDateShort(value)
  return String(value)
}

export async function buildLockedPdf(sheet: LockedXlsxSheet, options: LockedPdfOptions): Promise<JsPdf> {
  // Loaded on demand so jsPDF stays out of the page bundle until someone downloads.
  const { jsPDF } = await import('jspdf')
  const wide = sheet.columns.reduce((n, c) => n + c.width, 0) > 110
  const pdf = new jsPDF({
    orientation: wide ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'letter',
    encryption: {
      ownerPassword: crypto.randomUUID(),
      userPermissions: ['print'],
    },
  })
  pdf.setProperties({ title: options.title, creator: 'Kenyans in Greater Houston' })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const tableWidth = pageWidth - MARGIN * 2
  const unit = tableWidth / sheet.columns.reduce((n, c) => n + c.width, 0)
  const widths = sheet.columns.map((c) => c.width * unit)
  const xs = widths.map((_, i) => MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0))

  let y = MARGIN

  // ── Title block (first page only) ──
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  for (const line of pdf.splitTextToSize(options.title, tableWidth) as string[]) {
    pdf.text(line, MARGIN, y + 12)
    y += 18
  }
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(100)
  const generated = `Generated ${formatDateTime((options.generatedAt ?? new Date()).toISOString())}`
  pdf.text([options.subtitle, generated].filter(Boolean).join('  ·  '), MARGIN, y + 6)
  pdf.setTextColor(0)
  y += 20

  function drawRow(cells: readonly XlsxCell[], style: 'header' | 'body' | 'footer') {
    pdf.setFont('helvetica', style === 'body' ? 'normal' : 'bold')
    pdf.setFontSize(FONT_SIZE)
    const lines = sheet.columns.map((col, i) => {
      const text = style === 'header' ? col.header : cellText(cells[i], col.kind)
      return pdf.splitTextToSize(text, widths[i] - CELL_PAD_X * 2) as string[]
    })
    const height = Math.max(1, ...lines.map((l) => l.length)) * LINE_HEIGHT + CELL_PAD_Y * 2

    if (style !== 'header' && y + height > pageHeight - MARGIN - 14) {
      pdf.addPage()
      y = MARGIN
      drawRow([], 'header')
      pdf.setFont('helvetica', style === 'body' ? 'normal' : 'bold')
    }

    if (style !== 'body') {
      pdf.setFillColor(...HEADER_FILL)
      pdf.rect(MARGIN, y, tableWidth, height, 'F')
    }
    lines.forEach((cellLines, i) => {
      const right = sheet.columns[i].kind === 'money'
      cellLines.forEach((line, n) => {
        const baseline = y + CELL_PAD_Y + FONT_SIZE + n * LINE_HEIGHT - 1
        if (right) pdf.text(line, xs[i] + widths[i] - CELL_PAD_X, baseline, { align: 'right' })
        else pdf.text(line, xs[i] + CELL_PAD_X, baseline)
      })
    })
    y += height
    pdf.setDrawColor(...RULE)
    pdf.setLineWidth(0.5)
    pdf.line(MARGIN, y, MARGIN + tableWidth, y)
  }

  drawRow([], 'header')
  for (const row of sheet.rows) drawRow(row, 'body')
  if (sheet.footer) drawRow(sheet.footer, 'footer')

  // ── Page numbers ──
  const pages = pdf.getNumberOfPages()
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(120)
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p)
    pdf.text(`Page ${p} of ${pages}`, pageWidth - MARGIN, pageHeight - MARGIN / 2, { align: 'right' })
  }
  return pdf
}

export async function downloadLockedPdf(
  sheet: LockedXlsxSheet,
  options: LockedPdfOptions,
  filename: string
): Promise<void> {
  const pdf = await buildLockedPdf(sheet, options)
  pdf.save(filename)
}
