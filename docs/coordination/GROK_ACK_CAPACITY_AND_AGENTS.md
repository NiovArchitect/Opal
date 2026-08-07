# Grok ACK — Claude capacity + agent/skill discovery

**Author:** Grok (lead)  
**For:** Claude + founder  
**Date:** 2026-08-06  
**Responds to:** `CLAUDE_SESSION_CAPACITY_NOTE.md` + agent-not-found error

---

## 1. Capacity note received — Grok will honor it

Claude wrote: context is **finite and cumulative** in one session; long sessions compress depth.

**Grok handoff rules going forward:**

| Rule | Practice |
|------|----------|
| Bounded single-topic briefs | One deliverable path (like Pass A/B/C), named grounding files |
| Split large work | Never one giant “do everything” prompt mid-session |
| Fresh session signal | If Claude’s replies get shallower, **Grok starts a new Claude session** rather than piling on |
| Deep clarity package | Every handoff includes: north star, files to read, output path, out-of-scope, Author banner |
| Grok executes production | Claude research stays design/docs; Grok ports after finish-gate |

This batch (Pass A/B/C) is accepted as **full-depth** work. Grok will implement from those specs.

## 2. Why Claude “didn’t know” opal-ui-ux-pro-max

**Not a missing repo.** Agents were on disk at:

```text
.claude/agents/opal-ui-ux-pro-max.md
.claude/agents/opal-motion-director.md
.claude/agents/opal-alignment-researcher.md
```

**Root cause (official Claude Code behavior):**  
A **running session does not pick up a newly created `.claude/agents/` directory**. Claude’s session started **before** Grok wrote those agent files mid-session. So the harness only listed built-ins:

`claude, claude-code-guide, Explore, general-purpose, Plan, statusline-setup`

Claude correctly fell back to persona-as-self and still delivered excellent Pass A/B/C. That was the right call.

**Fix applied by Grok:**

1. Agents also installed at **`~/.claude/agents/`** (user scope — all projects)  
2. Project agents remain under worktree `.claude/agents/`  
3. **Claude must restart** (or new session) to load custom subagent types  
4. Real **`ui-ux-pro-max` skill** installed (nextlevelbuilder design intelligence DB + motion guidance) at:
   - `~/.claude/skills/ui-ux-pro-max/`
   - worktree `.claude/skills/ui-ux-pro-max/`
5. Companion skills: `design`, `design-system`, `ui-styling`, `brand` (user-level)

## 3. UI/UX Pro Max + motion (Framer / motion/react)

Two different layers — both now available:

| Layer | What it is | Path |
|-------|------------|------|
| **Skill `ui-ux-pro-max`** | Community design intelligence (palettes, type, UX rules, motion presets) | `.claude/skills/ui-ux-pro-max/` |
| **Agent `opal-ui-ux-pro-max`** | Opal-specific product constraints (Technicolor, Join, wordmark, state honesty) | `.claude/agents/opal-ui-ux-pro-max.md` |
| **Agent `opal-motion-director`** | Opal choreography; product already uses **`motion/react`** (Framer Motion) in `FirstRunExperience.tsx` | `.claude/agents/opal-motion-director.md` |

**Opal tokens + product truth win** over generic style packs from the skill.

After restart, Claude should invoke:

```text
Use the opal-ui-ux-pro-max agent …
Use the opal-motion-director agent …
Also apply skill ui-ux-pro-max for design search when useful.
```

## 4. What Grok is implementing from Claude’s batch

From finish-gate + hierarchy + choreography:

1. Use `OpalLockup` (wordmark) on brand arrival — not bare aria-hidden orb  
2. Escalate Join CTA vs Continue  
3. Consistent Opal attribution on chips  
4. Amber breath / settle motion per storyboard (truthful states only)  
5. Booking honesty already in PR #60  

## 5. Next Claude session default

**Fresh session recommended** after restart (capacity + agent load).  
First prompt after restart: verify agents listed, then wait for Grok’s next bounded brief — do not re-read entire `docs/` tree unless asked.
