import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { EventEmitter } from 'node:events'
import type { AuditEvent } from '../types.js'

export const auditEvents = new EventEmitter()

const LOG_FILE = process.env.AUDIT_LOG_FILE ?? 'audit.jsonl'

function ensureDir(file: string): void {
  try { mkdirSync(dirname(file), { recursive: true }) } catch { /* exists */ }
}

export class AuditLogger {
  private readonly file: string

  constructor(file = LOG_FILE) {
    this.file = file
    ensureDir(file)
  }

  log(event: AuditEvent): void {
    const line = JSON.stringify(event) + '\n'
    appendFileSync(this.file, line)
    auditEvents.emit('event', event)
  }

  generateSummaryReport(runId: string, events: AuditEvent[]): string {
    const run = events.filter(e => e.run_id === runId)
    if (run.length === 0) return `Run ${runId}: no events found`

    const repairs = run.filter(e => e.repairTriggered)
    const failures = run.filter(e => e.outcome === 'failure')
    const lines = [
      `Run ${runId} | ${run[0]!.timestamp}`,
      `  ${run.length} actions | ${repairs.length} repairs | ${failures.length} failures`,
      ...run.map(e => {
        const status = e.outcome === 'success' ? '✓' : '✗'
        const repair = e.repairTriggered ? ' [repaired]' : ''
        return `  ${status} ${e.automation} ${e.action} ${e.target}${repair} (${e.durationMs}ms)`
      }),
    ]
    return lines.join('\n')
  }
}
