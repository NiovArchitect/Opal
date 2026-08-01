# Build Slice — Social Flow 1

**Authority:** BUILD-SLICE DEFINITION (not implementation)  
**Status:** Bounded **first** Social Flow implementation slice — specified for **later** engineering; **not implemented in this documentation PR**  
**Branch context:** `docs/social-flow-relationship-universe`  
**Baseline main (docs program):** `ba4504e1cb995952113134fad574865a7d2732bc`  
**Depends on product truth:** `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, `OPAL_RELATIONSHIP_CONTEXTS.md`, `OPAL_RELATIONSHIP_ACTIVATION.md`, `CONSENT_MODEL.md`, `RELATIONSHIP_SAFETY_RULES.md`  
**Related architecture (when present):** Social Flow privacy/authority/inference boundaries, minor/family privacy, contact security  

---

## Purpose of this document

Define the **smallest credible Social Flow slice** that proves living coordination on top of Opal’s existing messaging foundation — including:

1. a complete **adult two-user** journey; and  
2. a **carefully bounded family** journey (parent + older child, plan coordination only if safety architecture and acceptance gates allow).

This file is a **slice contract** for a future build branch.  
**Implementation is NOT in this PR.** No application code, schema migrations, or feature flags for Social Flow ship under the documentation program alone.

---

## Slice thesis

Prove that consented conversation can become a **shared plan** with privacy isolation, revision, and reminders — for two adults — and, only within strict bounds, that a **parent and older child** can turn a practice-pickup discussion into a family plan without leaking private parent-only content or authorizing strangers/peers unsafely.

```text
Messaging foundation (already / separately built)
  → relationship activation (narrow)
  → plan proposal (Python proposes)
  → consent to coordinate (Elixir authoritative)
  → options / agreement
  → shared plan + participation
  → revision (e.g. time change) with multi-device projection
  → private commitment / private reminder
  → revoke stops further AI context for scope
