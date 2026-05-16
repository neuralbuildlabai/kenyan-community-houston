import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('event detail flyer rendering', () => {
  const detailPage = readFileSync(
    resolve(process.cwd(), 'src/pages/public/EventDetailPage.tsx'),
    'utf8'
  )
  const eventCard = readFileSync(resolve(process.cwd(), 'src/components/EventCard.tsx'), 'utf8')

  it('detail page uses object-contain for flyer, not object-cover', () => {
    const flyerBlock = detailPage.slice(
      detailPage.indexOf('event-detail-flyer-img'),
      detailPage.indexOf('event-detail-flyer-img') + 400
    )
    expect(flyerBlock).toContain('object-contain')
    expect(flyerBlock).not.toContain('object-cover')
  })

  it('detail page does not cap flyer in a short fixed-height crop box', () => {
    expect(detailPage).not.toContain('max-h-[28rem]')
    expect(detailPage).not.toMatch(/event-detail-flyer[\s\S]{0,200}h-full object-cover/)
  })

  it('event list cards keep object-cover for thumbnails', () => {
    expect(eventCard).toContain('object-cover')
  })
})
