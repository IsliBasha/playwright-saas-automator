# playwright-saas-automator

Resilient SaaS provisioning automation built on Playwright and Claude AI. Automates user provisioning and deprovisioning across GitHub, Notion, and Slack via browser automation — with an ARIA-first selector engine that survives UI changes automatically.

[![CI](https://github.com/IsliBasha/playwright-saas-automator/actions/workflows/ci.yml/badge.svg)](https://github.com/IsliBasha/playwright-saas-automator/actions)

## What It Does

When you onboard a new employee, you need to invite them to GitHub orgs, Notion workspaces, and Slack channels. When they leave, you remove them from all three. This tool automates those flows using Playwright — and when SaaS UIs inevitably change and break selectors, a Claude Haiku repair layer rebuilds them on the fly.

```
User joins  →  provision:  GitHub + Notion + Slack  ✓
User leaves →  deprovision: GitHub + Notion + Slack  ✓
```

## Selector Repair Architecture

The engine tries 5 ARIA strategies in sequence before calling Claude:

```
1. getByRole()    ─── ARIA role + accessible name
2. getByLabel()   ─── form field label association
3. getByText()    ─── visible text content
4. getByTestId()  ─── data-testid attribute
5. CSS fallback   ─── last stable structural selector
                  │
              All fail?
                  │
                  ▼
      page.ariaSnapshot() → Claude Haiku
      "Find: invite member button"
      Returns: { selector, strategy, confidence }
      Confidence ≥ 0.70 → retry with repaired selector
      Confidence < 0.70 → log + fail
```

Every action — success, failure, and repair — is written to `audit.jsonl` and streamed live to the Ops Terminal dashboard via SSE.

## Supported Automations

| App | Provision | Deprovision |
|-----|-----------|-------------|
| **GitHub** | Invite user to org with role | Remove from org |
| **Notion** | Add member or guest to workspace | Remove from workspace |
| **Slack** | Add user to channel | Remove from channel |

## Getting Started

```bash
# 1. Install dependencies and Playwright browsers
npm install
npx playwright install chromium

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum, set ANTHROPIC_API_KEY and LOCAL_API_TOKEN

# 3. Start the Ops Terminal
npm run dev
# → http://127.0.0.1:3000
```

## Ops Terminal

The dashboard at `http://127.0.0.1:3000` provides:

- **Automation selector** — GitHub / Notion / Slack
- **Action toggle** — + provision / − deprovision
- **Parameter form** — context-sensitive per automation + action
- **Live audit log** — every browser action streams in real-time via SSE
  - `✓ role` — resolved by ARIA role
  - `⚡ claude` — resolved by Claude Haiku repair
  - `✗` — failed after all attempts
- **Session metrics** — success rate gauge, repairs used, avg duration, recent run history

## API

All API routes require `Authorization: Bearer <LOCAL_API_TOKEN>` when `LOCAL_API_TOKEN` is set.

### `POST /api/run`

Trigger an automation run.

```json
{
  "automation": "github",
  "action": "provision",
  "params": {
    "orgName": "acme-inc",
    "username": "jdoe",
    "role": "member"
  }
}
```

Response:

```json
{
  "success": true,
  "run_id": "a1b2c3d4",
  "automation": "github",
  "action": "provision",
  "target": "jdoe",
  "durationMs": 3241,
  "repairsUsed": 0,
  "events": [...]
}
```

### `GET /api/events`

Server-Sent Events stream. Each message is a JSON-serialised `AuditEvent`.

### `GET /api/automations`

Returns `{ "automations": ["github", "notion", "slack"] }`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude Haiku access for selector repair |
| `LOCAL_API_TOKEN` | Recommended | Bearer token for `/api/*` (empty = no auth) |
| `HOST` | No | Bind address (default: `127.0.0.1`) |
| `PORT` | No | HTTP port (default: `3000`) |
| `MAX_CLAUDE_REPAIRS_PER_RUN` | No | Claude repair budget per run (default: `10`) |
| `AUDIT_LOG_FILE` | No | JSONL audit log path (default: `audit.jsonl`) |

## Development

```bash
npm run dev          # tsx dev server
npm run typecheck    # tsc --noEmit
npm run test:unit    # vitest
npm run build        # tsc → dist/
npm start            # node dist/dashboard/server.js
```

## Project Structure

```
src/
├── types.ts                    # Shared types + Zod schemas (input validation)
├── engines/
│   ├── selector-strategy.ts    # ARIA-first 5-strategy chain
│   ├── selector-repair.ts      # Claude Haiku repair via ariaSnapshot()
│   └── execute-with-repair.ts  # Orchestrator: strategy → repair → audit
├── automations/
│   ├── base-automation.ts      # Abstract base with interact() + navigate()
│   ├── github.ts               # GitHub org provisioning
│   ├── notion.ts               # Notion workspace provisioning
│   ├── slack.ts                # Slack channel provisioning
│   └── registry.ts             # Automation dispatcher
├── reporting/
│   └── audit-logger.ts         # JSONL writer + SSE EventEmitter
└── dashboard/
    ├── server.ts               # Express server + SSE hub
    └── public/index.html       # Ops Terminal UI
```

## Security Notes

- The server binds to `127.0.0.1` by default — not exposed to the network
- Set `LOCAL_API_TOKEN` in production to prevent unauthorized automation runs
- `workspaceUrl` is validated to reject loopback and RFC-1918 addresses (SSRF prevention)
- GitHub org names are validated against the GitHub naming spec
- The Claude Haiku API receives the ARIA snapshot of the current page — operators should be aware this may include visible text from authenticated SaaS sessions
