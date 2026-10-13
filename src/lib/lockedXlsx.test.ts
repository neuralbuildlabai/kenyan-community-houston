import { describe, expect, it } from 'vitest'
import { buildLockedXlsx, excelDateSerial, excelPasswordHash } from './lockedXlsx'

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

describe('excelPasswordHash', () => {
  it('matches the values Excel and openpyxl produce', () => {
    expect(excelPasswordHash('secret')).toBe('DAA7')
    expect(excelPasswordHash('test')).toBe('CBEB')
  })
})

describe('excelDateSerial', () => {
  it('counts days from 1899-12-30', () => {
    expect(excelDateSerial('1900-03-01')).toBe(61)
    expect(excelDateSerial('2026-10-12')).toBe(46307)
    expect(excelDateSerial('Oct 12')).toBeNull()
  })
})

describe('buildLockedXlsx', () => {
  const file = buildLockedXlsx(
    {
      name: 'Donors',
      columns: [
        { header: 'Name', width: 20 },
        { header: 'Amount', width: 12, kind: 'money' },
      ],
      rows: [['Amani & <Co>', 12.5]],
      footer: ['Total', 12.5],
    },
    'secret'
  )
  const body = text(file)

  it('is a zip with the workbook parts', () => {
    expect([...file.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
    for (const part of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/styles.xml']) {
      expect(body).toContain(part)
    }
  })

  it('locks the sheet and the workbook and asks Excel to open read-only', () => {
    expect(body).toContain('<sheetProtection password="DAA7" sheet="1"')
    expect(body).toContain('<workbookProtection workbookPassword="DAA7" lockStructure="1"')
    expect(body).toContain('<fileSharing readOnlyRecommended="1"/>')
  })

  it('escapes text and keeps money numeric', () => {
    expect(body).toContain('Amani &amp; &lt;Co&gt;')
    expect(body).toContain('<c r="B2" s="2"><v>12.5</v></c>')
  })
})
