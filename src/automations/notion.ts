import type { BrowserContext } from 'playwright'
import { BaseAutomation } from './base-automation.js'
import { NotionProvisionSchema, NotionDeprovisionSchema, type AutomationResult } from '../types.js'

export class NotionAutomation extends BaseAutomation {
  constructor() { super('notion') }

  async provision(context: BrowserContext, params: Record<string, string>): Promise<AutomationResult> {
    const { workspaceUrl, email, role } = NotionProvisionSchema.parse(params)
    const run = this.createRun()
    const page = await context.newPage()

    try {
      await this.navigate(page, `${workspaceUrl}/settings/members`)

      await this.interact(page,
        'Add members button in Notion workspace settings',
        loc => loc.click(),
        { role: 'button', text: 'Add members' },
        run, 'click_add_members', email)

      await this.interact(page,
        'Email input field in Notion invite dialog',
        loc => loc.fill(email),
        { role: 'textbox', label: 'Invite people by name or email' },
        run, 'fill_email', email)

      await this.interact(page,
        `Email suggestion for ${email} in dropdown`,
        loc => loc.click(),
        { text: email },
        run, 'select_email', email)

      if (role === 'guest') {
        await this.interact(page,
          'Guest role option in invite role selector',
          loc => loc.click(),
          { role: 'option', text: 'Guest' },
          run, 'set_role_guest', email)
      }

      await this.interact(page,
        'Invite button to send Notion workspace invitation',
        loc => loc.click(),
        { role: 'button', text: 'Invite' },
        run, 'confirm_invite', email)

      return this.buildResult(run, 'provision', email, true)
    } catch (err) {
      this.logger.log({
        timestamp: new Date().toISOString(), run_id: run.run_id,
        intent: 'provision', automation: 'notion', action: 'provision', target: email,
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
    const { workspaceUrl, email } = NotionDeprovisionSchema.parse(params)
    const run = this.createRun()
    const page = await context.newPage()

    try {
      await this.navigate(page, `${workspaceUrl}/settings/members`)

      await this.interact(page,
        `Options menu for member ${email} in Notion workspace`,
        loc => loc.click(),
        { role: 'button', label: `Options for ${email}` },
        run, 'open_member_menu', email)

      await this.interact(page,
        'Remove from workspace menu option',
        loc => loc.click(),
        { role: 'menuitem', text: 'Remove from workspace' },
        run, 'click_remove', email)

      await this.interact(page,
        'Confirm remove member from Notion workspace',
        loc => loc.click(),
        { role: 'button', text: 'Remove' },
        run, 'confirm_remove', email)

      return this.buildResult(run, 'deprovision', email, true)
    } catch (err) {
      this.logger.log({
        timestamp: new Date().toISOString(), run_id: run.run_id,
        intent: 'deprovision', automation: 'notion', action: 'deprovision', target: email,
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
