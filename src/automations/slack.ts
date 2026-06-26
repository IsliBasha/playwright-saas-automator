import type { Browser } from 'playwright'
import { SelectorRepairEngine } from '../engines/selector-repair.js'

export class SlackAutomation {
  readonly name = 'slack'
  private readonly repair = new SelectorRepairEngine()

  constructor(private readonly browser: Browser) {}

  async inviteToChannel(workspaceUrl: string, channelName: string, email: string): Promise<void> {
    // TODO P2.4: Add to channel via UI (not API)
    void workspaceUrl; void channelName; void email; void this.browser; void this.repair
    throw new Error('Not implemented')
  }

  async removeFromChannel(workspaceUrl: string, channelName: string, email: string): Promise<void> {
    void workspaceUrl; void channelName; void email
    throw new Error('Not implemented')
  }
}
