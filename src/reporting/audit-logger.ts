import { appendFileSync } from 'node:fs'
import type { AuditLog } from '../automations/registry.js'

const LOG_FILE = 'repairs.jsonl'

export class AuditLogger {
  write(log: AuditLog): void {
    appendFileSync(LOG_FILE, JSON.stringify(log) + '\n')
  }

  generateSummaryReport(runId: string, logs: AuditLog[]): string {
    const runLogs = logs.filter(l => l.run_id === runId)
    const repairs = runLogs.flatMap(l => l.repairs)
    return [
      `Run ${runId} | ${runLogs[0]?.timestamp ?? 'unknown'}`,
      ...runLogs.map(l => `  ${l.automation} ${l.action} -> ${l.result}${l.repairs.length ? ` (${l.repairs.length} repaired)` : ''}`),
      `Total repairs: ${repairs.length}`,
    ].join('\n')
  }
}
