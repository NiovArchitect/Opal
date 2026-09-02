# Calls / Communication Continuity

**Status:** `CURRENT ADDITIVE COMMUNICATION AUTHORITY`  
**Promoted:** 2026-09-01 · founder decision · `docs/authority/FOUNDER_PROMOTION_2026-09-01.md`  
**Figma:** `928:3` — *03A — CALLS / COMMUNICATION CONTINUITY* (historical board name preserved; authority status CURRENT)  
**File:** `fy69K8cCug9prf5GLwQ7Hy`  
**Universe:** Extends Section 03 Communication Core under `618:2`. Does **not** replace current Call visual authorities (`618:581/599/620/642`).  
**Synced:** FOUNDER PROMOTION · 2026-09-01

```yaml
authority_class: CURRENT_ADDITIVE_COMMUNICATION_AUTHORITY
figma_node: "928:3"
implement_authorized: true   # P2 may implement continuity grammar; HOLD/MERGE/LIVE still NO
promote_to_current: true
calls_home_subtitle: "The people you've been calling."
forbidden_domains: [CallGraph, OpalPlan]
```

## Product problem

A conventional call log answers name / date / duration.  
Opal Calls must answer:

1. WHO DID I ACTUALLY SPEAK WITH OR MISS?  
2. WHERE DID WE LEAVE OFF?  
3. DID ANYTHING MEANINGFUL CHANGE?  
4. WHAT IS THE SMALLEST NEXT MOVE?

## Concept

**Calls becomes COMMUNICATION CONTINUITY** — relationship-first, consequence-aware.

| Conventional | Opal (when earned) |
|--------------|-------------------|
| Chanelle · 14 min · just now | Chanelle · Just now · Audio · 14m |
| (no meaning) | Sat 7:30 · Ready · Open Graph → |

If nothing meaningful happened: **do not fabricate a consequence**. Row stays metadata only. **Restraint is part of the reward.**

## Default view law (CURRENT)

The default Calls view is **RELATIONSHIP-FIRST**.

Do not render repetitive event rows as the primary Calls Home grammar.

Individual call events belong beneath:

- Person Call Continuity, or  
- Group Call Continuity.

Promoted concepts from `928:3`: Calls Home · Calls Missed · relationship-first organization · Person/Group Call Continuity · New Call · Outgoing Audio/Video · post-call earned-signal · recent call-event history beneath relationship context · quick callback · chat adjacency without mixing chat into call history · one signal slot · zero signal when nothing meaningful changed.

## Calls Home subtitle (CURRENT)

**Exact copy:** `The people you've been calling.`

Replaces “The people you actually spoke with.” so All / Missed (including people the user did **not** speak with) is not contradictory.  
Do not alter overall layout. Do not add explanatory prose.

## One-signal law (CURRENT)

One relationship row receives at most **ONE** earned semantic consequence. **ZERO is correct.**

Examples: `Sat 7:30 · Ready` · `Graph updated` · `Call back` · `Needs your answer`

If nothing meaningful changed: only call metadata changes (e.g. `Maya · Yesterday · Video · 36m`).  
No AI recap. No machine commentary. No manufactured signal.

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

## Provider / business call law (CURRENT)

| Who placed the call | Surface |
|---------------------|---------|
| USER called restaurant/business | May appear in Calls normally |
| OPAL called provider on user’s behalf | **Do not** fabricate as user’s personal call. Surface outcome on owning Graph/Journey (“Reservation confirmed · Handled by Opal”). Operational exhaust → Assist history on request |

Machine activity does not deserve fake social prominence.

## Calls → Graph continuity (CURRENT)

A call consequence such as `Sat 7:30 · Ready` should feel like the **same Reality** when opening Graph.  
Preferred: shared-element / spatial continuity. Same Reality → deeper owner. Do not create a duplicate Graph.

## Network-effect doctrine (Calls)

Familiar foundation (phone identity, Chats, Calls) — materially better than ordinary calling.

When users naturally call people they care about, Opal becomes more useful afterward (permitted context → continuity → fewer coordination steps).  

**Do not** optimize for call minutes vanity. Optimize for **speed to genuine alignment and useful consequence**.

## Opal Assist

Assist may become a meaningful default **after** lawful consent/capability.  
Distinguish: Assist preference enabled ≠ OS/media permission ≠ call-consent ≠ transcription capability ≠ provider dependency.  
Never fabricate analysis of a call Opal could not observe.

## Current authority map

| Layer | Status |
|-------|--------|
| Incoming/Audio/Video/Group Call **visuals** `618:581+` | CURRENT / FROZEN (B5) |
| Calls continuity home / consequence rows `928:3` | **CURRENT ADDITIVE** (promoted 2026-09-01) |
| Incoming Group Call additive `965:632` | CURRENT ADDITIVE (with Signal Grammar promotion) |
| Outgoing Group Call additive `965:666` | CURRENT ADDITIVE |
| Provisional signal Calls Home `965:68` | CURRENT ADDITIVE |
| Outgoing vs Incoming state machine | P1 objective defect closed; remains product law |

## Implementation note

Extend existing owners (`CallSurfaces.tsx`, Chats/Direct/Group, Graph/Journey). **Never** create `CallGraph`.  
HOLD / DO NOT MERGE / NO LIVE / `FOUNDER_ACCEPTED = NO` remain until separately authorized.
