import type { Page } from 'playwright'
import Anthropic from '@anthropic-ai/sdk'
import type { RepairResult } from '../types.js'

const RepairResponseSchema = {
  parse(raw: unknown): RepairResult {
    if (typeof raw !== 'object' || raw === null) throw new Error('Invalid repair response')
    const r = raw as Record<string, unknown>
    if (typeof r['selector'] !== 'string') throw new Error('Missing selector')
    if (typeof r['strategy'] !== 'string') throw new Error('Missing strategy')
    if (typeof r['confidence'] !== 'number') throw new Error('Missing confidence')
    return { selector: r['selector'], strategy: r['strategy'], confidence: r['confidence'] }
  },
}

const MIN_REPAIR_CONFIDENCE = 0.7

const SYSTEM_PROMPT = `You are a Playwright automation expert.
Given an accessibility tree snapshot and a human-readable description of the element to locate,
return ONLY a JSON object with this shape:
{ "selector": string, "strategy": string, "confidence": number }

Rules:
- selector must use getByRole/getByLabel/getByText Playwright locator syntax
- strategy is one of: role | label | text | testId
- confidence is 0.0–1.0 (your certainty the selector will match)
- Return only the JSON object, no explanation, no markdown fences`

export class SelectorRepairEngine {
  private readonly client: Anthropic

  constructor(client?: Anthropic) {
    this.client = client ?? new Anthropic()
  }

  async captureAriaTree(page: Page): Promise<string> {
    return page.ariaSnapshot()
  }

  async repairSelector(page: Page, intent: string): Promise<RepairResult | null> {
    const ariaTree = await this.captureAriaTree(page)

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Intent: ${intent}\n\nAccessibility tree:\n${ariaTree}`,
      }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    try {
      const parsed = RepairResponseSchema.parse(JSON.parse(text))
      if (parsed.confidence < MIN_REPAIR_CONFIDENCE) {
        process.stderr.write(`[repair] low confidence (${parsed.confidence}) for: ${intent}\n`)
        return null
      }
      return parsed
    } catch (err) {
      process.stderr.write(`[repair] parse failed for: ${intent} — ${err instanceof Error ? err.message : String(err)}\n`)
      return null
    }
  }
}
