import type { Browser } from 'playwright'
import type { AuditLog } from './registry.js'
import { SelectorRepairEngine } from '../engines/selector-repair.js'

export class GitHubAutomation {
  readonly name = 'github'
  private readonly repair = new SelectorRepairEngine()

  constructor(private readonly browser: Browser) {}

  async provisionUser(orgName: string, username: string, role: 'member' | 'admin'): Promise<void> {
    // TODO P2.3: Navigate github.com/orgs/<orgName>/people, invite via UI
    void orgName; void username; void role; void this.browser; void this.repair
    throw new Error('Not implemented')
  }

  async deprovisionUser(orgName: string, username: string): Promise<void> {
    void orgName; void username
    throw new Error('Not implemented')
  }

  async execute(_action: string, _params: Record<string, unknown>): Promise<AuditLog> {
    throw new Error('Not implemented')
  }
}
