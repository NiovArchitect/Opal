# OPAL LIFE INTELLIGENCE MAP

**Status:** GATE BLUEPRINT ONLY — Pass 2 remains LOCKED  
**Kind:** Capability architecture map (not implementation)  
**Synced:** 2026-10-13  
**Prerequisite:** Pass 1 CLOSED · Entry Contract ACTIVE · Hold Period ACTIVE

```yaml
authority_class: PASS2_PLUS_CAPABILITY_MAP
functionality: NONE
implementation: FORBIDDEN_UNTIL_UNLOCK
purpose: define_boundaries_before_intelligence
pass_2: LOCKED
```

## Purpose

This document answers the question that must come **before** unlocking Pass 2:

> Does the current architecture have the capability foundation to become the relationship operating system we envision?

It separates:

1. **What this repository has proven** (Pass 1 / steward evidence)
2. **What the full vision eventually needs** (capability domains)

It does **not** authorize code, schema expansion for intelligence, memory promotion, scoring, or partner inference.

Unlock phrase remains:

> "Opal is ready to begin understanding people."

Until then: coherence preservation + production readiness only.

---

## Architectural law (unchanged)

```text
Postgres
    ↓
Domain truth

Phoenix
    ↓
Realtime projection

UI
    ↓
User-facing representation

AI
    ↓
Interpret · Assist · Explain · Propose
```

AI does not become the authority layer.

If a surface disagrees: **fix the authority path.**

---

## Proven foundation (GREEN — Pass 1)

Hardest part already exists. This is the “brain stem,” not the full OS.

| Capability | Status in repo / steward frame |
|------------|--------------------------------|
| Conversation alignment | GREEN — `ConversationAlignment` / reconcile |
| Plans / SharedPlan lineage | GREEN — active plan law; Fort Oak lifecycle restore |
| Commitments / outcomes | GREEN — commitment ledger paths; Attention journeys |
| Attention / temporal follow-through | GREEN — Seen ≠ resolved; Pass 1G |
| State ownership | GREEN — `STATE_OWNERSHIP_LAW` |
| Reality source priority | GREEN — live → shared → historical → demo → empty |
| Fact ownership + visibility (law) | GREEN as **law**; schema expansion deferred |
| Surface projection / A8 | GREEN — one state → many projections |
| Prefer-real / production empty seed | GREEN — Home / Graphs / Chats |
| Settings honesty | GREEN / HONEST_GATE / HIDDEN |
| Invitation empty states | GREEN — PRODUCT_COPY |
| Permission-aware foundation | Partial — ConsentProof, relationship types (RU-1), Access layers exist; full Person permission graph not Pass 2-ready |
| Booking provider facade | Foundation — Duffel test / OpenTable gated; recommendation ≠ booking |
| Relationship types (explicit) | Present — seven types; inference provisional + transparency; **not** full Person graph intelligence |

Pass 1 defensible question answered:

> Why is Opal showing me this?

---

## Target intelligence core (vision — not shipped)

```text
                 OPAL INTELLIGENCE CORE

                         |
        -------------------------------------
        |                 |                 |
 Relationship       Personal Life       Execution
 Intelligence       Intelligence        Intelligence

        |                 |                 |
 People Graph       Life Graph       Action Graph
```

Composed through a **Context Understanding Layer** and gated by **Action Authority**:

```text
Suggest → Confirm → Execute
```

Never: assume → silent write → silent book.

---

## Domain map

For every domain below, Pass 2+ work must define these fields before implementation:

| Field | Meaning |
|-------|---------|
| **Data source** | Where truth enters (user, partner, provider, sensor, import) |
| **Authority owner** | Who owns the durable record |
| **Permissions** | Who may see / act |
| **Confidence** | Observed → Candidate → Confirmed → Durable |
| **Lifecycle** | Created → Active → Aging → Expired → Archived → Corrected |
| **Allowed actions** | Suggest / Ask / Propose / Schedule / Execute (explicit) |

Honesty rule for claiming a capability complete:

```text
Data authority
+ Backend behavior
+ Realtime propagation
+ UI projection
+ Regression proof
```

all must agree.

---

### 1. Relationship Intelligence

**Status:** 🔒 LOCKED (correct)  
**Gate:** `RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md`  
**Doctrine:** `OPAL_RELATIONSHIP_INTELLIGENCE_DOCTRINE.md` (safe projection; alignment edges)

