import type { BrowserContext } from 'playwright'
import { BaseAutomation } from './base-automation.js'
import { GitHubProvisionSchema, GitHubDeprovisionSchema, type AutomationResult } from '../types.js'

export class GitHubAutomation extends BaseAutomation {
  constructor() { super('github') }

  async provision(context: BrowserContext, params: Record<string, string>): Promise<AutomationResult> {
    const { orgName, username, role } = GitHubProvisionSchema.parse(params)
    const run = this.createRun()
    const page = await context.newPage()

    try {
      await this.navigate(page, `https://github.com/orgs/${orgName}/people`)

      await this.interact(page,
        'Invite member button on org people page',
        loc => loc.click(),
        { role: 'link', text: 'Invite member' },
        run, 'click_invite', username)

      await this.interact(page,
        'Search field for GitHub username in invite dialog',
        loc => loc.fill(username),
        { role: 'textbox', label: 'Find a member' },
        run, 'fill_username', username)

      await this.interact(page,
        `Autocomplete suggestion for ${username}`,
        loc => loc.click(),
        { text: username },
        run, 'select_user', username)

      if (role === 'admin') {
        await this.interact(page,
          'Owner role radio button in invite dialog',
          loc => loc.click(),
          { role: 'radio', label: 'Owner' },
          run, 'set_role_admin', username)
      }

      await this.interact(page,
        'Send invitation confirmation button',
        loc => loc.click(),
        { role: 'button', text: 'Send invitation' },
        run, 'confirm_invite', username)

      return this.buildResult(run, 'provision', username, true)
    } catch (err) {
      this.logger.log({
        timestamp: new Date().toISOString(), run_id: run.run_id,
        intent: 'provision', automation: 'github', action: 'provision', target: username,
        strategiesAttempted: [], strategySucceeded: null, repairTriggered: false,
        repairedSelector: null, confidence: null, outcome: 'failure',
        durationMs: Date.now() - run.start,
        error: err instanceof Error ? err.message : String(err),
      })
      return this.buildResult(run, 'provision', username, false)
    } finally {
      await page.close()
    }
  }

  async deprovision(context: BrowserContext, params: Record<string, string>): Promise<AutomationResult> {
    const { orgName, username } = GitHubDeprovisionSchema.parse(params)
    const run = this.createRun()
    const page = await context.newPage()

    try {
      await this.navigate(page, `https://github.com/orgs/${orgName}/people`)

      await this.interact(page,
        `Options menu for ${username} in org members list`,
        loc => loc.click(),
        { role: 'button', label: `${username} options` },
        run, 'open_user_menu', username)

      await this.interact(page,
        'Remove from organization menu item',
        loc => loc.click(),
        { role: 'menuitem', text: 'Remove from organization' },
        run, 'click_remove', username)

      await this.interact(page,
        'Confirm remove member button in dialog',
        loc => loc.click(),
        { role: 'button', text: 'Remove member' },
        run, 'confirm_remove', username)

      return this.buildResult(run, 'deprovision', username, true)
    } catch (err) {
      this.logger.log({
        timestamp: new Date().toISOString(), run_id: run.run_id,
        intent: 'deprovision', automation: 'github', action: 'deprovision', target: username,
        strategiesAttempted: [], strategySucceeded: null, repairTriggered: false,
        repairedSelector: null, confidence: null, outcome: 'failure',
        durationMs: Date.now() - run.start,
        error: err instanceof Error ? err.message : String(err),
      })
      return this.buildResult(run, 'deprovision', username, false)
    } finally {
      await page.close()
    }
  }
}
