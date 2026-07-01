import { describe, it, expect } from 'vitest'
import { scrubAriaSnapshot } from './selector-repair.js'

describe('scrubAriaSnapshot', () => {
  it('replaces email addresses', () => {
    const input = '- text "john.doe@acme-corp.com"'
    expect(scrubAriaSnapshot(input)).toBe('- text "[email]"')
  })

  it('replaces long no-space tokens', () => {
    const token = 'ghp_' + 'a'.repeat(36)
    const input = `- text "${token}"`
    expect(scrubAriaSnapshot(input)).not.toContain(token)
    expect(scrubAriaSnapshot(input)).toContain('[token]')
  })

  it('replaces UUIDs', () => {
    const input = '- text "workspace-id: 550e8400-e29b-41d4-a716-446655440000"'
    expect(scrubAriaSnapshot(input)).toContain('[id]')
    expect(scrubAriaSnapshot(input)).not.toContain('550e8400')
  })

  it('replaces @mentions', () => {
    const input = '- listitem "@johndoe · member"'
    expect(scrubAriaSnapshot(input)).toContain('[@user]')
    expect(scrubAriaSnapshot(input)).not.toContain('@johndoe')
  })

  it('preserves button labels and headings with spaces', () => {
    const input = [
      '- button "Invite member"',
      '- heading "Organization members" [level=2]',
      '- textbox "Search by username or email"',
    ].join('\n')
    const result = scrubAriaSnapshot(input)
    expect(result).toContain('Invite member')
    expect(result).toContain('Organization members')
    expect(result).toContain('Search by username or email')
  })

  it('handles a realistic mixed snapshot', () => {
    const input = [
      '- heading "Members" [level=1]',
      '- button "Invite member"',
      '- listitem "@alice · alice@company.com · admin"',
      '- listitem "@bob · bob@company.com · member"',
    ].join('\n')
    const result = scrubAriaSnapshot(input)
    expect(result).toContain('Invite member')
    expect(result).toContain('Members')
    expect(result).not.toContain('@alice')
    expect(result).not.toContain('alice@company.com')
    expect(result).not.toContain('@bob')
    expect(result).not.toContain('bob@company.com')
  })
})