**Person graph (not a contact list)**

```text
Person
 |
 ├── Identity
 ├── Relationship type
 ├── Shared history
 ├── Communication style
 ├── Preferences
 ├── Boundaries
 ├── Important dates
 ├── Shared commitments
 ├── Moments
 └── Trust level
```

**Fact shape example**

```text
Fact:        Enjoys pink aesthetics
Source:      Conversation
Confidence:  Confirmed
Scope:       Relationship-private
Useful for:  Gift / date personalization
Correction:  Chanelle can update
```

| Field | Blueprint |
|-------|-----------|
| Data source | Conversation, explicit form, shared moments, partner correction |
| Authority owner | Subject person (correction); viewer owns their asymmetric type label |
| Permissions | Scope ladder: private self → partner shared → friend group → public |
| Confidence | Memory ladder; inference never labeled Confirmed desire |
| Lifecycle | Facts age / expire / correct with history |
| Allowed actions | Suggest · Ask · Explain · Propose — never invent Durable without Confirm |

**Blind spot closed by design:** identity resolution (“Who is this person **to me**?”) must drive behavior bounds (friend vs partner vs client), not a flat name card.

---

### 2. Commerce / Shops / Local providers

**Status:** Foundation partial (provider facades); intelligence LOCKED

Architecture:

```text
User intent
    ↓
Recommendation Intelligence
    ↓
Provider Capability
    ↓
Availability
    ↓
Reservation / Purchase
    ↓
Confirmation
```

Law already correct: **Provider truth separate from fit.** Recommendation ≠ booking.

| Field | Blueprint |
|-------|-----------|
| Data source | Google Places / Yelp / Foursquare / local APIs (future); Duffel / OpenTable today as gated hands |
| Authority owner | Provider for availability/booking confirmation; user for intent/budget; plan for shared commitment |
| Permissions | Consent for act-on-behalf; no auto-book without authority |
| Confidence | Fit Candidate vs provider Confirmed availability |
| Lifecycle | Offer → selected → booked → lived → memory candidate |
| Allowed actions | Suggest → Propose → Confirm → Execute (only when authorized) |

Eventual integrations (vision): Places, OpenTable/Resy/SevenRooms, Duffel/airlines/hotels.

---

### 3. Calendar Intelligence

**Status:** Major gap vs vision; Google OAuth calendar/Gmail gated founder-side

Need a **Calendar Graph**, not mere sync:

- events · availability · commitments · conflicts · travel time · recurring patterns

Architecture:

```text
Calendar Event
      ↓
Verified external reality
      ↓
Permissioned projection
      ↓
Opal planning
```

| Field | Blueprint |
|-------|-----------|
| Data source | Google / Apple / Outlook (opt-in); Opal SharedPlan commitments |
| Authority owner | External calendar for verified events; user for Opal commitments |
| Permissions | Self sees all; partner sees only shared plans; child/other scopes distinct |
| Confidence | External verified vs Opal proposed |
| Lifecycle | Tentative → confirmed → completed → historical |
| Allowed actions | Suggest times · Ask · Propose SharedPlan — write calendar only with opt-in |

---

### 4. Fitness / Health Graph

**Status:** Vision only — sensitive domain

| Field | Blueprint |
|-------|-----------|
| Data source | Apple Health / Fitbit / Garmin / Strava (explicit consent) |
| Authority owner | User |
| Permissions | Self-default; share only by explicit grant |
| Confidence | Device Observed → user Confirmed goals |
| Lifecycle | Goals/training phases expire (e.g. marathon cycle) |
| Allowed actions | Suggest schedule fit · Ask — **no medical assumptions** |

---

### 5. Email / Communication Intelligence

**Status:** Vision; Gmail OAuth gated with calendar

```text
Communication Intelligence Layer
- summarize
- classify
- detect commitments
- identify deadlines
- surface important messages
```

Example posture:

```text
Possible commitment: Passport appointment
Source: Email
Confidence: High (Candidate)
Action: Ask user if they want a reminder
```

Never automatically create obligations.

| Field | Blueprint |
|-------|-----------|
| Data source | Email / message providers (opt-in) |
| Authority owner | User |
| Permissions | Self; never leak into partner graph without share |
| Confidence | Candidate until user confirms |
| Lifecycle | Inbox signal → Candidate → Confirmed commitment or dismissed |
| Allowed actions | Summarize · Ask · Propose reminder — never silent obligation |

