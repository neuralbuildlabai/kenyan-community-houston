import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COLLECTION_PUBLIC_COLUMNS, FUNDRAISER_PUBLIC_COLUMNS } from './fundraisersPublic'

/**
 * Static guards for the public fundraiser surfaces.
 *
 * The database already refuses the private columns (migration 085), but a
 * `select('*')` creeping back into a public page would quietly start
 * shipping `organizer_contact` to every visitor again, and a hardcoded
 * fundraiser would make the homepage card un-reusable. Both are the kind of
 * regression that only shows up in production, so they are pinned here.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

/**
 * Comments explain the rules these tests enforce, and naturally quote the
 * very strings being banned ("not `window.location`", "$2,250 of a $2,000
 * goal"). Assert against code only.
 */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')

const publicApi = read('src/lib/fundraisersPublic.ts')
const detailPage = read('src/pages/public/FundraiserDetailPage.tsx')
const listingPage = read('src/pages/public/CommunitySupportPage.tsx')
const homepageCard = read('src/components/landing/HomeFeaturedFundraiser.tsx')
const collectionsTable = read('src/components/fundraisers/FundraiserCollectionsTable.tsx')
const progressPanel = read('src/components/fundraisers/FundraiserProgressPanel.tsx')
const donationOptions = read('src/components/fundraisers/FundraiserDonationOptions.tsx')
const shareActions = read('src/components/fundraisers/FundraiserShareActions.tsx')
const navigation = read('src/lib/publicNav.ts')

describe('public fundraiser reads', () => {
  it('names its columns instead of selecting everything', () => {
    for (const page of [detailPage, listingPage, homepageCard]) {
      expect(page).not.toContain(".select('*')")
      expect(page).not.toContain("from('fundraisers')")
    }
  })

  it('never asks for private contact or reconciliation columns', () => {
    for (const column of ['organizer_contact', 'private_note', 'donor_name']) {
      expect(FUNDRAISER_PUBLIC_COLUMNS).not.toContain(column)
    }
    expect(COLLECTION_PUBLIC_COLUMNS).toContain('public_donor_name')
    expect(COLLECTION_PUBLIC_COLUMNS).not.toContain('private_note')
    expect(COLLECTION_PUBLIC_COLUMNS.replace('public_donor_name', '')).not.toContain('donor_name')
  })

  it('gates every public read on publication', () => {
    const publicReads = publicApi.split('export async function').slice(1)
    for (const fn of publicReads) {
      // The admin preview read is the one deliberate exception; RLS, not
      // this query, decides whether an unpublished row comes back.
      if (fn.startsWith(' fetchFundraiserPreviewBySlug')) continue
      if (!fn.includes("from('fundraisers')")) continue
      expect(fn).toContain(".eq('status', 'published')")
    }
  })

  it('re-checks publication when resolving the homepage feature', () => {
    expect(publicApi).toContain("fetchHomepageFeaturedFundraiser")
    const fn = publicApi.slice(publicApi.indexOf('export async function fetchHomepageFeaturedFundraiser'))
    expect(fn).toContain(".eq('status', 'published')")
    expect(fn).toContain(".eq('is_homepage_featured', true)")
  })
})

describe('public fundraiser page composition', () => {
  it('derives every figure from one ledger summary', () => {
    expect(detailPage).toContain('summarizeFundraiserCollections(collections, item.goal_amount)')
    expect(detailPage).toContain('<FundraiserProgressPanel summary={summary} />')
    expect(detailPage).toContain('<FundraiserCollectionsTable summary={summary} />')
    for (const component of [progressPanel, collectionsTable]) {
      expect(component).not.toContain('raised_amount')
    }
  })

  it('shares the permanent URL rather than the current browser location', () => {
    expect(detailPage).toContain('fundraiserPublicUrl(item.slug)')
    expect(code(shareActions)).not.toContain('window.location')
    expect(shareActions).toContain('publicUrl')
  })

  it('puts nothing in front of the donation controls', () => {
    for (const marker of ['RequireAuth', 'ProtectedRoute', 'useAuth', 'isAdmin', 'session']) {
      expect(donationOptions).not.toContain(marker)
    }
  })

  it('reaches the listing from the site navigation', () => {
    expect(navigation).toContain("{ to: '/community-support', label: 'Community Support' }")
  })
})

describe('homepage feature card', () => {
  it('reads the fundraiser record rather than naming one', () => {
    for (const hardcoded of ['AfriFest', 'afrifest', '2000', '2,000']) {
      expect(homepageCard).not.toContain(hardcoded)
    }
    expect(homepageCard).toContain('fetchHomepageFeaturedFundraiser()')
    expect(homepageCard).toContain('fundraiserPath(fundraiser.slug)')
    expect(homepageCard).toContain('View &amp; Donate')
  })

  it('stays visible once the goal is reached', () => {
    expect(homepageCard).toContain('GOAL_REACHED_LABEL')
    expect(homepageCard).not.toMatch(/if \(goalReached\) return null/)
  })
})

describe('reusable components stay fundraiser-agnostic', () => {
  it('hardcodes no fundraiser title, goal or payment reference', () => {
    const reusable = [progressPanel, collectionsTable, donationOptions, shareActions, homepageCard]
    for (const component of reusable.map(code)) {
      expect(component).not.toMatch(/AfriFest/i)
      expect(component).not.toContain('$2,000')
    }
    expect(donationOptions).toContain('paymentNoteInstruction(fundraiser)')
  })
})
