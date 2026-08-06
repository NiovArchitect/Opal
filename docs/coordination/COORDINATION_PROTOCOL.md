# Dual-AI coordination protocol (Opal)

**Status:** Accepted for tonight and ongoing  
**Mode:** Shared Git files only  
**Explicitly deferred:** Automatic Claude→Grok terminal relay, screen-control injection, Claude Code hooks that fire Grok without human/file mediation  

---

## Roles

| Agent | Role |
|-------|------|
| **Grok** | Lead operator: implements, tests, PRs, deploys when ordered |
| **Claude** | Research / design / review; may write directives for Grok |
| **Founder** | Authority; visual sign-off; merge decisions |

---

## Canonical paths (Opal monorepo)

```text
docs/coordination/CLAUDE_TO_GROK_ACTIVE_DIRECTIVE.md   ← Claude writes; Grok reads first
docs/coordination/GROK_TO_CLAUDE_ACK.md                ← Grok writes after acting
docs/coordination/COORDINATION_PROTOCOL.md            ← this file
```

Worktrees should use the **same relative paths** under their checkout so either agent can find the directive without guessing.

---

## Grok startup checklist (every execution pass)

1. Read `docs/coordination/CLAUDE_TO_GROK_ACTIVE_DIRECTIVE.md`  
2. If `active: true` → treat as higher priority than ad-hoc backlog unless founder overrides  
3. Execute within scope; do not expand into Device Capability / Friendly Plans / Twilio without order  
4. Ack in `GROK_TO_CLAUDE_ACK.md`  
5. Set Active `false` when the directive is done or declined  

---

## Claude write checklist

1. One active directive at a time (do not stack competing Actives)  
2. Name branch/worktree and related PR  
3. Short **Done when** criteria  
4. Explicit **Do not** list  
5. Prefer docs/design unless founder authorized runtime edits  

---

## Why not auto-relay tonight

- Hooks and screen-control tools can mis-route commands and burn rate limits  
- Shared Git files are reviewable, reversible, and founder-visible  
- A proper relay can be designed later as a separate, tested tool  

---

## Stale task hygiene

- Kill unused long-running Vite/servers outside the active review port  
- Clear todo items that are completed or cancelled  
- Do not leave background agents running without an active directive  

---

## Current standing work (2026-08-06)

| Track | State |
|-------|--------|
| PR #61 Real People | Hold merge; CI was green on journey work; hosted synthetic still open |
| PR #62 Visual | Hold merge; await founder visual approval after no-halo / single-wordmark / Join fixes |
| Product truth #63 / Foundation #1 | Merged |
| Twilio | Disabled |
| Device capability code | Not started |
