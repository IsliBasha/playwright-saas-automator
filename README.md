# playwright-saas-automator

Resilient SaaS provisioning automation: Playwright + Claude AI. ARIA-first selectors survive UI changes — when all stable strategies fail, Claude reads the accessibility tree and repairs the selector automatically.

> **Demo GIF**: *(record selector repair in action before pushing)*

[![CI](https://github.com/IsliBasha/playwright-saas-automator/actions/workflows/ci.yml/badge.svg)](https://github.com/IsliBasha/playwright-saas-automator/actions)

## How Selector Repair Works

```
1. getByRole()    -> success -> done
2. getByLabel()   -> success -> done
3. getByText()    -> success -> done
4. data-testid    -> success -> done
5. All fail -> capture ARIA tree -> Claude Haiku -> new selector -> retry
```

## Supported Apps

| App | Actions |
|-----|---------|
| GitHub | provisionUser, deprovisionUser |
| Notion | provisionUser, deprovisionUser |
| Slack | inviteToChannel, removeFromChannel |

## Quick Start

```bash
npm install && npx playwright install chromium
cp .env.example .env
npm run test:unit
```
