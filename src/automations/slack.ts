import type { BrowserContext } from 'playwright'
import { BaseAutomation } from './base-automation.js'
import { SlackProvisionSchema, SlackDeprovisionSchema, type AutomationResult } from '../types.js'

export class SlackAutomation extends BaseAutomation {
  constructor() { super('slack') }

  async provision(context: BrowserContext, params: Record<string, string>): Promise<AutomationResult> {
    const { workspaceUrl, channelName, email } = SlackProvisionSchema.parse(params)
    const run = this.createRun()
    const page = await context.newPage()

    try {
      await this.navigate(page, workspaceUrl)

      await this.interact(page,
        `Channel link for #${channelName} in sidebar`,
        loc => loc.click(),
        { role: 'link', text: channelName },
        run, 'navigate_channel', email)

      await this.interact(page,
        'Add people button in Slack channel header',
        loc => loc.click(),
        { role: 'button', label: 'Add people' },
        run, 'click_add_people', email)

      await this.interact(page,
        'Search field in Slack invite dialog',
        loc => loc.fill(email),
        { role: 'textbox', label: 'Search by name or email' },
        run, 'fill_email', email)

      await this.interact(page,
        `Person suggestion for ${email}`,
        loc => loc.click(),
        { text: email },
        run, 'select_person', email)

      await this.interact(page,
        'Add button to confirm channel invite in Slack',
        loc => loc.click(),
        { role: 'button', text: 'Add' },
        run, 'confirm_add', email)

      return this.buildResult(run, 'provision', email, true)
    } catch (err) {
      this.logger.log({
        timestamp: new Date().toISOString(), run_id: run.run_id,
        intent: 'provision', automation: 'slack', action: 'provision', target: email,
        strategiesAttempted: [], strategySucceeded: null, repairTriggered: false,
        repairedSelector: null, confidence: null, outcome: 'failure',
        durationMs: Date.now() - run.start,
        error: err instanceof Error ? err.message : String(err),
      })
      return this.buildResult(run, 'provision', email, false)
    } finally {
      await page.close()
    }
  }

  async deprovision(context: BrowserContext, params: Record<string, string>): Promise<AutomationResult> {
    const { workspaceUrl, channelName, email } = SlackDeprovisionSchema.parse(params)
    const run = this.createRun()
    const page = await context.newPage()

    try {
      await this.navigate(page, workspaceUrl)

      await this.interact(page,
        `Channel link for #${channelName} in sidebar`,
        loc => loc.click(),
        { role: 'link', text: channelName },
        run, 'navigate_channel', email)

      await this.interact(page,
        'Members panel button in Slack channel header',
        loc => loc.click(),
        { role: 'button', label: 'Members' },
        run, 'open_members', email)

      await this.interact(page,
        `Member ${email} in channel members list`,
        loc => loc.click(),
        { text: email },
        run, 'click_member', email)

      await this.interact(page,
        'Remove from channel option in Slack member menu',
        loc => loc.click(),
        { role: 'menuitem', text: 'Remove from channel' },
        run, 'click_remove', email)

      return this.buildResult(run, 'deprovision', email, true)
    } catch (err) {
      this.logger.log({
        timestamp: new Date().toISOString(), run_id: run.run_id,
        intent: 'deprovision', automation: 'slack', action: 'deprovision', target: email,
        strategiesAttempted: [], strategySucceeded: null, repairTriggered: false,
        repairedSelector: null, confidence: null, outcome: 'failure',
        durationMs: Date.now() - run.start,
        error: err instanceof Error ? err.message : String(err),
      })
      return this.buildResult(run, 'deprovision', email, false)
    } finally {
      await page.close()
    }
  }
}
