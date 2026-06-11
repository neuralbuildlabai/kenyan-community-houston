import html2pdf from 'html2pdf.js'
import { certificatePdfFilename } from '@/lib/certificateTemplates'

const PDF_OPTIONS = {
  margin: 0,
  image: { type: 'jpeg' as const, quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    logging: false,
    letterRendering: true,
  },
  jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'landscape' as const },
  pagebreak: { mode: ['avoid-all'] as const },
}

export async function downloadCertificatePdf(
  element: HTMLElement,
  recipientName: string,
  category: string
): Promise<void> {
  const clone = element.cloneNode(true) as HTMLElement
  clone.style.transform = 'none'
  clone.style.margin = '0'
  clone.style.boxShadow = 'none'

  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-9999px'
  wrapper.style.top = '0'
  wrapper.style.width = '11in'
  wrapper.style.height = '8.5in'
  wrapper.style.overflow = 'hidden'
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  try {
    await html2pdf()
      .set({
        ...PDF_OPTIONS,
        filename: certificatePdfFilename(recipientName, category),
      })
      .from(clone)
      .save()
  } finally {
    document.body.removeChild(wrapper)
  }
}

export function printCertificate(elementId: string): void {
  const root = document.getElementById(elementId)
  if (!root) return

  const printRoot = document.getElementById('certificate-print-portal')
  if (!printRoot) return

  printRoot.innerHTML = ''
  const clone = root.cloneNode(true) as HTMLElement
  clone.removeAttribute('id')
  clone.classList.add('certificate-print-clone')
  printRoot.appendChild(clone)

  document.body.classList.add('certificate-printing')

  const cleanup = () => {
    document.body.classList.remove('certificate-printing')
    printRoot.innerHTML = ''
    window.removeEventListener('afterprint', cleanup)
  }

  window.addEventListener('afterprint', cleanup)
  window.print()
}
