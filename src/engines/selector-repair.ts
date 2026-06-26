import type { Page } from 'playwright'
import Anthropic from '@anthropic-ai/sdk'

const MAX_REPAIRS = parseInt(process.env.MAX_CLAUDE_REPAIRS_PER_RUN ?? '10', 10)

export interface RepairResult {
  selector: string
  strategy: string
  confidence: number
}

/**
 * When all ARIA strategies fail, captures the accessibility tree and
 * asks Claude Haiku to derive a working selector from the element's intent.
 */
export class SelectorRepairEngine {
  private repairCount = 0
  private readonly client = new Anthropic()

  async captureAriaTree(page: Page): Promise<string> {
    const snapshot = await page.accessibility.snapshot()
    return JSON.stringify(snapshot, null, 2)
  }

  async repairSelector(page: Page, intent: string): Promise<string | null> {
    if (this.repairCount >= MAX_REPAIRS) return null
    // TODO P2.2: Call claude-haiku-4-5-20251001 with aria tree + intent
    // Return null if confidence < 0.7
    void page; void intent; void this.client
    throw new Error('Not implemented')
  }

  async executeWithRepair<T>(page: Page, intent: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action()
    } catch {
      // TODO P2.2: repairSelector → retry, max 3 attempts, log to repairs.jsonl
      void page; void intent
      throw new Error('Selector repair not implemented')
    }
  }
}
