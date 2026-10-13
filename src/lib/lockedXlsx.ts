/**
 * Locked Excel workbooks for admin downloads, written by hand so no
 * spreadsheet library ships to the browser.
 *
 * "Locked" means: every cell is protected and the sheet carries a password
 * nobody is told (a fresh random one per download), the workbook structure
 * is protected so sheets cannot be added or renamed, and Excel offers to
 * open it read-only. Excel and LibreOffice enforce this. It is a guard
 * against accidental or casual edits, not a cryptographic seal — Excel's
 * sheet password is a 16-bit hash, and anyone can copy the values into a new
 * file. Google Sheets drops the protection on import.
 *
 * The file is a zip of a handful of XML parts. Entries are stored rather
 * than deflated; these lists are small and Excel accepts stored entries.
 */

export type XlsxCell = string | number | null | undefined

export interface XlsxColumn {
  header: string
  /** Width in Excel character units. */
  width: number
  /** `money` cells take numbers; `date` cells take `yyyy-MM-dd` strings. */
  kind?: 'text' | 'money' | 'date'
}

export interface LockedXlsxSheet {
  name: string
  columns: readonly XlsxColumn[]
  rows: readonly (readonly XlsxCell[])[]
  /** Rendered bold after the rows, e.g. a total line. */
  footer?: readonly XlsxCell[]
}

/* Style indexes in styles.xml below. */
const STYLE = { text: 0, header: 1, money: 2, date: 3, footerText: 4, footerMoney: 5 } as const

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// ── XML ──────────────────────────────────────────────────────────────

function xmlEscape(value: string): string {
  return value
    // Control characters other than tab/newline are invalid in XML 1.0.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function columnLetter(index: number): string {
  let n = index + 1
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

/** Days since 1899-12-30, Excel's date serial. Null for anything not yyyy-MM-dd. */
export function excelDateSerial(isoDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!m) return null
  return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86_400_000
}

function cellXml(ref: string, value: XlsxCell, kind: XlsxColumn['kind'], footer: boolean): string {
  if (value === null || value === undefined || value === '') return ''
  if (kind === 'money' && typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}" s="${footer ? STYLE.footerMoney : STYLE.money}"><v>${value}</v></c>`
  }
  if (kind === 'date' && typeof value === 'string') {
    const serial = excelDateSerial(value)
    if (serial !== null) return `<c r="${ref}" s="${STYLE.date}"><v>${serial}</v></c>`
  }
  if (typeof value === 'number') {
    return `<c r="${ref}" s="${footer ? STYLE.footerText : STYLE.text}"><v>${value}</v></c>`
  }
  const style = footer ? STYLE.footerText : STYLE.text
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
}

function rowXml(rowNumber: number, cells: string): string {
  return `<row r="${rowNumber}">${cells}</row>`
}

/**
 * Excel's legacy sheet-protection hash (ECMA-376 Part 4, 14.7.1). Valid for
 * passwords of up to 15 characters, which is all this module generates.
 */
export function excelPasswordHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const shifted = password.charCodeAt(i) << (i + 1)
    hash ^= (shifted & 0x7fff) | (shifted >> 15)
  }
  hash ^= password.length
  hash ^= 0xce4b
  return hash.toString(16).toUpperCase()
}

function randomPassword(): string {
  const bytes = new Uint8Array(15)
  crypto.getRandomValues(bytes)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

function sheetXml(sheet: LockedXlsxSheet, passwordHash: string): string {
  const { columns } = sheet
  const cols = columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`)
    .join('')

  const rows: string[] = []
  rows.push(
    rowXml(
      1,
      columns
        .map((c, i) => `<c r="${columnLetter(i)}1" s="${STYLE.header}" t="inlineStr"><is><t>${xmlEscape(c.header)}</t></is></c>`)
        .join('')
    )
  )
  const body = [...sheet.rows.map((r) => ({ cells: r, footer: false }))]
  if (sheet.footer) body.push({ cells: sheet.footer, footer: true })
  body.forEach(({ cells, footer }, r) => {
    const rowNumber = r + 2
    rows.push(
      rowXml(
        rowNumber,
        columns
          .map((c, i) => cellXml(`${columnLetter(i)}${rowNumber}`, cells[i], c.kind, footer))
          .join('')
      )
    )
  })

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // Header row stays in view while scrolling.
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${rows.join('')}</sheetData>` +
    // Everything locked; selecting and copying cells is still allowed.
    `<sheetProtection password="${passwordHash}" sheet="1" objects="1" scenarios="1" formatCells="1" formatColumns="1" formatRows="1" insertColumns="1" insertRows="1" insertHyperlinks="1" deleteColumns="1" deleteRows="1" sort="1" autoFilter="1" pivotTables="1"/>` +
    '</worksheet>'
  )
}

function workbookXml(sheetName: string, passwordHash: string): string {
  // Sheet names: max 31 chars, none of : \ / ? * [ ]
  const name = xmlEscape(sheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Sheet1')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<fileSharing readOnlyRecommended="1"/>' +
    `<workbookProtection workbookPassword="${passwordHash}" lockStructure="1" lockWindows="1"/>` +
    `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>` +
    '</workbook>'
  )
}

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/><numFmt numFmtId="165" formatCode="mmm d, yyyy"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F0E8"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="6">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="top"/></xf>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment horizontal="left" vertical="top"/></xf>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="164" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

const CONTENT_TYPES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>'

const ROOT_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>'

const WORKBOOK_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>'

// ── Zip (stored entries) ─────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function zipStored(files: readonly { name: string; data: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  // Fixed timestamp (1980-01-01); the workbook carries no edit history.
  const dosTime = 0
  const dosDate = (0 << 9) | (1 << 5) | 1
  const local: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const crc = crc32(file.data)
    const size = file.data.length

    const header = new DataView(new ArrayBuffer(30))
    header.setUint32(0, 0x04034b50, true)
    header.setUint16(4, 20, true)
    header.setUint16(6, 0, true)
    header.setUint16(8, 0, true)
    header.setUint16(10, dosTime, true)
    header.setUint16(12, dosDate, true)
    header.setUint32(14, crc, true)
    header.setUint32(18, size, true)
    header.setUint32(22, size, true)
    header.setUint16(26, name.length, true)
    header.setUint16(28, 0, true)
    local.push(new Uint8Array(header.buffer), name, file.data)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, dosTime, true)
    entry.setUint16(14, dosDate, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, size, true)
    entry.setUint32(24, size, true)
    entry.setUint16(28, name.length, true)
    entry.setUint32(42, offset, true)
    central.push(new Uint8Array(entry.buffer), name)

    offset += 30 + name.length + size
  }

  const centralSize = central.reduce((n, part) => n + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  const parts = [...local, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(new ArrayBuffer(parts.reduce((n, p) => n + p.length, 0)))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

// ── Public API ───────────────────────────────────────────────────────

export function buildLockedXlsx(
  sheet: LockedXlsxSheet,
  password = randomPassword()
): Uint8Array<ArrayBuffer> {
  const hash = excelPasswordHash(password)
  const encoder = new TextEncoder()
  return zipStored([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES_XML) },
    { name: '_rels/.rels', data: encoder.encode(ROOT_RELS_XML) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml(sheet.name, hash)) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(WORKBOOK_RELS_XML) },
    { name: 'xl/styles.xml', data: encoder.encode(STYLES_XML) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheetXml(sheet, hash)) },
  ])
}

/** Hands the workbook to the browser as a download. */
export function downloadLockedXlsx(sheet: LockedXlsxSheet, filename: string): void {
  const blob = new Blob([buildLockedXlsx(sheet)], { type: XLSX_MIME })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
