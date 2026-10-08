import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Static guard for the invariant printed flyers depend on: archiving a
 * memorial is presentational. The route and the page must never be gated on
 * lifecycle state, or a scanned QR code would land on a dead URL.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

const app = read('src/App.tsx')
const indexPage = read('src/pages/public/MemorialsIndexPage.tsx')
const detailPage = read('src/pages/public/CollinsColloNamaswaMemorialPage.tsx')
const adminPage = read('src/pages/admin/AdminMemorialsPage.tsx')

describe('memorial code paths', () => {
  it('keeps the permanent memorial routes unconditional', () => {
    expect(app).toContain('{/* Permanent memorial URLs — do not rename (printed QR destinations). */}')
    expect(app).toContain('<Route path="memorials" element={<MemorialsIndexPage />} />')
    expect(app).toContain('path="memorials/collins-collo-namaswa"')
    // No lifecycle state anywhere near routing.
    expect(app).not.toMatch(/memorial_states|isArchivedMemorial|fetchMemorialStatuses/)
  })

  it('renders the detail page regardless of state, adding only a notice', () => {
    expect(detailPage).toContain('ARCHIVED_MEMORIAL_NOTICE')
    expect(detailPage).toContain("memorialStatusFor(memorial.slug, statuses) === 'archived'")
    // The archived flag must not short-circuit rendering or redirect.
    expect(detailPage).not.toMatch(/if\s*\(\s*archived\s*\)\s*return/)
    expect(detailPage).not.toMatch(/Navigate|noIndex=\{archived\}|return null/)
  })

  it('partitions the index instead of hiding archived memorials', () => {
    expect(indexPage).toContain('partitionMemorials(MEMORIALS, statuses)')
    expect(indexPage).toContain('ARCHIVED_MEMORIALS_HEADING')
    expect(indexPage).toContain('archived.map(')
    // Archived entries still link to their permanent path.
    expect(indexPage).toContain('memorialPath(memorial.slug)')
  })

  it('reads lifecycle state through the shared api with a fail-open default', () => {
    for (const page of [indexPage, detailPage]) {
      expect(page).toContain("from '@/lib/memorialStatesApi'")
      expect(page).toContain('fetchMemorialStatuses()')
    }
    const api = read('src/lib/memorialStatesApi.ts')
    expect(api).toContain("return { statuses: {}, source: 'fallback' }")
  })

  it('gives admins the status control and records who archived it', () => {
    expect(adminPage).toContain('setMemorialStatus({')
    expect(adminPage).toContain('adminId: user?.id ?? null')
    expect(adminPage).toContain('MEMORIAL_LIFECYCLE_STATUSES.map(')
    expect(adminPage).toContain('Page still online')
  })

  it('registers the admin page in the route table and sidebar', () => {
    expect(app).toContain('<Route path="memorials" element={<AdminMemorialsPage />} />')
    const sidebar = read('src/components/layout/AdminSidebar.tsx')
    expect(sidebar).toContain("{ to: '/admin/memorials', label: 'Memorials', Icon: Flower2 }")
  })
})
