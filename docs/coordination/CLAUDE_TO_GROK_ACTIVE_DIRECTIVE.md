# CLAUDE → GROK — Active Directive

**Protocol:** Shared Git coordination file (safe for tonight).  
**Writer:** Claude (or founder pasting Claude’s instruction)  
**Reader:** Grok — **must read this file at the start of every execution pass**  
**Not:** A new auto-relay, screen-control hook, or Claude typing into Grok’s terminal (out of scope tonight).

---

## Status

| Field | Value |
|-------|--------|
| **Active** | `false` (no pending Claude directive) |
| **Last updated** | 2026-08-06 |
| **Updated by** | Grok (scaffold) |
| **Ack required** | When Active is `true`, Grok must ack in `GROK_TO_CLAUDE_ACK.md` after acting or declining |

---

## How to use (Claude)

1. Set **Active** to `true` below (or in the YAML block).  
2. Fill **Priority**, **Scope branch/worktree**, **Directive body**, **Do not**, **Done when**.  
3. Commit on the branch Claude is using, or leave uncommitted if founder will hand the path to Grok.  
4. Prefer path: `docs/coordination/CLAUDE_TO_GROK_ACTIVE_DIRECTIVE.md` in the Opal monorepo (or the active worktree).  
5. Do **not** implement automatic terminal injection tonight.

When Grok finishes, Claude (or Grok) sets **Active** back to `false` and moves completed text to an archive handoff if needed.

---

## How to use (Grok)

**Before the next tool-heavy execution pass:**

```bash
# From active worktree or main Opal checkout:
test -f docs/coordination/CLAUDE_TO_GROK_ACTIVE_DIRECTIVE.md && head -80 docs/coordination/CLAUDE_TO_GROK_ACTIVE_DIRECTIVE.md
```

1. If **Active** is `false` → continue founder / PR plan only.  
2. If **Active** is `true` → execute or explicitly decline with reason; then write short ack to `docs/coordination/GROK_TO_CLAUDE_ACK.md` and set Active `false` when done.  
3. Never invent a second coordination channel that bypasses this file.

---

## Active directive payload

```yaml
active: false
priority: none   # P0 | P1 | P2 | none
from: claude
to: grok
scope_branch: ""
scope_worktree: ""
related_prs: []
```

### Directive body

_(empty — Claude fills when active)_

### Do not

_(empty)_

### Done when

_(empty)_

---

## Standing product truths (always in force)

Do not re-open these in a directive unless founder overrides:

- **AVP² = payments only**  
- **Device capability system ≠ AVP²**  
- **Opal owns social truth / alignment**  
- **Kafka carries events after decisions**  
- **PR #61: do not merge until Real People gates + hosted synthetic pass**  
- **PR #62: do not merge until founder visual sign-off**  
- **Twilio disabled until synthetic closure**  
- **Walkthrough copy: recommend first; no silent copy changes**  
- **No device harness / Friendly Plans implementation until ordered**

---

## Related files

| File | Role |
|------|------|
| `CLAUDE_TO_GROK_ACTIVE_DIRECTIVE.md` | **This file** — single active instruction slot |
| `GROK_TO_CLAUDE_ACK.md` | Grok’s short reply after acting |
| `COORDINATION_PROTOCOL.md` | Full dual-AI rules |
| `PRODUCT_TRUTH_AVP2_DEVICE_2026-08-06.md` | Product-truth handoff (historical) |
