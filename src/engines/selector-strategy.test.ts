import { describe, it, expect, vi } from 'vitest'
import { ResilientSelector } from './selector-strategy.js'
import type { Page, Locator } from 'playwright'

function makeLocator(visible: boolean): Locator {
  const loc: Partial<Locator> = {
    isVisible: vi.fn().mockResolvedValue(visible),
    first: () => loc as Locator,
  }
  return loc as Locator
}

function makePage(overrides: Partial<Record<'role' | 'label' | 'text' | 'testId' | 'css', Locator>> = {}): Page {
  const invisible = makeLocator(false)
  return {
    getByRole:  vi.fn(() => overrides['role']   ?? invisible),
    getByLabel: vi.fn(() => overrides['label']  ?? invisible),
    getByText:  vi.fn(() => overrides['text']   ?? invisible),
    getByTestId:vi.fn(() => overrides['testId'] ?? invisible),
    locator:    vi.fn(() => overrides['css']    ?? invisible),
  } as unknown as Page
}

describe('ResilientSelector.find', () => {
  it('returns null when no hint strategy matches', async () => {
    const page = makePage()
    const result = await ResilientSelector.find(page, { role: 'button', text: 'Submit' })
    expect(result).toBeNull()
  })

  it('resolves via role first', async () => {
    const page = makePage({ role: makeLocator(true) })
    const result = await ResilientSelector.find(page, { role: 'button', label: 'Submit' })
    expect(result).not.toBeNull()
    expect(result!.strategyUsed).toBe('role')
    expect(result!.failedStrategies).toEqual([])
  })

  it('falls through to label when role invisible', async () => {
    const page = makePage({ label: makeLocator(true) })
    const result = await ResilientSelector.find(page, { role: 'button', label: 'Submit' })
    expect(result!.strategyUsed).toBe('label')
    expect(result!.failedStrategies).toContain('role')
  })

  it('falls through to text after role + label fail', async () => {
    const page = makePage({ text: makeLocator(true) })
    const result = await ResilientSelector.find(page, { role: 'button', label: 'Submit', text: 'Click me' })
    expect(result!.strategyUsed).toBe('text')
    expect(result!.failedStrategies).toEqual(['role', 'label'])
  })

  it('resolves via css when it is the only hint', async () => {
    const page = makePage({ css: makeLocator(true) })
    const result = await ResilientSelector.find(page, { css: '.btn' })
    expect(result!.strategyUsed).toBe('css')
    expect(result!.failedStrategies).toEqual([])
  })

  it('skips strategies absent from hint', async () => {
    const page = makePage({ testId: makeLocator(true) })
    const result = await ResilientSelector.find(page, { testId: 'submit-btn' })
    expect(result!.strategyUsed).toBe('testId')
    expect(result!.failedStrategies).toEqual([])
  })
})
