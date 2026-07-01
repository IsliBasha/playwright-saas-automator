import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AutomationRegistry } from './registry.js'
import type { BrowserContext } from 'playwright'

vi.mock('./github.js', () => ({
  GitHubAutomation: vi.fn().mockImplementation(() => ({
    provision:   vi.fn().mockResolvedValue({ success: true,  run_id: 'gh01', automation: 'github', action: 'provision',   target: 'jdoe',   durationMs: 100, repairsUsed: 0, events: [] }),
    deprovision: vi.fn().mockResolvedValue({ success: true,  run_id: 'gh02', automation: 'github', action: 'deprovision', target: 'jdoe',   durationMs: 80,  repairsUsed: 0, events: [] }),
  })),
}))

vi.mock('./notion.js', () => ({
  NotionAutomation: vi.fn().mockImplementation(() => ({
    provision:   vi.fn().mockResolvedValue({ success: true, run_id: 'no01', automation: 'notion', action: 'provision',   target: 'u@e.com', durationMs: 90, repairsUsed: 0, events: [] }),
    deprovision: vi.fn().mockResolvedValue({ success: true, run_id: 'no02', automation: 'notion', action: 'deprovision', target: 'u@e.com', durationMs: 70, repairsUsed: 0, events: [] }),
  })),
}))

vi.mock('./slack.js', () => ({
  SlackAutomation: vi.fn().mockImplementation(() => ({
    provision:   vi.fn().mockResolvedValue({ success: true, run_id: 'sl01', automation: 'slack', action: 'provision',   target: 'u@e.com', durationMs: 95, repairsUsed: 0, events: [] }),
    deprovision: vi.fn().mockResolvedValue({ success: true, run_id: 'sl02', automation: 'slack', action: 'deprovision', target: 'u@e.com', durationMs: 60, repairsUsed: 0, events: [] }),
  })),
}))

const mockContext = {} as BrowserContext

describe('AutomationRegistry', () => {
  let registry: AutomationRegistry

  beforeEach(() => {
    registry = new AutomationRegistry()
  })

  it('lists all supported automations', () => {
    expect(registry.listAutomations()).toEqual(['github', 'notion', 'slack'])
  })

  it('routes github provision', async () => {
    const result = await registry.execute('github', 'provision', mockContext, { orgName: 'acme', username: 'jdoe', role: 'member' })
    expect(result.success).toBe(true)
    expect(result.automation).toBe('github')
    expect(result.action).toBe('provision')
  })

  it('routes github deprovision', async () => {
    const result = await registry.execute('github', 'deprovision', mockContext, { orgName: 'acme', username: 'jdoe' })
    expect(result.action).toBe('deprovision')
  })

  it('routes notion provision', async () => {
    const result = await registry.execute('notion', 'provision', mockContext, { workspaceUrl: 'https://notion.so/ws', email: 'u@e.com', role: 'member' })
    expect(result.automation).toBe('notion')
  })

  it('routes slack provision', async () => {
    const result = await registry.execute('slack', 'provision', mockContext, { workspaceUrl: 'https://app.slack.com/client/T01', channelName: 'eng', email: 'u@e.com' })
    expect(result.automation).toBe('slack')
  })

  it('throws on unknown automation name', async () => {
    await expect(
      registry.execute('jira', 'provision', mockContext, {})
    ).rejects.toThrow('Unknown automation: jira')
  })
})
