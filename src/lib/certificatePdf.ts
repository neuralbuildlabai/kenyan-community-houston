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

/** Strip CSS patterns/decor that html2canvas cannot rasterize (createPattern 0×0 crash). */
function sanitizeCloneForCapture(clone: HTMLElement): void {
  clone.querySelectorAll('.cert-heritage-pattern').forEach((el) => el.remove())

  clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const bgImage = window.getComputedStyle(el).backgroundImage
    if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
      el.style.backgroundImage = 'none'
    }
  })
}

/** Wait for images inside the export clone so html2canvas never receives 0×0 canvases. */
async function waitForCloneImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
        })
    )
  )
}

/** Allow React to commit DOM updates before capture. */
async function waitForLayout(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function createExportHost(): HTMLDivElement {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.className = 'certificate-export-host'
  // Keep full dimensions and opacity — html2canvas fails on opacity:0 / zero-size hosts.
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:11in',
    'height:8.5in',
    'margin:0',
    'padding:0',
    'overflow:hidden',
    'pointer-events:none',
    'z-index:99999',
    'background:#fff',
    'transform:translateX(-200vw)',
  ].join(';')
  return host
}

async function buildCaptureClone(elementOrId: HTMLElement | string): Promise<HTMLElement> {
  const sheet = getCertificateSheetElement(elementOrId)
  if (!sheet) {
    throw new Error('Certificate sheet not found')
  }

  await waitForLayout()
  const clone = prepareSheetClone(sheet)
  sanitizeCloneForCapture(clone)
  await waitForCloneImages(clone)
  return clone
}

export async function downloadCertificatePdf(
  elementOrId: HTMLElement | string,
  recipientName: string,
  category: string
): Promise<void> {
  const clone = await buildCaptureClone(elementOrId)
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

export async function printCertificate(elementOrId: HTMLElement | string): Promise<void> {
  const sheet = getCertificateSheetElement(elementOrId)
  if (!sheet) {
    throw new Error('Certificate sheet not found')
  }

  const printRoot = document.getElementById('certificate-print-portal')
  if (!printRoot) {
    throw new Error('Print portal not found')
  }

  await waitForLayout()
  const clone = prepareSheetClone(sheet)
  sanitizeCloneForCapture(clone)
  await waitForCloneImages(clone)

  printRoot.innerHTML = ''
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
