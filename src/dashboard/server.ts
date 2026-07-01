import express from 'express'
import { timingSafeEqual } from 'node:crypto'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { AutomationRegistry } from '../automations/registry.js'
import { auditEvents } from '../reporting/audit-logger.js'
import type { AutomationAction } from '../types.js'
import type { Response, Request, NextFunction } from 'express'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT ?? '3000', 10)
const HOST = process.env.HOST ?? '127.0.0.1'
const LOCAL_TOKEN = process.env.LOCAL_API_TOKEN ?? ''

const VALID_ACTIONS = new Set<AutomationAction>(['provision', 'deprovision'])

const app = express()
app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

const registry = new AutomationRegistry()
const sseClients = new Set<Response>()

// ── Local bearer token auth (all /api routes) ────────────────────────────────
function requireToken(req: Request, res: Response, next: NextFunction): void {
  if (!LOCAL_TOKEN) { next(); return }
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  try {
    const a = Buffer.from(token.padEnd(LOCAL_TOKEN.length))
    const b = Buffer.from(LOCAL_TOKEN)
    if (a.length === b.length && timingSafeEqual(a, b)) { next(); return }
  } catch { /* length mismatch handled below */ }
  res.status(401).json({ error: 'Unauthorized' })
}

app.use('/api', requireToken)

// ── SSE event broadcast ───────────────────────────────────────────────────────
auditEvents.on('event', (event) => {
  const payload = `data: ${JSON.stringify(event)}\n\n`
  for (const client of sseClients) {
    try {
      client.write(payload)
    } catch {
      sseClients.delete(client)
    }
  }
})

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  res.write(': connected\n\n')
  sseClients.add(res)
  req.on('close', () => sseClients.delete(res))
})

app.get('/api/automations', (_req, res) => {
  res.json({ automations: registry.listAutomations() })
})

app.post('/api/run', async (req, res) => {
  const { automation, action, params } = req.body as {
    automation?: string
    action?: string
    params?: Record<string, string>
  }

  if (!automation || !action || !params) {
    res.status(400).json({ error: 'Missing required fields: automation, action, params' })
    return
  }

  if (!VALID_ACTIONS.has(action as AutomationAction)) {
    res.status(400).json({ error: `Invalid action "${action}". Must be: provision | deprovision` })
    return
  }

  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    try {
      const result = await registry.execute(automation, action as AutomationAction, context, params)
      res.json(result)
    } finally {
      await context.close()
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
    }
  } finally {
    await browser?.close()
  }
})

app.listen(PORT, HOST, () => {
  process.stdout.write(`ops-terminal listening on ${HOST}:${PORT}\n`)
})
