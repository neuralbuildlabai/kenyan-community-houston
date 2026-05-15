import { describe, expect, it } from 'vitest'
import {
  COMMUNITY_MSG_PROFANITY,
  COMMUNITY_MSG_PRIVATE,
  COMMUNITY_MSG_SAFETY,
  containsBlockedCommunityLanguage,
  normalizeCommunityText,
  validateCommunityContent,
  validatePublicCommunityContent,
} from './communityModeration'

describe('communityModeration', () => {
  it('clean community message passes public validation', () => {
    const r = validatePublicCommunityContent('Looking forward to the picnic this Saturday!')
    expect(r.ok).toBe(true)
  })

  it('rejects profanity', () => {
    const r = validatePublicCommunityContent('This is fuck nonsense')
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.reason).toBe(COMMUNITY_MSG_PROFANITY)
  })

  it('rejects derogatory / slur language', () => {
    const r = validatePublicCommunityContent('You are a retard')
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.reason).toBe(COMMUNITY_MSG_PROFANITY)
  })

  it('rejects mixed-case blocked word', () => {
    expect(containsBlockedCommunityLanguage('What the FuCk')).toBe(true)
  })

  it('rejects spaced or punctuated variants when dense match applies', () => {
    expect(containsBlockedCommunityLanguage('sh i t')).toBe(true)
  })

  it('rejects likely phone numbers in public validation', () => {
    const r = validatePublicCommunityContent('Call me at 713-555-0101 tomorrow')
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.reason).toBe(COMMUNITY_MSG_PRIVATE)
  })

  it('rejects simple street-style address in public validation', () => {
    const r = validatePublicCommunityContent('I live at 123 Main Street in Houston')
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.reason).toBe(COMMUNITY_MSG_PRIVATE)
  })

  it('rejects threat-style phrases', () => {
    const r = validateCommunityContent('I will kill you at the meeting')
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.reason).toBe(COMMUNITY_MSG_SAFETY)
  })

  it('rejection message does not expose blocked-term list', () => {
    const r = validatePublicCommunityContent('this is shit')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).not.toMatch(/shit/i)
      expect(r.reason).toBe(COMMUNITY_MSG_PROFANITY)
    }
  })

  it('normalizes text for checks', () => {
    expect(normalizeCommunityText('  Hello!!!   World  ')).toBe('hello world')
  })
})