---

### 6. Context Engine (core missing concept)

Opal must assemble a **context packet** before acting:

```text
CURRENT_CONTEXT

User:            who am I
Other person:    who am I talking to
Relationship:    what is this edge
Conversation:    what is happening
Constraints:     budget / time / preferences
Current state:   what matters now
Permissions:     what may be seen / done
Allowed actions: Suggest / Ask / Create proposal
Forbidden:       Assume / Book without permission / Expose private data
```

| Field | Blueprint |
|-------|-----------|
| Data source | Auth session + relationship edge + active plan + Attention + permissions |
| Authority owner | System assembly from domain truths (not AI invention) |
| Permissions | Packet may only include visible scopes for the acting user |
| Confidence | Each field carries its own confidence |
| Lifecycle | Per-turn / per-session; never durable as a secret second brain |
| Allowed actions | Bound every AI propose/explain path |

---

### 7. Memory (lifecycle, not dump)

Fact lifecycle required:

```text
Created → Active → Aging → Expired → Archived → Corrected
```

Stable vs temporary examples:

- “I like sushi” → often stable  
- “I am training for a marathon” → temporary  

Composes with `FACT_OWNERSHIP_VISIBILITY_LAW` Expiration + Correction.

**Forbidden until unlock:** memory expansion, Observed→Permanent, silent overwrite.

---

### 8. Execution / Action Authority

Opal must know the verb ceiling:

| Verb | Meaning |
|------|---------|
| Suggest | Offer options |
| Ask | Request confirmation or missing truth |
| Propose | Create a Candidate plan / commitment |
| Schedule | Write time into calendar / SharedPlan when allowed |
| Execute | Book / pay / message on behalf — ConsentProof required |

Example:

Allowed: “Want me to suggest steak places?”  
Forbidden without authority: “Reservation booked.”

Composes with ConsentProof / act-on-behalf paths already in the foundation.

---

## Blind spots (design before code)

### Blind spot 1 — Identity resolution

Need relationship-role behavior (“friend / coworker / family / partner / client”), not name-only identity. RU-1 types are a seed; full Person graph remains Pass 2+.

### Blind spot 2 — Permission graph

```text
User → Permission → Relationship → Data
```

Calendar example: you see everything; Chanelle sees only shared plans; child scope differs.

### Blind spot 3 — Life memory expiration

Temporary facts must age out or reconfirm. Expiration is first-class.

### Blind spot 4 — Action authority

Suggest ≠ Ask ≠ Schedule ≠ Execute. Ceiling must be explicit per context packet.

---

## Pass 2 unlock order (locked)

When founder unlocks with the phrase, **first work is definition**, then implementation:

1. Authority model  
2. Permissions  
3. Candidate lifecycle  
4. Correction paths  
5. Explanation layer  
6. Intelligence implementation  

Not: collect everything · infer everything · automate everything.

Post-unlock domain priority (recommended, still gated by entry contract):

1. Relationship Person graph (authority + scope)  
2. Context Engine packet (binds AI verbs)  
3. Action Authority ceilings  
4. Calendar Graph (opt-in external reality)  
5. Commerce execution hardening (recommend vs book)  
6. Communication Candidates (email)  
7. Fitness / Health (consent-heavy, later)

---

## Hold-period posture

This file is a **blueprint**. Creating or reading it does **not** unlock Pass 2.

Allowed now:

- Coherence preservation  
- Production readiness (local → Render payment → prod health → TestFlight → device smoke)  
- Honest capability verification  

Forbidden now:

- Implementing domains above as intelligence features  
- Memory expansion · assumption systems · scoring · profile inference  

Product advantage remains:

> Opal should only become more intelligent after it has earned the right to be trusted.

---

## Related

- `docs/authority/RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md` — Pass 2 gate
- `docs/authority/FACT_OWNERSHIP_VISIBILITY_LAW.md` — fact fields
- `docs/authority/OPAL_RELATIONSHIP_INTELLIGENCE_DOCTRINE.md` — alignment / safe projection
- `shots/steward/HOLD_PERIOD_CHECKPOINT.md` — hold boundaries
- `shots/steward/PASS1_FINAL_CHECKPOINT.md` — Pass 1 closed
- `docs/authority/CURRENT_OPAL_STATE.md` — live steward overlay
- `docs/authority/MASTER_PRODUCTION_CONTINUITY_HANDOFF.md` — continuity frame
