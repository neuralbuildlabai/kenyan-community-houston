import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { certificatePdfFilename } from '@/lib/certificateTemplates'

export const CERTIFICATE_PRINT_ROOT_ID = 'kigh-certificate-print-root'

/** US Letter landscape at 96 CSS px per inch */
const PAGE_WIDTH_PX = 11 * 96
const PAGE_HEIGHT_PX = 8.5 * 96

export type CertificatePdfDebugMeta = {
  templateId?: string
  designStyleId?: string
  recipientNamePresent?: boolean
}

function isDevDebugEnabled(): boolean {
  return import.meta.env.DEV
}

function isPdfDebugEnabled(): boolean {
  return isDevDebugEnabled()
}

function logPdfDebug(message: string, data?: Record<string, unknown>): void {
  if (!isPdfDebugEnabled()) return
  if (data) {
    console.info(`[certificate-pdf] ${message}`, data)
  } else {
    console.info(`[certificate-pdf] ${message}`)
  }
}

/** Reset print/export artifacts so the admin page never stays locked. */
export function cleanupCertificateExportState(): void {
  document.documentElement.classList.remove('certificate-printing')
  document.body.classList.remove('certificate-printing')

  const printRoot = document.getElementById(CERTIFICATE_PRINT_ROOT_ID)
  if (printRoot) {
    printRoot.setAttribute('aria-hidden', 'true')
  }

  document.querySelectorAll('.certificate-export-host').forEach((el) => {
    el.parentNode?.removeChild(el)
  })

  document.querySelectorAll('.html2canvas-container').forEach((el) => {
    el.parentNode?.removeChild(el)
  })
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

  clone.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      img.remove()
    }
  })

  clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const style = window.getComputedStyle(el)
    const bgImage = style.backgroundImage
    if (bgImage && bgImage !== 'none') {
      el.style.backgroundImage = 'none'
    }
    if (style.boxShadow && style.boxShadow !== 'none') {
      el.style.boxShadow = 'none'
    }
  })
}

/** Force images to reload inside the mounted clone so html2canvas sees non-zero dimensions. */
function reloadCloneImages(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    img.crossOrigin = 'anonymous'
    const src = img.getAttribute('src') || img.src
    if (src) {
      img.src = src
    }
  })
}

function getImageLoadSummary(root: HTMLElement): {
  count: number
  loaded: number
  details: Array<{ src: string; complete: boolean; naturalWidth: number; naturalHeight: number }>
} {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'))
  const details = images.map((img) => ({
    src: img.src.split('/').pop() ?? img.src,
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
  }))
  return {
    count: images.length,
    loaded: details.filter((d) => d.complete && d.naturalWidth > 0).length,
    details,
  }
}

/** Wait for images inside the export clone so html2canvas never receives 0×0 canvases. */
async function waitForCloneImages(root: HTMLElement, timeoutMs = 8000): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'))
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          const timer = window.setTimeout(() => resolve(), timeoutMs)
          const done = () => {
            window.clearTimeout(timer)
            resolve()
          }
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
        })
    )
  )

  root.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      img.remove()
    }
  })
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
    'z-index:-1',
    'background:#fff',
    'opacity:1',
  ].join(';')
  return host
}

function assertSheetDimensions(sheet: HTMLElement): { width: number; height: number } {
  const rect = sheet.getBoundingClientRect()
  const width = rect.width || sheet.offsetWidth
  const height = rect.height || sheet.offsetHeight
  if (width <= 0 || height <= 0) {
    throw new Error(`Certificate sheet has zero dimensions (${width}×${height})`)
  }
  return { width, height }
}

async function buildCaptureClone(elementOrId: HTMLElement | string): Promise<{
  clone: HTMLElement
  host: HTMLDivElement
}> {
  const sheet = getCertificateSheetElement(elementOrId)
  if (!sheet) {
    throw new Error('Certificate sheet not found')
  }
  if (!sheet.isConnected) {
    throw new Error('Certificate sheet is not attached to the DOM')
  }

  await waitForLayout()

  const sourceDimensions = assertSheetDimensions(sheet)
  logPdfDebug('source sheet dimensions', sourceDimensions)

  const clone = prepareSheetClone(sheet)
  sanitizeCloneForCapture(clone)

  const host = createExportHost()
  host.appendChild(clone)
  document.body.appendChild(host)

  await waitForLayout()
  reloadCloneImages(clone)
  await waitForCloneImages(clone)
  sanitizeCloneForCapture(clone)

  const cloneDimensions = assertSheetDimensions(clone)
  logPdfDebug('clone sheet dimensions', cloneDimensions)

  return { clone, host }
}

