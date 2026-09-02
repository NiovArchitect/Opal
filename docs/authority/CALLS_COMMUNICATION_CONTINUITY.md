# Calls / Communication Continuity

**Status:** `ADDITIVE_FOUNDER_PROPOSAL_NOT_CURRENT`  
**Figma:** `928:3` — *03A — CALLS / COMMUNICATION CONTINUITY — ADDITIVE FOUNDER PROPOSAL — NOT CURRENT UNTIL APPROVED*  
**File:** `fy69K8cCug9prf5GLwQ7Hy`  
**Universe:** Current product remains rooted at `618:2`. This proposal does **not** replace current Call visual authorities (`618:581/599/620/642`) until founder promotion.  
**Synced:** POST-B7 P0 · 2026-09-01

```yaml
authority_class: FOUNDER_REVIEW_PROPOSAL
figma_node: "928:3"
implement_authorized: false
promote_to_current: false
forbidden_domains: [CallGraph, OpalPlan]
```

## Product problem

A conventional call log answers name / date / duration.  
Users actually need:

1. Who did I **actually** speak to?  
2. Where did we leave off?  
3. What did we settle?  
4. What needs to happen now?

## Concept

**Calls becomes COMMUNICATION CONTINUITY** — relationship-first, consequence-aware.

| Conventional | Opal (when earned) |
|--------------|-------------------|
| Chanelle · 14 min · just now | Chanelle · Just now · Audio · 14m |
| (no meaning) | Sat 7:30 · Ready · Open Graph → |

If nothing meaningful happened: **do not fabricate a consequence**. Row stays metadata only. **Restraint is part of the reward.**

## Three-question law (per row)

1. WHAT happened / is possible?  
2. WHY does it matter to me/us?  
3. WHAT is the easiest next action?

At a glance: **WHO · WHEN/RECENCY · CALL TYPE · WHAT CHANGED (if any) · SMALLEST NEXT ACTION (if needed)**.

Not an analytics dashboard. Not every AI inference. Not huge summaries.

## Call state machine (required for correctness)

Outgoing and Incoming are **separate paths**.

```
IDLE

OUTGOING:
  outgoing_dialing → outgoing_ringing → connected → ended | failed | cancelled

INCOMING:
  incoming_ringing → accepted → connected
                   → declined
                   → missed
```

**Answer / Decline belong ONLY to `incoming_ringing`.**  
An outgoing caller must **never** be asked to answer their own call.  
Outgoing UX: “Calling…” / “Ringing…” + cancel/end. No contradictory overlapping titles.

**CALL ≠ GROUP.** Leaving a call must not leave the group. Group call membership = actual group membership.

AV transport may remain `DEPENDENCY` until real media exists. Do not fake connected transport.

## Provider / business call law

| Who placed the call | Surface |
|---------------------|---------|
| USER called restaurant/business | May appear in Calls normally |
| OPAL called provider on user’s behalf | **Do not** fabricate as user’s personal call. Surface outcome on owning Graph/Journey (“Reservation confirmed · Handled by Opal”). Operational exhaust → Assist history on request |

Machine activity does not deserve fake social prominence.

## Network-effect doctrine (Calls)

Familiar foundation (phone identity, Chats, Calls) — materially better than ordinary calling.

When users naturally call people they care about, Opal becomes more useful afterward (permitted context → continuity → fewer coordination steps).  

**Do not** optimize for call minutes vanity. Optimize for **speed to genuine alignment and useful consequence**.

## Opal Assist

Assist may become a meaningful default **after** lawful consent/capability.  
Distinguish: Assist preference enabled ≠ OS/media permission ≠ call-consent ≠ transcription capability ≠ provider dependency.  
Never fabricate analysis of a call Opal could not observe.

## Same-reality handoff

When a call settles something → show the consequence on the owning Graph/Journey.  
When unresolved planning survives → one strongest “Continue with Opal →” slot — not piles of AI cards.

## Current vs proposal

| Layer | Status |
|-------|--------|
| Incoming/Audio/Video/Group Call **visuals** `618:581+` | CURRENT / FROZEN (B5) |
| Calls continuity home / consequence rows `928:3` | FOUNDER_REVIEW proposal — not current |
| Outgoing vs Incoming state machine | OBJECTIVE defect register (founder walk) — fix in P1, not by promoting 928:3 visuals alone |

## Implementation note

Extend existing owners (`CallSurfaces.tsx`, Chats/Direct/Group, Graph/Journey). **Never** create `CallGraph`.
