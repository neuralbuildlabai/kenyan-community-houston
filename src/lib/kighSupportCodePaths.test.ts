import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { KIGH_SUPPORT_OPTIONS } from './kighSupportOptions'

/**
 * Static guard — the KIGH payment handles live in exactly one module. Any
 * surface that shows them (the "Ways to support" page, the fundraiser form
 * preview, internal fundraiser pages) must render the shared component so an
 * edit to the config lands everywhere at once.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

const sharedComponent = read('src/components/support/KighSupportHandles.tsx')
const supportPage = read('src/pages/public/SupportPage.tsx')
const submitPage = read('src/pages/public/SubmitFundraiserPage.tsx')
const detailPage = read('src/pages/public/FundraiserDetailPage.tsx')

describe('KIGH support handle code paths', () => {
  it('only the shared config declares the handles', () => {
    const handles = KIGH_SUPPORT_OPTIONS.flatMap((o) => [o.handle, o.href])
    for (const page of [sharedComponent, supportPage, submitPage, detailPage]) {
      for (const handle of handles) {
        expect(page).not.toContain(handle)
      }
    }
  })

  it('the shared component resolves active options at render time', () => {
    expect(sharedComponent).toContain('activeKighSupportOptions()')
    expect(sharedComponent).toContain('navigator.clipboard.writeText(copy)')
    expect(sharedComponent).toContain('rel="noopener noreferrer"')
  })

  it('Ways to Support renders the shared handles', () => {
    expect(supportPage).toContain("from '@/components/support/KighSupportHandles'")
    expect(supportPage).toContain('<KighSupportHandles />')
  })

  it('the fundraiser form previews the shared handles in internal mode', () => {
    expect(submitPage).toContain("from '@/components/support/KighSupportHandles'")
    expect(submitPage).toContain('<KighSupportHandles variant="compact" />')
    expect(submitPage).toContain('INTERNAL_FUNDRAISER_HELPER_TEXT')
    expect(submitPage).toContain('id="internal_fundraiser"')
    expect(submitPage).toContain('htmlFor="internal_fundraiser"')
  })

  it('the form submits the funding selection and blocks unconfigured internal mode', () => {
    expect(submitPage).toContain('buildFundraiserFundingPayload({ fundingMode, donationUrl: form.donation_url })')
    expect(submitPage).toContain('validateFundraiserFunding({ fundingMode, supportMethodsAvailable })')
    expect(submitPage).toContain('disabled={loading || (isInternal && !supportMethodsAvailable)}')
    // The external field is hidden in internal mode, but toggling must not
    // touch form state — unchecking restores what the submitter typed.
    expect(submitPage).toContain('{!isInternal && (')
    expect(submitPage).toContain('onCheckedChange={(v) => setIsInternal(v === true)}')
  })

  it('internal fundraiser pages resolve handles instead of stored payment details', () => {
    expect(detailPage).toContain("from '@/components/support/KighSupportHandles'")
    expect(detailPage).toContain('isInternalFundraiser(item.funding_mode)')
    expect(detailPage).toContain('KIGH_ORGANIZED_LABEL')
    expect(detailPage).toContain('<KighSupportHandles variant="compact" />')
  })
})