```

---

## Journeys in scope

### A — Adult two-user Social Flow lifecycle (primary)

**Actors:** Two adult users (synthetic or real test accounts), 1:1 conversation.

**Story (dinner / coordination):**

1. Adults discuss dinner or similar coordination in chat.  
2. Opal surfaces a **lightweight, dismissible** plan proposal (not a binding event).  
3. User(s) consent to coordinate.  
4. Availability grants (free/busy or simple windows — slice-minimal).  
5. Time options → agreement.  
6. **Shared plan** becomes authoritative social object.  
7. Private commitment optional (e.g. “I’ll book”) visible only to owner unless shared.  
8. Private reminder for owner.  
9. Time change → plan revision → both devices update; unauthorized conversations remain isolated.  
10. Consent revoke on a party stops new AI processing for that scope; plan authority rules remain enforced in Elixir.

**Success:** Full lifecycle using existing messaging + consent + AI job patterns; calendar grid is optional projection, not the product center.

### B — Bounded family journey (secondary, safety-gated)

**Actors:** One parent/guardian account + one **older child** account, with relationship context confirmed as parent/child (and guardian rules per age-authority docs when implemented).

**Story (practice pickup):**

1. Parent and older child discuss practice pickup in their conversation.  
2. Opal detects a **possible plan** (proposal only).  
3. Prompt: **“Turn this into a family plan?”** (dismissible).  
4. On accept: **shared family plan** for pickup time/place essentials.  
5. **Private parent-only** note or reminder stays private (never on child-visible plan surface).  
6. Time change propagates to **allowed** participants’ devices.  
7. Plan intelligence is **isolated** from unauthorized conversations (other chats, other adults, peers not on the plan).

**Success:** Family coordination feels first-class without shipping unrestricted youth Social Flow.

**Hard gate:** Journey B must not ship in an engineering PR until child-safety, age-authority, guardian-boundary, and privacy docs/gates for this narrow path are **accepted** and testable. If gates are incomplete, engineering implements **Journey A only** and keeps B as a documented extension behind explicit feature exclusion.

---

## Exact scope — IN

| Area | In slice |
|------|----------|
| Product | Social Flow lifecycle primitives: proposal, coordinate consent, availability grant (minimal), time option, shared plan, participation state, commitment (private), plan revision, private reminder |
| Relationship | User-confirmed context for the active conversation; activation narrow (plan recognition + minimal coordination set) |
| Adult journey | Full dinner/coordination lifecycle above |
| Family journey | **Only** parent + older child practice-pickup style path if safety gates pass |
| Runtime | Python: bounded proposal/interpretation only; Elixir: consent, membership, plan authority, revisions, reminder scheduling hooks, audit; Mobile: project plan state + pending UX |
| Messaging | Reuse existing conversation, realtime, multi-device session patterns — no parallel chat stack |
| Privacy | Shared plan vs private care isolation; conversation/plan boundary; revoke stops new AI context |
| Evidence | Acceptance matrix / scenario tests for journeys A and (if enabled) B; isolation and security negatives |

## Exact scope — OUT

| Area | Out of slice |
|------|--------------|
| Implementation in docs PR | **No code in documentation program** |
| Unrestricted child-to-child Social Flow | Explicitly excluded |
| Adult-stranger-to-child coordination | Explicitly excluded |
| Unresolved legal youth growth features | Growth loops, public youth discovery, minor friend graphs as growth — excluded |
| Public discovery / social feed of plans | Out |
| Social Score / relationship ranking / “most important” | Forbidden permanently; not “later in slice” |
| External calendar providers | Out (projection optional local only if already trivial) |
| Continuous or precise location | Out |
| Blockchain / DID / staking / wallets | Rejected as dependency |
| Advertising on intimate data | Rejected |
| Auto-RSVP without authority | Forbidden |
| Broad relationship memory mining from full history on activation | Out — narrow start only |
| Group plans with large circles | Out (2 adults; or parent+older child only) |
| Professional/community context packs | Out |
| Gift/surprise full multi-helper mode | Out of SF-1 (private commitment isolation still required where applicable) |
| Voice clone / telephony-as-user | Out |
| Mood surveillance | Out |

---

## Security and safety negatives (must fail closed)

The slice is not done if any of the following can occur in tests:

1. **Silent binding event** — plan becomes authoritative without coordinate/action consent.  
2. **Private → shared leak** — parent-only or private adult commitment/reminder visible to the other party without explicit share.  
3. **Cross-conversation leak** — plan fields or AI-derived coordination appear in a chat that is not a member.  
4. **Stranger–child path** — any adult without authorized family relationship can activate Social Flow with a child account.  
5. **Unrestricted child–child** — two minors activate full Social Flow without guardian/policy path (must be impossible in SF-1).  
6. **Python authority bypass** — Python worker creates plan/RSVP/commitment authority without Elixir.  
7. **Frequency auto-escalation** — high message volume alone enables capabilities or deep history analysis.  
8. **Revocation bypass** — after consent revoke, new AI jobs still process that conversation/plan scope.  
9. **Unauthorized multi-device** — plan updates appear on a device/session not belonging to a participant.  
10. **Score or rank** — any Social Score, intimacy rank, or “most important relationship” surface or hidden field driving UX.

---

## Acceptance gates summary

Engineering and QA treat these as **release gates** for a future Social Flow 1 implementation PR (detailed matrix may live in `docs/build/SOCIAL_FLOW_1_ACCEPTANCE_MATRIX.md` when authored by test architecture).

| Gate | Summary criterion |
|------|-------------------|
| **G1 Lifecycle (adult)** | Journey A completes proposal → consent → agreement → shared plan → revision → private reminder on two users |
| **G2 Authority** | Elixir is sole authority for plan/commit/RSVP; Python proposals only; contract tests enforce |
| **G3 Consent** | Feature + conversation + action consents enforced; revoke stops new AI processing |
| **G4 Isolation** | Shared vs private isolation tests pass; cross-conversation isolation tests pass |
| **G5 Activation** | Activation requires user choice; frequency does not auto-enable deep analysis |
| **G6 Family (conditional)** | If Journey B enabled: pickup plan shared correctly; parent-only private remains private; time change multi-device for members only |
| **G7 Family exclusion** | Child–child unrestricted, adult-stranger–child, youth growth features absent and regression-tested as blocked |
| **G8 No score** | No Social Score / ranking artifacts in API or UI |
| **G9 Multi-device** | Participant devices reconcile plan revision; non-participants do not |
| **G10 Evidence** | Automated tests + recorded scenario evidence for A and (if applicable) B |

**Docs program gate (this branch):** Files exist, cross-linked, labeled with authority; **no claim that Social Flow 1 is implemented.**

---

## Runtime ownership (unchanged)

| Layer | Owns in SF-1 |
|-------|----------------|
| **Python** | Bounded interpretation: possible plan, missing fields, uncertainty, suggested prompts — proposals only |
| **Elixir/BEAM** | Consent gates, membership, plan authority, revisions, participation, reminder scheduling hooks, realtime fan-out, idempotency, audit |
| **Mobile** | Local projection, dismissible affordances, offline-tolerant pending UX for plan-related client state |

---

## Activation scope for SF-1

Per `OPAL_RELATIONSHIP_ACTIVATION.md`, SF-1 implements only:

- private candidate suggestion for the test conversation(s);
- user enable Social Flow for that conversation;
- user confirm context (adult friend/partner **or** parent_child / child_parent for Journey B);
- capability subset: **plan recognition**, minimal **shared availability**, **reminders**, **commitments** (private), and for Journey B **family coordination** + **child pickup** template only.

Out of SF-1 activation: travel packs, school-wide activity OS, household chore systems, gift/surprise multi-helper, community/professional packs.

---

## Relationship to prior slices and decisions

| Prior | Relationship |
|-------|----------------|
| Build Slice 1–2 | Messaging, consent-gated AI jobs, realtime — **foundation**, not Social Flow |
| `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md` “first slice” note | This document **refines** the first *implementation* slice: still lifecycle-first; adds **conditional** bounded family path |
| SF-D014 (two-user lifecycle) | Journey A remains mandatory core; Journey B is additive and safety-gated, not a replacement |
| SF-D011 (minors deferred) | Full minors calendar product remains deferred; SF-1 allows only the **narrow** parent+older-child path under explicit gates — not general youth product |

Founder/decision-log updates that formalize Journey B remain Agent Zero / decision-log ownership.

---

## Non-claims

- This markdown does **not** mean Social Flow is built.  
- Passing docs review does **not** waive child-safety or legal gates for Journey B.  
- SF-1 is not WhatsApp-complete, not a full calendar product, and not multi-circle Social Flow.  
- Scenario names (dinner, practice pickup) are **behavioral templates**, not hard-coded permanent product SKUs.

---

## Suggested future engineering order (informative)

1. Adult Journey A only on a feature branch, gates G1–G5, G8–G10.  
2. Isolation and security negatives hardened.  
3. Journey B behind explicit flag when age/guardian/privacy architecture and G6–G7 pass.  
4. Expand capabilities and contexts only via later slices.

---

## Open questions for implementation planning

- Minimal availability grant shape (free/busy vs manual windows only) for SF-1  
- Whether dual consent is required before shared plan AI runs, or only before shared plan commit  
- Exact “older child” test population definition once age tiers exist  
- Reminder delivery channel (in-app only vs push) for SF-1  
- Data retention of rejected proposals  

---

## One-line summary

**Later: prove adult dinner coordination end-to-end, and only if safe, parent + older child practice pickup as a family plan — with private parent notes private, no stranger/child or unrestricted child–child Social Flow, and no implementation in this documentation PR.**
