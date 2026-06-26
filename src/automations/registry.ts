export interface AuditLog {
  run_id: string
  timestamp: string
  automation: string
  action: string
  target: string
  result: 'success' | 'failure'
  selectors_used: string[]
  repairs: string[]
}

export interface Automation {
  readonly name: string
  execute(action: string, params: Record<string, unknown>): Promise<AuditLog>
}

export class AutomationRegistry {
  private readonly automations = new Map<string, Automation>()

  register(automation: Automation): void {
    this.automations.set(automation.name, automation)
  }

  async execute(name: string, action: string, params: Record<string, unknown>): Promise<AuditLog> {
    const automation = this.automations.get(name)
    if (!automation) throw new Error(`Unknown automation: ${name}`)
    return automation.execute(action, params)
  }
}
