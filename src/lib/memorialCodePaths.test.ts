import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MEMORIALS } from './memorials'

/**
 * Static guards for the shape of memorial archiving: the public routes stay
 * registered unconditionally (the edge decides what to serve), the app never
 * shows or links an archived memorial, and every printed asset sits where
 * the edge matcher can reach it.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

const app = read('src/App.tsx')
const indexPage = read('src/pages/public/MemorialsIndexPage.tsx')
const detailPage = read('src/pages/public/CollinsColloNamaswaMemorialPage.tsx')
const adminPage = read('src/pages/admin/AdminMemorialsPage.tsx')

describe('memorial code paths', () => {
  it('keeps the permanent memorial routes registered unconditionally', () => {
    expect(app).toContain('{/* Permanent memorial URLs — do not rename (printed QR destinations). */}')
    expect(app).toContain('<Route path="memorials" element={<MemorialsIndexPage />} />')
    expect(app).toContain('path="memorials/collins-collo-namaswa"')
    // Lifecycle state belongs to the edge and the page, never to routing.
    expect(app).not.toMatch(/memorial_states|isArchivedMemorial|fetchMemorialStatuses/)
  })

  it('shows the archive notice instead of the page, except to admins', () => {
    expect(detailPage).toContain('if (archived && !isAdmin)')
    expect(detailPage).toContain('ARCHIVED_MEMORIAL_HEADING')
    expect(detailPage).toContain('ARCHIVED_MEMORIAL_NOTICE')
    expect(detailPage).toContain('noIndex={archived}')
    // The notice still offers a way onward.
    expect(detailPage).toContain('to="/memorials"')
  })

  it('tells an admin previewing the page that the public cannot see it', () => {
    expect(detailPage).toContain('ARCHIVED_MEMORIAL_ADMIN_BANNER')
  })

  it('lists only published memorials, and links none that are archived', () => {
    expect(indexPage).toContain('const { promoted } = partitionMemorials(MEMORIALS, statuses)')
    expect(indexPage).toContain('promoted.map(')
    expect(indexPage).not.toMatch(/archived\.map\(/)
    expect(indexPage).toContain('There are no memorials published at this time.')
  })

  it('reads lifecycle state through the shared api with a fail-open default', () => {
    for (const page of [indexPage, detailPage]) {
      expect(page).toContain("from '@/lib/memorialStatesApi'")
      expect(page).toContain('fetchMemorialStatuses()')
    }
    const api = read('src/lib/memorialStatesApi.ts')
    expect(api).toContain("return { statuses: {}, source: 'fallback' }")
  })

  it('gives admins the status control, the preview, and an audit stamp', () => {
    expect(adminPage).toContain('setMemorialStatus({')
    expect(adminPage).toContain('adminId: user?.id ?? null')
    expect(adminPage).toContain('MEMORIAL_LIFECYCLE_STATUSES.map(')
    expect(adminPage).toContain('Offline to the public')
    expect(adminPage).toContain('grantMemorialPreview(session?.access_token)')
  })

  it('registers the admin page in the route table and sidebar', () => {
    expect(app).toContain('<Route path="memorials" element={<AdminMemorialsPage />} />')
    const sidebar = read('src/components/layout/AdminSidebar.tsx')
    expect(sidebar).toContain("{ to: '/admin/memorials', label: 'Memorials', Icon: Flower2 }")
  })

  it('keeps every printed asset under the slug the edge matcher covers', () => {
    // An asset stored anywhere else would stay public after archiving,
    // because middleware.ts only matches /memorials/:slug/:asset*.
    for (const memorial of MEMORIALS) {
      const prefix = `/memorials/${memorial.slug}/`
      for (const path of [
        memorial.funeralProgramPath,
        memorial.qrPngPath,
        memorial.qrPrintPngPath,
        memorial.qrSvgPath,
      ]) {
        expect(path.startsWith(prefix), `${path} must start with ${prefix}`).toBe(true)
      }
    }
  })
})
