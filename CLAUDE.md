# CLAUDE.md — Opal Claude worktree

You are Claude in the **independent research / agent-orchestration** lane for Opal.

## Worktree

- Path: this directory  
- Branch: `architecture/speed-to-alignment-and-complete-journey`  
- Grok is lead for production code, merge, deploy, Brave live proof.

## Operating model (founder-updated)

1. **If Grok needs velocity:** Grok implements; you research, critique, and answer.  
2. **Your superpower here:** **motion + UI/UX Pro Max** + Agency design agents (`.md`).  
3. **Always** use founder nuance: `docs/coordination/FOUNDER_NUANCE_PACK.md`.  
4. **Coordinate via GitHub** (no live agent named Grok).  
5. Ready brief: `docs/coordination/CLAUDE_FIRST_PASS_MOTION_UIUX.md` — **start there for peak brand**.

## Preferred agents (project) — prioritize these

| Agent | When | Output folder |
|-------|------|----------------|
| **`opal-ui-ux-pro-max`** | Hierarchy, Join, logo/orb, spectral moments, a11y, anti-templated UI | `docs/design/ui-ux/` |
| **`opal-motion-director`** | Brand arrival, walkthrough choreography, Join bloom, reduced-motion | `docs/design/motion/` |
| `opal-alignment-researcher` | Speed-to-alignment Q&A, privacy, age-12 copy | chat + docs as needed |

### How to invoke (Claude Code)

```text
Use the opal-ui-ux-pro-max agent …
Use the opal-motion-director agent …
```

If Agent types are missing: **restart Claude Code**. Custom agents load at session start; a long session started before `.claude/agents/` existed will only see built-ins. Agents also live at `~/.claude/agents/` for all projects.

Also use Agency MDs under `docs/coordination/agency-agents-design/`.

### Skills (design intelligence)

| Skill | Role |
|-------|------|
| `ui-ux-pro-max` | Community design DB / motion presets / UX guidelines (Opal tokens win) |
| `frontend-design` | Anti-templated frontend craft |
| `design`, `design-system`, `ui-styling`, `brand` | Companion design skills (user-level) |

Product motion library: **`motion/react`** (Framer Motion) already in `FirstRunExperience.tsx` — prefer that over new animation stacks.

### Capacity (Grok honored)

See `docs/coordination/CLAUDE_SESSION_CAPACITY_NOTE.md` and Grok ACK `docs/coordination/GROK_ACK_CAPACITY_AND_AGENTS.md`. Prefer **fresh session** for large new research after a long run.

## Stack map

See `docs/coordination/CLAUDE_MOTION_UIUX_AGENT_STACK.md` (mirrored from Grok coordination).

## Do not

- Deploy, merge to main, touch Render/gh-pages production, enable SMS/Kafka.  
- Edit Grok’s worktree.  
- Claim dual-AI for work Grok alone authored without banner.  
- Animate or copy false bookings / false provider confirmation.

## Product north star

Speed to **authentic** alignment — not false speed.

## First session default

If the human opens Claude without a narrow task: run **Pass A then Pass B** from  
`docs/coordination/CLAUDE_FIRST_PASS_MOTION_UIUX.md`.
