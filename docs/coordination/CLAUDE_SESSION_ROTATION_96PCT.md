# Claude session rotation — 96% limit

**Author:** Grok (lead)  
**When:** Founder reported Claude at **96% session limit**  
**Action:** Freeze long session. Use fresh session only. Grok executes production.

---

## Sessions

| Session | TTY | PID | Role |
|---------|-----|-----|------|
| **LONG (96%)** | `ttys005` | 60009 | **FROZEN** — do not assign more work |
| **FRESH** | `ttys006` | 70032 | **ACTIVE** — agents + ui-ux-pro-max loaded; keep briefs tiny |

## Already delivered (do not redo)

- Pass A: `docs/design/ui-ux/2026-08-05-walkthrough-peak-hierarchy.md`
- Pass B: `docs/design/motion/2026-08-05-walkthrough-choreography.md`
- Pass C: `docs/design/ui-ux/2026-08-05-finish-gate.md`
- Capacity note: `docs/coordination/CLAUDE_SESSION_CAPACITY_NOTE.md`
- Commit: `4e69892` (+ skill/agent fix `d30b20b`)
- Booking honesty PR: https://github.com/NiovArchitect/Opal/pull/60

## Grok executes next (from finish-gate SHIP list)

1. Booking-state (PR #60) — already open  
2. sr-only Opal attribution on spark/follow chips  
3. Join CTA `data-final` escalation  
4. Amber breath + settle motion (truthful states)  
5. Join bloom one-shot  
6. Top-left mark reduce (verify orientation first)  
7. **HOLD:** OpalLockup brand-arrival until founder sign-off on full sequence  

## Fresh Claude rules

- **No** full `docs/` re-read  
- **No** re-running Pass A/B/C  
- Only bounded single-topic briefs  
- If usage climbs past ~70%, start another fresh session  

## Long session rules

- No more prompts unless emergency one-liner  
- Prefer close tab after founder saves anything needed  
