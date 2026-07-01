import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Page, Locator } from 'playwright'
import { executeWithRepair } from './execute-with-repair.js'
import { AuditLogger } from '../reporting/audit-logger.js'
import { RepairBudgetExhaustedError } from '../types.js'
import type { RepairBudget, AuditEvent } from '../types.js'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync, unlinkSync } from 'node:fs'

vi.mock('./selector-strategy.js', () => ({
  ResilientSelector: { find: vi.fn() },
}))

vi.mock('./selector-repair.js', () => ({
  SelectorRepairEngine: vi.fn().mockImplementation(() => ({
    repairSelector: vi.fn(),
  })),
}))

import { ResilientSelector } from './selector-strategy.js'
import { SelectorRepairEngine } from './selector-repair.js'

function makeLocator(): Locator {
  return { click: vi.fn().mockResolvedValue(undefined) } as unknown as Locator
}

function makePage(): Page {
  return { locator: vi.fn(() => makeLocator()) } as unknown as Page
}

function makeOpts(logger: AuditLogger) {
  return { automation: 'github', actionName: 'click', target: 'user@example.com', run_id: 'r1', logger }
}

describe('executeWithRepair', () => {
  let logFile: string
  let logger: AuditLogger
  let budget: RepairBudget
  let events: AuditEvent[]

  beforeEach(() => {
    logFile = join(tmpdir(), `ewr-test-${Date.now()}.jsonl`)
    logger = new AuditLogger(logFile)
    budget = { used: 0, max: 3 }
    events = []
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (existsSync(logFile)) unlinkSync(logFile)
  })

  it('succeeds on happy path — no repair needed', async () => {
    const locator = makeLocator()
    vi.mocked(ResilientSelector.find).mockResolvedValue({
      locator, strategyUsed: 'role', failedStrategies: [],
    })

    const action = vi.fn().mockResolvedValue('done')
    const result = await executeWithRepair(makePage(), 'click submit', action, { role: 'button' }, budget, events, makeOpts(logger))

    expect(result).toBe('done')
    expect(budget.used).toBe(0)
    expect(events).toHaveLength(1)
    expect(events[0]!.outcome).toBe('success')
    expect(events[0]!.repairTriggered).toBe(false)
  })

  it('triggers Claude repair when strategy chain returns null', async () => {
    vi.mocked(ResilientSelector.find).mockResolvedValue(null)

    const page = makePage()
    const repairedLocator = makeLocator()
    vi.mocked(page.locator).mockReturnValue(repairedLocator)

    const repairInstance = {
      repairSelector: vi.fn().mockResolvedValue({ selector: '.btn', strategy: 'css', confidence: 0.9 }),
    }
    vi.mocked(SelectorRepairEngine).mockImplementation(() => repairInstance as unknown as InstanceType<typeof SelectorRepairEngine>)

    const action = vi.fn().mockResolvedValue('repaired')
    const result = await executeWithRepair(page, 'click submit', action, { role: 'button' }, budget, events, makeOpts(logger))

    expect(result).toBe('repaired')
    expect(budget.used).toBeGreaterThan(0)
    expect(events[0]!.repairTriggered).toBe(true)
    expect(events[0]!.repairedSelector).toBe('.btn')
  })

  it('throws RepairBudgetExhaustedError when budget already consumed', async () => {
    vi.mocked(ResilientSelector.find).mockResolvedValue(null)
    budget.used = budget.max

    await expect(
      executeWithRepair(makePage(), 'click', vi.fn(), { role: 'button' }, budget, events, makeOpts(logger))
    ).rejects.toThrow(RepairBudgetExhaustedError)

    expect(events[0]!.outcome).toBe('failure')
  })

  it('emits failure when all repair attempts return null', async () => {
    vi.mocked(ResilientSelector.find).mockResolvedValue(null)
    const repairInstance = { repairSelector: vi.fn().mockResolvedValue(null) }
    vi.mocked(SelectorRepairEngine).mockImplementation(() => repairInstance as unknown as InstanceType<typeof SelectorRepairEngine>)

    await expect(
      executeWithRepair(makePage(), 'click', vi.fn(), { role: 'button' }, budget, events, makeOpts(logger))
    ).rejects.toThrow(/all strategies and repairs failed/)

    expect(events[0]!.outcome).toBe('failure')
    expect(events[0]!.repairTriggered).toBe(true)
  })
})
