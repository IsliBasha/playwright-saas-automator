import type { BrowserContext } from 'playwright'
import type { AutomationResult, AutomationAction } from '../types.js'
import { GitHubAutomation } from './github.js'
import { NotionAutomation } from './notion.js'
import { SlackAutomation } from './slack.js'

const SUPPORTED_AUTOMATIONS = ['github', 'notion', 'slack'] as const
export type AutomationName = typeof SUPPORTED_AUTOMATIONS[number]

interface Automation {
  provision(context: BrowserContext, params: Record<string, string>): Promise<AutomationResult>
  deprovision(context: BrowserContext, params: Record<string, string>): Promise<AutomationResult>
}

export class AutomationRegistry {
  private readonly automations: Record<AutomationName, Automation> = {
    github: new GitHubAutomation(),
    notion: new NotionAutomation(),
    slack: new SlackAutomation(),
  }

  async execute(
    name: string,
    action: AutomationAction,
    context: BrowserContext,
    params: Record<string, string>,
  ): Promise<AutomationResult> {
    if (!SUPPORTED_AUTOMATIONS.includes(name as AutomationName)) {
      throw new Error(`Unknown automation: ${name}. Supported: ${SUPPORTED_AUTOMATIONS.join(', ')}`)
    }
    const automation = this.automations[name as AutomationName]
    return action === 'provision'
      ? automation.provision(context, params)
      : automation.deprovision(context, params)
  }

  listAutomations(): AutomationName[] {
    return [...SUPPORTED_AUTOMATIONS]
  }
}
