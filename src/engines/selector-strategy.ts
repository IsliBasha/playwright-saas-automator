import type { Page } from 'playwright'
import type { SelectorHint, SelectorResult } from '../types.js'

const PROBE_TIMEOUT = 300

export class ResilientSelector {
  static async find(page: Page, hint: SelectorHint): Promise<SelectorResult | null> {
    const failed: string[] = []

    if (hint.role !== undefined) {
      const loc = page.getByRole(hint.role, hint.label ? { name: hint.label } : undefined)
      if (await loc.first().isVisible({ timeout: PROBE_TIMEOUT }).catch(() => false)) {
        return { locator: loc.first(), strategyUsed: 'role', failedStrategies: failed }
      }
      failed.push('role')
    }

    if (hint.label !== undefined) {
      const loc = page.getByLabel(hint.label)
      if (await loc.first().isVisible({ timeout: PROBE_TIMEOUT }).catch(() => false)) {
        return { locator: loc.first(), strategyUsed: 'label', failedStrategies: failed }
      }
      failed.push('label')
    }

    if (hint.text !== undefined) {
      const loc = page.getByText(hint.text, { exact: false })
      if (await loc.first().isVisible({ timeout: PROBE_TIMEOUT }).catch(() => false)) {
        return { locator: loc.first(), strategyUsed: 'text', failedStrategies: failed }
      }
      failed.push('text')
    }

    if (hint.testId !== undefined) {
      const loc = page.getByTestId(hint.testId)
      if (await loc.first().isVisible({ timeout: PROBE_TIMEOUT }).catch(() => false)) {
        return { locator: loc.first(), strategyUsed: 'testId', failedStrategies: failed }
      }
      failed.push('testId')
    }

    if (hint.css !== undefined) {
      const loc = page.locator(hint.css)
      if (await loc.first().isVisible({ timeout: PROBE_TIMEOUT }).catch(() => false)) {
        return { locator: loc.first(), strategyUsed: 'css', failedStrategies: failed }
      }
      failed.push('css')
    }

    return null
  }
}
