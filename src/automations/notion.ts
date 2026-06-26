import type { Browser } from 'playwright'
import { SelectorRepairEngine } from '../engines/selector-repair.js'

export class NotionAutomation {
  readonly name = 'notion'
  private readonly repair = new SelectorRepairEngine()

  constructor(private readonly browser: Browser) {}

  async provisionUser(workspaceUrl: string, email: string, role: 'member' | 'guest'): Promise<void> {
    // TODO P2.4: Settings > Members, invite via UI
    void workspaceUrl; void email; void role; void this.browser; void this.repair
    throw new Error('Not implemented')
  }

  async deprovisionUser(workspaceUrl: string, email: string): Promise<void> {
    void workspaceUrl; void email
    throw new Error('Not implemented')
  }
}
