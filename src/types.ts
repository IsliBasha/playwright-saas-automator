import { z } from 'zod'

// ARIA roles accepted by Playwright's getByRole()
export type AriaRole =
  | 'alert' | 'alertdialog' | 'application' | 'article' | 'banner'
  | 'blockquote' | 'button' | 'caption' | 'cell' | 'checkbox'
  | 'code' | 'columnheader' | 'combobox' | 'complementary' | 'contentinfo'
  | 'definition' | 'deletion' | 'dialog' | 'directory' | 'document'
  | 'emphasis' | 'feed' | 'figure' | 'form' | 'generic' | 'grid'
  | 'gridcell' | 'group' | 'heading' | 'img' | 'insertion' | 'link'
  | 'list' | 'listbox' | 'listitem' | 'log' | 'main' | 'marquee'
  | 'math' | 'menu' | 'menubar' | 'menuitem' | 'menuitemcheckbox'
  | 'menuitemradio' | 'meter' | 'navigation' | 'none' | 'note'
  | 'option' | 'paragraph' | 'presentation' | 'progressbar' | 'radio'
  | 'radiogroup' | 'region' | 'row' | 'rowgroup' | 'rowheader'
  | 'scrollbar' | 'search' | 'searchbox' | 'separator' | 'slider'
  | 'spinbutton' | 'status' | 'strong' | 'subscript' | 'superscript'
  | 'switch' | 'tab' | 'table' | 'tablist' | 'tabpanel' | 'term'
  | 'textbox' | 'time' | 'timer' | 'toolbar' | 'tooltip' | 'tree'
  | 'treegrid' | 'treeitem'

// ─── Selector engine ─────────────────────────────────────────────────────────

export interface SelectorHint {
  role?: AriaRole
  label?: string
  text?: string
  testId?: string
  css?: string
}

export interface SelectorResult {
  locator: import('playwright').Locator
  strategyUsed: 'role' | 'label' | 'text' | 'testId' | 'css'
  failedStrategies: string[]
}

export interface RepairResult {
  selector: string
  strategy: string
  confidence: number
}

export interface RepairBudget {
  used: number
  max: number
}

export class RepairBudgetExhaustedError extends Error {
  constructor(max: number) {
    super(`Claude repair budget exhausted (max ${max} calls per run)`)
    this.name = 'RepairBudgetExhaustedError'
  }
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export interface AuditEvent {
  timestamp: string
  run_id: string
  intent: string
  automation: string
  action: string
  target: string
  strategiesAttempted: string[]
  strategySucceeded: string | null
  repairTriggered: boolean
  repairedSelector: string | null
  confidence: number | null
  outcome: 'success' | 'failure'
  durationMs: number
  error?: string
}

// ─── Automation inputs (Zod validated) ──────────────────────────────────────

// GitHub org names: alphanumeric + hyphens, 1–39 chars, no leading/trailing hyphen
const orgNameSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/, 'Invalid org name')

// Workspace URLs must use HTTPS and not target loopback/private IPs
const workspaceUrlSchema = z
  .string()
  .url()
  .refine((u) => {
    try {
      const { protocol, hostname } = new URL(u)
      if (protocol !== 'https:') return false
      if (hostname === 'localhost') return false
      if (/^127\./.test(hostname)) return false
      if (/^192\.168\./.test(hostname)) return false
      if (/^10\./.test(hostname)) return false
      if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false
      return true
    } catch { return false }
  }, 'workspaceUrl must be a public HTTPS URL')

export const GitHubProvisionSchema = z.object({
  orgName: orgNameSchema,
  username: z.string().min(1),
  role: z.enum(['member', 'admin']).default('member'),
})

export const GitHubDeprovisionSchema = z.object({
  orgName: orgNameSchema,
  username: z.string().min(1),
})

export const NotionProvisionSchema = z.object({
  workspaceUrl: workspaceUrlSchema,
  email: z.string().email(),
  role: z.enum(['member', 'guest']).default('member'),
})

export const NotionDeprovisionSchema = z.object({
  workspaceUrl: workspaceUrlSchema,
  email: z.string().email(),
})

export const SlackProvisionSchema = z.object({
  workspaceUrl: workspaceUrlSchema,
  channelName: z.string().min(1),
  email: z.string().email(),
})

export const SlackDeprovisionSchema = z.object({
  workspaceUrl: workspaceUrlSchema,
  channelName: z.string().min(1),
  email: z.string().email(),
})

export type GitHubProvisionInput = z.infer<typeof GitHubProvisionSchema>
export type GitHubDeprovisionInput = z.infer<typeof GitHubDeprovisionSchema>
export type NotionProvisionInput = z.infer<typeof NotionProvisionSchema>
export type NotionDeprovisionInput = z.infer<typeof NotionDeprovisionSchema>
export type SlackProvisionInput = z.infer<typeof SlackProvisionSchema>
export type SlackDeprovisionInput = z.infer<typeof SlackDeprovisionSchema>

// ─── Registry ────────────────────────────────────────────────────────────────

export type AutomationAction = 'provision' | 'deprovision'

export interface AutomationResult {
  success: boolean
  run_id: string
  automation: string
  action: AutomationAction
  target: string
  durationMs: number
  repairsUsed: number
  events: AuditEvent[]
}
