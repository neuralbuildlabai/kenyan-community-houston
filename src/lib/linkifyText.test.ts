import { describe, expect, it } from 'vitest'
import { linkifyText } from './linkifyText'

describe('linkifyText', () => {
  it('returns no segments for empty input', () => {
    expect(linkifyText('')).toEqual([])
    expect(linkifyText(null)).toEqual([])
  })

  it('leaves text without URLs as one text segment', () => {
    expect(linkifyText('Sunday, January 17')).toEqual([{ type: 'text', value: 'Sunday, January 17' }])
  })

  it('turns a WhatsApp invite into a link and keeps surrounding text', () => {
    const segs = linkifyText('Join: https://chat.whatsapp.com/JxuqcslpG5cAHEQSgHH5Li\nThanks')
    expect(segs).toEqual([
      { type: 'text', value: 'Join: ' },
      {
        type: 'link',
        value: 'https://chat.whatsapp.com/JxuqcslpG5cAHEQSgHH5Li',
        href: 'https://chat.whatsapp.com/JxuqcslpG5cAHEQSgHH5Li',
      },
      { type: 'text', value: '\nThanks' },
    ])
  })

  it('keeps trailing punctuation out of the link', () => {
    const segs = linkifyText('See https://example.org/page. Then (www.example.com).')
    expect(segs).toEqual([
      { type: 'text', value: 'See ' },
      { type: 'link', value: 'https://example.org/page', href: 'https://example.org/page' },
      { type: 'text', value: '. Then (' },
      { type: 'link', value: 'www.example.com', href: 'https://www.example.com' },
      { type: 'text', value: ').' },
    ])
  })

  it('does not link non-http schemes', () => {
    expect(linkifyText('javascript:alert(1)')).toEqual([{ type: 'text', value: 'javascript:alert(1)' }])
  })
})
