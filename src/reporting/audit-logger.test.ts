import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { unlinkSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AuditLogger, auditEvents } from './audit-logger.js'
import type { AuditEvent } from '../types.js'

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    timestamp: '2026-07-02T00:00:00.000Z',
    run_id: 'test01',
    intent: 'click submit button',
    automation: 'github',
    action: 'provision',
    target: 'user@example.com',
    strategiesAttempted: ['role'],
    strategySucceeded: 'role',
    repairTriggered: false,
    repairedSelector: null,
    confidence: null,
    outcome: 'success',
    durationMs: 120,
    ...overrides,
  }
}

describe('AuditLogger', () => {
  let logFile: string
  let logger: AuditLogger

  beforeEach(() => {
    logFile = join(tmpdir(), `test-audit-${Date.now()}.jsonl`)
    logger = new AuditLogger(logFile)
  })

  afterEach(() => {
    if (existsSync(logFile)) unlinkSync(logFile)
  })

  it('writes valid JSONL to the log file', () => {
    logger.log(makeEvent())
    const lines = readFileSync(logFile, 'utf8').trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0]!)).toMatchObject({ outcome: 'success', automation: 'github' })
  })

  it('appends multiple events as separate lines', () => {
    logger.log(makeEvent({ run_id: 'a1' }))
    logger.log(makeEvent({ run_id: 'a2', outcome: 'failure' }))
    const lines = readFileSync(logFile, 'utf8').trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[1]!).outcome).toBe('failure')
  })

  it('emits event on the auditEvents emitter', () => {
    const received: AuditEvent[] = []
    auditEvents.once('event', (e) => received.push(e))
    logger.log(makeEvent())
    expect(received).toHaveLength(1)
    expect(received[0]!.run_id).toBe('test01')
  })

  it('generates summary report for a run', () => {
    const events: AuditEvent[] = [
      makeEvent({ run_id: 'r1', outcome: 'success' }),
      makeEvent({ run_id: 'r1', outcome: 'failure' }),
      makeEvent({ run_id: 'r2', outcome: 'success' }),
    ]
    const report = logger.generateSummaryReport('r1', events)
    expect(report).toContain('r1')
    expect(report).toContain('2 actions')
    expect(report).toContain('1 failures')
  })

  it('returns "no events found" for unknown run_id', () => {
    const report = logger.generateSummaryReport('nope', [])
    expect(report).toBe('Run nope: no events found')
  })
})
