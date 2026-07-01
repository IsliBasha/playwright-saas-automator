import type { Page, BrowserContext, Locator } from 'playwright'
import { executeWithRepair } from '../engines/execute-with-repair.js'
import { AuditLogger } from '../reporting/audit-logger.js'
import { randomUUID } from 'node:crypto'
import type { SelectorHint, RepairBudget, AuditEvent, AutomationResult, AutomationAction } from '../types.js'

const DEFAULT_BUDGET = parseInt(process.env.MAX_CLAUDE_REPAIRS_PER_RUN ?? '10', 10)

export type Run = { run_id: string; budget: RepairBudget; events: AuditEvent[]; start: number }

export abstract class BaseAutomation {
  protected readonly logger: AuditLogger
  protected readonly name: string

  constructor(name: string, logger?: AuditLogger) {
    this.name = name
    this.logger = logger ?? new AuditLogger()
  }

  protected createRun(): Run {
    return {
      run_id: randomUUID().slice(0, 8),
      budget: { used: 0, max: DEFAULT_BUDGET },
      events: [],
      start: Date.now(),
    }
  }

  protected buildResult(run: Run, action: AutomationAction, target: string, success: boolean): AutomationResult {
    return {
      success,
      run_id: run.run_id,
      automation: this.name,
      action,
      target,
      durationMs: Date.now() - run.start,
      repairsUsed: run.budget.used,
      events: run.events,
    }
  }

  protected interact<T>(
    page: Page,
    intent: string,
    action: (locator: Locator) => Promise<T>,
    hint: SelectorHint,
    run: Run,
    actionName: string,
    target: string,
  ): Promise<T> {
    return executeWithRepair(page, intent, action, hint, run.budget, run.events, {
      automation: this.name,
      actionName,
      target,
      run_id: run.run_id,
      logger: this.logger,
    })
  }

  protected navigate(page: Page, url: string, timeout = 30_000): Promise<void> {
    return page.goto(url, { waitUntil: 'networkidle', timeout }).then(() => undefined)
  }

  abstract provision(context: BrowserContext, params: Record<string, string>): Promise<AutomationResult>
  abstract deprovision(context: BrowserContext, params: Record<string, string>): Promise<AutomationResult>
}
