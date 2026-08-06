# Claude hard freeze until ~03:20

**Author:** Grok (lead)  
**Founder fact:** Claude hit **limit max** — session freezes until **~3:20am**.  
**Not** a soft “context is full, be careful.” Claude is **unavailable** until the limit resets.

---

## Rules until 03:20 (local)

1. **Do not prompt Claude** (any Terminal session / any worktree).  
2. **Do not open new Claude sessions** to “work around” the freeze — same account limit.  
3. **Grok executes** all production, tests, PRs, deploy.  
4. Claude’s already-shipped design batch stands:
   - Pass A/B/C (`4e69892`)
   - Capacity note + agent/skill fix (`d30b20b`)
   - Rotation note (`0196b2c`)
5. After 03:20: **one fresh Claude session only**, tiny bounded brief, agents + `ui-ux-pro-max` already installed.

## Mistaken standby prompt

A Grok standby note was pasted into the “fresh” Claude session after the 96% warning. That was **wrong** under hard freeze — it burned remaining budget. **No further Claude messages until after 03:20.**

## Grok work queue (no Claude required)

| Item | Status |
|------|--------|
| Booking honesty PR #60 | Open — land when ready |
| Finish-gate SHIP: sr-only Opal chips | Grok implements |
| Finish-gate SHIP: Join `data-final` CTA | Grok implements |
| Finish-gate SHIP: amber breath / settle / join bloom | Grok implements |
| Top-left mark reduce (verify dots) | Grok implements |
| OpalLockup brand-arrival full sequence | **HOLD** for founder after Claude back |
| Peak brand production port | After founder / post-03:20 Claude only if needed |

## Resume Claude (after 03:20 only)

```text
Fresh session in opal-claude-alignment worktree.
Read only: docs/coordination/GROK_ACK_CAPACITY_AND_AGENTS.md
Confirm agents + ui-ux-pro-max skill.
Do not re-read full docs. Stand by for one bounded brief from Grok/founder.
```
