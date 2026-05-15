import { describe, expect, it } from 'vitest'
import { formatCommunityDisplayName, getCommunityInitials } from './memberDisplayName'

describe('memberDisplayName', () => {
  it('formats Sarah Otieno as Sarah O.', () => {
    expect(formatCommunityDisplayName('Sarah', 'Otieno')).toBe('Sarah O.')
  })

  it('formats Godfrey Omoke as Godfrey O.', () => {
    expect(formatCommunityDisplayName('Godfrey', 'Omoke')).toBe('Godfrey O.')
  })

  it('shows first name only when no last name', () => {
    expect(formatCommunityDisplayName('Jane', '')).toBe('Jane')
  })

  it('returns Community Member when blank', () => {
    expect(formatCommunityDisplayName('', '')).toBe('Community Member')
  })

  it('returns Community Member when only last name', () => {
    expect(formatCommunityDisplayName('', 'Smith')).toBe('Community Member')
  })

  it('trims whitespace', () => {
    expect(formatCommunityDisplayName('  Sara  ', '  Omoke ')).toBe('Sara O.')
  })

  it('does not output full last name', () => {
    const out = formatCommunityDisplayName('Alex', 'Mwangi')
    expect(out).not.toContain('Mwangi')
    expect(out).toContain('M.')
  })

  it('getCommunityInitials uses first and last initial when both exist', () => {
    expect(getCommunityInitials('Sara', 'Omoke')).toBe('SO')
  })
})
