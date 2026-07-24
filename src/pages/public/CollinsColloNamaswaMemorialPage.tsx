import { Link } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, FileText } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { PublicSection } from '@/components/public/PublicSection'
import { COLLINS_COLLO_NAMASWA, MEMORIAL_SITE_ORIGIN } from '@/lib/memorials'
import { APP_NAME } from '@/lib/constants'

const memorial = COLLINS_COLLO_NAMASWA

const PAGE_TITLE = 'Collins “Collo” Namaswa | Forever in Our Hearts'
const PAGE_DESCRIPTION =
  'A respectful memorial page honoring the life and memory of Collins “Collo” Namaswa.'

export function CollinsColloNamaswaMemorialPage() {
  return (
    <>
      <SEOHead
        documentTitle={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        canonicalUrl={memorial.permanentUrl}
        image={`${MEMORIAL_SITE_ORIGIN}/kigh-logo.jpg`}
        type="article"
      />

      {/* Restrained, text-led memorial hero — no photo substitute */}
      <section
        aria-labelledby="memorial-heading"
        className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-secondary/40 via-background to-background"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-kenyan-gold-500/50 to-transparent"
          aria-hidden
        />
        <div className="public-container py-14 sm:py-16 lg:py-20">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
            In loving memory
          </p>
          <h1
            id="memorial-heading"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem]"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
          >
            {memorial.memorialHeading}
          </h1>
          <p className="mt-4 text-xl font-medium tracking-tight text-foreground/90 sm:text-2xl">
            {memorial.fullName}
          </p>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            <span className="sr-only">Dates: </span>
            {memorial.dateOfBirth}
            {memorial.dateOfPassing ? (
              <>
                <span aria-hidden className="mx-2 text-border">
                  –
                </span>
                <span>{memorial.dateOfPassing}</span>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <PublicSection className="!py-10 sm:!py-12 lg:!py-14" contentClassName="max-w-3xl">
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Remembering Collo
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-foreground/85 sm:text-base">
              {memorial.introduction}
            </p>
          </div>

          <dl className="grid gap-4 border-y border-border/60 py-6 sm:grid-cols-2">
            {memorial.parents ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Parents
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-foreground sm:text-[15px]">
                  {memorial.parents}
                </dd>
              </div>
            ) : null}
            {memorial.siblings ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Brother
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-foreground sm:text-[15px]">
                  {memorial.siblings}
                </dd>
              </div>
            ) : null}
          </dl>

          {memorial.acknowledgment ? (
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {memorial.acknowledgment}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a
                href={memorial.funeralProgramPath}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View funeral program for ${memorial.fullName} (opens PDF)`}
              >
                <FileText className="mr-2 h-4 w-4" aria-hidden />
                View Funeral Program
                <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-70" aria-hidden />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href={memorial.funeralProgramPath}
                download="collins-collo-namaswa-funeral-program.pdf"
                aria-label={`Download funeral program for ${memorial.fullName}`}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Download Funeral Program
              </a>
            </Button>
          </div>
        </div>
      </PublicSection>

      <PublicSection
        id="funeral-program"
        title="Funeral program"
        description="The complete funeral program is available to view or download. If the preview does not appear on your device, use the buttons above or the fallback link below."
        className="!pt-0 !pb-10 sm:!pb-12 border-t border-border/40 bg-muted/20"
      >
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          {/* Prefer native PDF viewer on larger screens; mobile browsers often leave iframes blank. */}
          <iframe
            title={memorial.funeralProgramTitle}
            src={`${memorial.funeralProgramPath}#view=FitH`}
            className="hidden h-[70vh] min-h-[28rem] w-full bg-muted/40 md:block"
          />
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center md:hidden">
            <FileText className="h-8 w-8 text-primary/70" aria-hidden />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              On mobile, open the funeral program in your device’s PDF viewer for the clearest
              reading experience.
            </p>
            <Button asChild>
              <a
                href={memorial.funeralProgramPath}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open funeral program
              </a>
            </Button>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Prefer a direct file link?{' '}
          <a
            href={memorial.funeralProgramPath}
            target="_blank"
            rel="noopener noreferrer"
            className="link-editorial"
          >
            Open the funeral program PDF
          </a>
          .
        </p>
      </PublicSection>

      <PublicSection
        id="memorial-qr"
        title="Return to this page"
        description="Scan this QR code anytime to return to Collo’s memorial page on the Kenyans in Greater Houston website."
        className="!py-10 sm:!py-12"
        contentClassName="max-w-xl"
      >
        <figure className="mx-auto flex max-w-sm flex-col items-center">
          <div className="rounded-2xl border border-border/50 bg-white p-6 shadow-sm">
            <img
              src={memorial.qrPngPath}
              alt={`QR code linking to the memorial page for ${memorial.fullName}`}
              width={240}
              height={240}
              className="h-56 w-56 sm:h-60 sm:w-60"
              decoding="async"
            />
          </div>
          <figcaption className="mt-4 text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Destination:{' '}
            <span className="break-all font-medium text-foreground/80">
              {memorial.permanentUrl}
            </span>
          </figcaption>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild size="sm" variant="outline">
              <a
                href={memorial.qrPngPath}
                download="collins-collo-namaswa-memorial-qr.png"
                aria-label="Download memorial QR code as PNG"
              >
                <Download className="mr-2 h-3.5 w-3.5" aria-hidden />
                Download QR (PNG)
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a
                href={memorial.qrSvgPath}
                download="collins-collo-namaswa-memorial-qr.svg"
                aria-label="Download memorial QR code as SVG for printing"
              >
                Download QR (SVG)
              </a>
            </Button>
          </div>
        </figure>
      </PublicSection>

      <div className="border-t border-border/50 bg-muted/15">
        <div className="public-container flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/memorials"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline decoration-primary/25 underline-offset-[5px] hover:decoration-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 rounded-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All memorials
          </Link>
          <Link
            to="/community-support"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 rounded-sm"
          >
            Community support · {APP_NAME}
          </Link>
        </div>
      </div>
    </>
  )
}
