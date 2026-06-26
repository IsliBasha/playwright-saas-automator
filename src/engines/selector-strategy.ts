import type { Page, Locator } from 'playwright'

export enum SelectorStrategy {
  ARIA_ROLE    = 'aria_role',
  ARIA_LABEL   = 'aria_label',
  TEXT_CONTENT = 'text_content',
  DATA_TESTID  = 'data_testid',
  CSS_FALLBACK = 'css_fallback',
}

export interface SelectorHint {
  role?: string
  name?: string
  label?: string
  text?: string
  testId?: string
  fallbackCss?: string
}

export interface SelectorResult {
  locator: Locator
  strategy: SelectorStrategy
}

/** Tries ARIA strategies in priority order. Never uses XPath or fragile CSS. */
export class ResilientSelector {
  async find(page: Page, hint: SelectorHint): Promise<SelectorResult> {
    // TODO P2.1: Try each strategy in SelectorStrategy enum order
    void page; void hint
    throw new Error('Not implemented')
  }
}
