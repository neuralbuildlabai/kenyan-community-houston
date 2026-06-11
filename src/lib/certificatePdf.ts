import html2pdf from 'html2pdf.js'
import { certificatePdfFilename } from '@/lib/certificateTemplates'

/** US Letter landscape at 96 CSS px per inch */
const PAGE_WIDTH_PX = 11 * 96
const PAGE_HEIGHT_PX = 8.5 * 96

const PDF_OPTIONS = {
  margin: 0,
  image: { type: 'jpeg' as const, quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    logging: false,
    letterRendering: true,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    width: PAGE_WIDTH_PX,
    height: PAGE_HEIGHT_PX,
    windowWidth: PAGE_WIDTH_PX,
    windowHeight: PAGE_HEIGHT_PX,
  },
  jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'landscape' as const },
  pagebreak: { mode: ['avoid-all'] as const },
}

/** Resolve the printable certificate sheet — never the scaled preview wrapper. */
export function getCertificateSheetElement(elementOrId: HTMLElement | string): HTMLElement | null {
  const root =
    typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId
  if (!root) return null
  if (root.classList.contains('certificate-sheet')) return root
  return root.querySelector<HTMLElement>('.certificate-sheet')
}

function prepareSheetClone(sheet: HTMLElement): HTMLElement {
  const clone = sheet.cloneNode(true) as HTMLElement
  clone.removeAttribute('id')
  clone.classList.add('certificate-export-clone')
  clone.style.cssText = [
    'width:11in',
    'height:8.5in',
    'max-width:none',
    'margin:0',
    'padding:0',
    'transform:none',
    'box-shadow:none',
    'position:relative',
    'overflow:hidden',
    'break-inside:avoid',
    'page-break-inside:avoid',
  ].join(';')
  return clone
}

function createExportHost(): HTMLDivElement {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.className = 'certificate-export-host'
  host.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:11in',
    'height:8.5in',
    'margin:0',
    'padding:0',
    'overflow:hidden',
    'opacity:0',
    'pointer-events:none',
    'z-index:-1',
    'background:#fff',
  ].join(';')
  return host
}

export async function downloadCertificatePdf(
  elementOrId: HTMLElement | string,
  recipientName: string,
  category: string
): Promise<void> {
  const sheet = getCertificateSheetElement(elementOrId)
  if (!sheet) {
    throw new Error('Certificate sheet not found')
  }

  const clone = prepareSheetClone(sheet)
  const host = createExportHost()
  host.appendChild(clone)
  document.body.appendChild(host)

  try {
    await html2pdf()
      .set({
        ...PDF_OPTIONS,
        filename: certificatePdfFilename(recipientName, category),
      })
      .from(clone)
      .save()
  } finally {
    document.body.removeChild(host)
  }
}

export function printCertificate(elementOrId: HTMLElement | string): void {
  const sheet = getCertificateSheetElement(elementOrId)
  if (!sheet) return

  const printRoot = document.getElementById('certificate-print-portal')
  if (!printRoot) return

  printRoot.innerHTML = ''
  const clone = prepareSheetClone(sheet)
  printRoot.appendChild(clone)

  document.documentElement.classList.add('certificate-printing')
  document.body.classList.add('certificate-printing')

  const cleanup = () => {
    document.documentElement.classList.remove('certificate-printing')
    document.body.classList.remove('certificate-printing')
    printRoot.innerHTML = ''
    window.removeEventListener('afterprint', cleanup)
  }

  window.addEventListener('afterprint', cleanup)
  window.print()
}
