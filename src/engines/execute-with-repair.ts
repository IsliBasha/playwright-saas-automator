import type { Page, Locator } from 'playwright'
import { ResilientSelector } from './selector-strategy.js'
import { SelectorRepairEngine } from './selector-repair.js'
import { AuditLogger } from '../reporting/audit-logger.js'
import {
  RepairBudgetExhaustedError,
  type SelectorHint,
  type RepairBudget,
  type AuditEvent,
} from '../types.js'

const MAX_REPAIR_ATTEMPTS = 3

type Opts = { automation: string; actionName: string; target: string; run_id: string; logger: AuditLogger }

function buildEvent(
  outcome: 'success' | 'failure',
  intent: string,
  start: number,
  opts: Opts,
  extras: Partial<AuditEvent> = {},
): AuditEvent {
  return {
    timestamp: new Date().toISOString(),
    run_id: opts.run_id,
    intent,
    automation: opts.automation,
    action: opts.actionName,
    target: opts.target,
    strategiesAttempted: [],
    strategySucceeded: null,
    repairTriggered: false,
    repairedSelector: null,
    confidence: null,
    outcome,
    durationMs: Date.now() - start,
    ...extras,
  }
}

async function tryHappyPath<T>(
  action: (locator: Locator) => Promise<T>,
  found: NonNullable<Awaited<ReturnType<typeof ResilientSelector.find>>>,
): Promise<{ result: T } | { staleness: string }> {
  try {
    const result = await action(found.locator)
    return { result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { staleness: msg }
  }
}

async function tryRepairPath<T>(
  page: Page,
  intent: string,
  action: (locator: Locator) => Promise<T>,
  budget: RepairBudget,
  repair: SelectorRepairEngine,
): Promise<{ result: T; selector: string; confidence: number } | null> {
  for (let attempt = 0; attempt < MAX_REPAIR_ATTEMPTS; attempt++) {
    budget.used++
    const repairResult = await repair.repairSelector(page, intent)
    if (repairResult === null) {
      if (budget.used >= budget.max) return null
      continue
    }
    try {
      const repairedLocator = page.locator(repairResult.selector)
      const result = await action(repairedLocator)
      return { result, selector: repairResult.selector, confidence: repairResult.confidence }
    } catch {
      if (budget.used >= budget.max) return null
    }
  }
  return null
}

export async function executeWithRepair<T>(
  page: Page,
  intent: string,
  action: (locator: Locator) => Promise<T>,
  hint: SelectorHint,
  budget: RepairBudget,
  auditLog: AuditEvent[],
  opts: Opts,
): Promise<T> {
  const start = Date.now()
  const repair = new SelectorRepairEngine()

  const emit = (outcome: 'success' | 'failure', extras: Partial<AuditEvent> = {}) => {
    const event = buildEvent(outcome, intent, start, opts, extras)
    auditLog.push(event)
    opts.logger.log(event)
    return event
  }

  // ── Happy path: ARIA strategy chain ──────────────────────────────────────
  const found = await ResilientSelector.find(page, hint)
  if (found !== null) {
    const happy = await tryHappyPath(action, found)
    if ('result' in happy) {
      emit('success', {
        strategiesAttempted: [...found.failedStrategies, found.strategyUsed],
        strategySucceeded: found.strategyUsed,
      })
      return happy.result
    }
    // Log why we fell through before attempting repair
    process.stderr.write(`[repair] happy-path action failed (${happy.staleness}), attempting repair for: ${intent}\n`)
  }

  const failedStrategies = found
    ? found.failedStrategies
    : (Object.keys(hint) as (keyof SelectorHint)[]).filter(k => hint[k] !== undefined)

  // ── Repair path ───────────────────────────────────────────────────────────
  if (budget.used >= budget.max) {
    emit('failure', { strategiesAttempted: failedStrategies, error: 'repair budget exhausted' })
    throw new RepairBudgetExhaustedError(budget.max)
  }

  const repaired = await tryRepairPath(page, intent, action, budget, repair)

  if (repaired !== null) {
    emit('success', {
      strategiesAttempted: failedStrategies,
      strategySucceeded: null,
      repairTriggered: true,
      repairedSelector: repaired.selector,
      confidence: repaired.confidence,
    })
    return repaired.result
  }

  emit('failure', {
    strategiesAttempted: failedStrategies,
    repairTriggered: true,
    error: 'all repair attempts failed',
  })
  throw new Error(`executeWithRepair: all strategies and repairs failed for intent "${intent}"`)
}
