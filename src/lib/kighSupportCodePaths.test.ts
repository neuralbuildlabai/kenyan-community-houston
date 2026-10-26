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
const donationOptions = read('src/components/fundraisers/FundraiserDonationOptions.tsx')

describe('KIGH support handle code paths', () => {
  it('only the shared config declares the handles', () => {
    const handles = KIGH_SUPPORT_OPTIONS.flatMap((o) => [o.handle, o.href])
    for (const page of [sharedComponent, supportPage, submitPage, detailPage, donationOptions]) {
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

  it('the public fundraiser form never offers KIGH handles (migration 090)', () => {
    // Community fundraisers are independent: only admins can switch one to
    // KIGH's own handles, from the admin Fundraisers page.
    expect(submitPage).not.toContain('KighSupportHandles')
    expect(submitPage).not.toContain('internal_fundraiser')
    expect(submitPage).not.toContain('INTERNAL_FUNDRAISER_LABEL')
    expect(submitPage).toContain('INDEPENDENT_FUNDRAISER_NOTE')
  })

  it('the form submits as external with a required link and organizer email', () => {
    expect(submitPage).toContain("buildFundraiserFundingPayload({ fundingMode: 'external', donationUrl: form.donation_url })")
    expect(submitPage).toContain('validateIndependentFundraiser({')
    expect(submitPage).toContain('organizer_email: form.organizer_email.trim()')
  })

  it('internal fundraiser pages resolve handles instead of stored payment details', () => {
    expect(donationOptions).toContain("from '@/components/support/KighSupportHandles'")
    expect(donationOptions).toContain('isInternalFundraiser(fundraiser.funding_mode)')
    expect(donationOptions).toContain('KIGH_ORGANIZED_LABEL')
    expect(donationOptions).toContain('<KighSupportHandles variant="compact" />')
  })

  it('the public fundraiser page renders donation options exactly once', () => {
    expect(detailPage).toContain('<FundraiserDonationOptions fundraiser={item} />')
    expect(detailPage.match(/<FundraiserDonationOptions/g)).toHaveLength(1)
  })
})