async function captureSheetToCanvas(clone: HTMLElement): Promise<HTMLCanvasElement> {
  const canvas = await html2canvas(clone, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    width: PAGE_WIDTH_PX,
    height: PAGE_HEIGHT_PX,
    windowWidth: PAGE_WIDTH_PX,
    windowHeight: PAGE_HEIGHT_PX,
    onclone: (clonedDoc, element) => {
      element.classList.add('certificate-export-clone')
      clonedDoc.querySelectorAll('.cert-heritage-pattern').forEach((el) => el.remove())
      clonedDoc.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
          img.remove()
        }
      })
      clonedDoc.querySelectorAll<HTMLElement>('.certificate-export-clone, .certificate-export-clone *').forEach((el) => {
        el.style.backgroundImage = 'none'
        el.style.boxShadow = 'none'
      })
    },
  })

  if (canvas.width <= 0 || canvas.height <= 0) {
    throw new Error(`Canvas capture produced zero dimensions (${canvas.width}×${canvas.height})`)
  }

  return canvas
}

export async function downloadCertificatePdf(
  elementOrId: HTMLElement | string,
  recipientName: string,
  category: string,
  debugMeta?: CertificatePdfDebugMeta
): Promise<void> {
  const sheetFound = !!getCertificateSheetElement(elementOrId)
  const sourceSheet = getCertificateSheetElement(elementOrId)
  const sourceRect = sourceSheet?.getBoundingClientRect()

  logPdfDebug('PDF generation start', {
    templateId: debugMeta?.templateId,
    designStyleId: debugMeta?.designStyleId,
    recipientNamePresent: debugMeta?.recipientNamePresent ?? recipientName.trim().length > 0,
    sheetFound,
    sheetWidth: sourceRect?.width ?? 0,
    sheetHeight: sourceRect?.height ?? 0,
    sheetConnected: sourceSheet?.isConnected ?? false,
  })

  let host: HTMLDivElement | null = null

  try {
    const capture = await buildCaptureClone(elementOrId)
    host = capture.host
    const { clone } = capture

    const imageSummary = getImageLoadSummary(clone)
    logPdfDebug('image load summary before capture', imageSummary)

    const canvas = await captureSheetToCanvas(clone)
    const imgData = canvas.toDataURL('image/jpeg', 0.98)

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: 'letter',
    })
    pdf.addImage(imgData, 'JPEG', 0, 0, 11, 8.5)
    pdf.save(certificatePdfFilename(recipientName, category))

    logPdfDebug('PDF generation end', { success: true })
  } catch (error) {
    logPdfDebug('PDF generation end', {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  } finally {
    if (host?.parentNode) {
      host.parentNode.removeChild(host)
    }
    cleanupCertificateExportState()
  }
}

/** Wait for images inside the print root so print preview is not blank. */
async function waitForPrintImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve()
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true })
        img.addEventListener('error', () => resolve(), { once: true })
      })
    })
  )
}

export async function printCertificate(elementOrId?: HTMLElement | string): Promise<void> {
  const printRoot = document.getElementById(CERTIFICATE_PRINT_ROOT_ID)
  if (!printRoot) {
    throw new Error('Print preview could not be prepared. Please try again.')
  }

  const sheet =
    elementOrId != null
      ? getCertificateSheetElement(elementOrId)
      : getCertificateSheetElement(printRoot)

  if (!sheet) {
    throw new Error('Print preview could not be prepared. Please try again.')
  }

  await waitForLayout()
  await waitForPrintImages(printRoot)
  await waitForLayout()

  const rect = sheet.getBoundingClientRect()
  if (!rect.width || !rect.height) {
    throw new Error('Print preview is not ready yet. Please try again.')
  }

  if (isDevDebugEnabled()) {
    const imageSummary = getImageLoadSummary(printRoot)
    console.info('[certificate-print]', {
      printRootFound: Boolean(printRoot),
      sheetFound: Boolean(sheet),
      sheetRect: {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      },
      imageCount: imageSummary.count,
      loadedImages: imageSummary.loaded,
      imageDetails: imageSummary.details,
    })
  }

  cleanupCertificateExportState()

  document.documentElement.classList.add('certificate-printing')
  document.body.classList.add('certificate-printing')
  printRoot.removeAttribute('aria-hidden')

  try {
    await waitForLayout()

    const cleanup = () => {
      cleanupCertificateExportState()
    }

    window.addEventListener('afterprint', cleanup, { once: true })
    window.print()
    window.setTimeout(cleanup, 1500)
  } catch (error) {
    cleanupCertificateExportState()
    throw error
  }
}
