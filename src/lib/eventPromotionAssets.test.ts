import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Static checks: Family Fun Day promotion uses the new public flyer path
 * and drops the retired filename from migrations / app surfaces.
 */
describe('Family Fun Day flyer and homepage promotion', () => {
  const migration005 = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/005_kigh_fun_day_and_tax_event.sql'),
    'utf8'
  )
  const migration037 = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/037_family_fun_day_flyer_and_schedule.sql'),
    'utf8'
  )
  const homePage = readFileSync(resolve(process.cwd(), 'src/pages/public/HomePage.tsx'), 'utf8')

  it('migrations reference the new flyer path', () => {
    expect(migration005).toContain('/kigh-media/events/family-fun-day-2026.jpeg')
    expect(migration037).toContain('/kigh-media/events/family-fun-day-2026.jpeg')
  })

  it('migrations do not reference the retired Family Fun Day flyer filename', () => {
    expect(migration005).not.toContain('kigh-family-fun-day-2026.jpeg')
    expect(migration037).not.toContain('kigh-family-fun-day-2026.jpeg')
  })

  it('homepage source never embeds event flyer URLs (skyline hero only)', () => {
    expect(homePage).not.toMatch(/kigh-media\/events\/.*\.(jpe?g|png)/i)
  })
})
