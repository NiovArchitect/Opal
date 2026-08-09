# PR #65 — Cold review AFTER design correction

**Date:** 2026-08-08  
**Reviewer:** Fresh unprimed Grok subagent (`general-purpose`, read-only)  
**Priming:** Zero design-review findings. No Claude review docs. Source + review harness only.  
**Harness:** `?review=availability` scenes A–K + `OpalApp` / grammar / CSS  
**Agent Zero:** unavailable in this harness — not used  

---

## BEFORE (Claude unprimed, pre-correction)

| Field | Value |
|-------|--------|
| Verdict | “Messaging app with a scheduling feature bolted on” |
| Confidence | ~75% |
| Note | Static screenshots only; motion not assessable |

---

## AFTER (this pass)

### Q1 — What does Opal do?

Opal sits inside a chat and quietly turns “we should hang” into shared times that work—without dumping a calendar into the thread.

### Q2 — What feels different from a messenger?

Journey strip, mid-thread moments (not person-bubbles), one-shot cyan edge when something becomes useful, private violet strip, single forward chip that vanishes when overlap owns the room, social-safe copy, choosing a time drafts a human message rather than booking.

### Q3 — Is Opal clearly speaking?

Yes, as system voice: ◈ shared / ◆ private, cyan vs violet, placement hierarchy, one-shot refraction. Not a third chat participant.

### Q4 — Payoff: AI/social intelligence or scheduling UI?

Leans social intelligence (insight language, expand kicker, no free/busy grid). Weakest beat remains private sheet functional inputs (acceptable Phase-1 separation).

### Q5 — Still generic?

Messenger shell DNA, “Find a time” CTA language, ordinary option buttons, marks can read as badges to first-timers.

### Q6 — Futuristic?

Soft-future ambient intelligence — not sci-fi dashboard. Hierarchy + silence over spectacle.

### Q7 — Cluttered?

Mostly no. Residual density: pre-payoff stacking of journey + private + chip on 390px.

---

## VERDICT

**somewhere in between** — **leans social-AI interface**; spine is still messaging with smart availability layered on.

**Confidence:** 78%

### Strongest strengths

1. Silence-first progression with reward only when uncertainty drops  
2. Shared vs private legible at a glance  
3. Overlap as social recognition; no duplicate chip under `overlap_found`

### Residual risks

1. Pre-payoff stacking (journey + private + chip)  
2. Path without landed overlap can still read as mini-scheduler  
3. Identity via mark/color/placement — may still read as status chips to cold users  

---

## Gate interpretation

| Criterion | Status |
|-----------|--------|
| Material change from “messaging + scheduler bolted on” | **Yes** — moved to “leans social-AI / in between” |
| Pure bolt-on language gone | **Mostly** — residual risk remains if overlap never lands |
| Ready to merge | **No** — founder visual approval + full CI still required |
| Ready for founder review | **Yes** — `?review=availability` product-faithful |

---

## Tools actually used this correction pass

- Direct implementation (Grok)  
- Fresh unprimed cold-review subagent (general-purpose, read-only)  
- Agent Zero: **not available**  
- Agency finish-gate swarm: **not launched** (Claude already ran finish-gate pre-correction)  
