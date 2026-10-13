# OPAL GRAPH — MASTER PRODUCTION CONTINUITY HANDOFF

**Status:** ACTIVE STEWARD AUTHORITY (2026-10-12)  
**Audience:** Every AI coding agent on this worktree  
**Rule:** DO NOT RESET · DO NOT REBUILD · COMPOUND ONLY

```yaml
authority_class: PRODUCTION_CONTINUITY_HANDOFF
active: true
merge: NO
public_live: NO
app_store: NOT_YET
rebuild: FORBIDDEN
replace_architecture: FORBIDDEN
delete_intelligence: FORBIDDEN
```

You are continuing development of **Opal Graph**.

Your job is NOT to create a new app.

Your job is to take the existing working system and move it from founder-controlled development into **App Store-ready production**, while preserving all intelligence, architecture, design decisions, and product laws already established.

Primary rule:

> Every improvement must compound. Every change must have regression proof. Never fix one surface by breaking another surface.

If a previous capability works, freeze it and build around it.

---

## Current repository state

| Item | Value |
|------|-------|
| Repository | `https://github.com/NiovArchitect/Opal` |
| Owner | `NiovArchitect` |
| Worktree | `opal-grok-real-people` |
| Frozen closure branch (reference) | `build/v2-coded-experience-closure` |
| Current implementation branch | `muse/packet-b-batch-2` |
| Implementation tip (W9) | `e6455aa1` |
| W8 tip | `81276ef8` |
| W7 tip | `0c5fdd57` |

Do not overwrite the frozen closure branch blindly. Preserve it as reference.

---

## Completed milestones (do not re-litigate)

### W6/W7 — Foundation (`0c5fdd57` and prior)

- 60-second onboarding path
- Brand assets (logo, wordmark, center mark, canonical colors)
- First-run gate fixed
- SecureStore session onboarding bug fixed

### W8 — Finish Opal (`81276ef8`)

- ElevenLabs opening voice (Matilda)
- Settings honesty (no fake "coming soon")
- Onboarding order: Greeting → Name → Permissions → Friends → Opal Center
- Home locked as social feed; Center middle tab / post-onboarding land
- App Store privacy documentation

### W9 — Real for friends (`e6455aa1`)

Evidence: `shots/walk/W9_VERIFY.md`

| Area | Result |
|------|--------|
| Phoenix tip health + mix 2177/0 | PASS |
| Account isolation (3b) + A→B messaging (3c) | PASS |
| Dual OTP (3a) | GATED (no SMS burn) |
| Integrations | 5 LIVE / 2 GATED / 1 TEST |
| Two-device calling | GATED |
| Physical push | GATED |
| EAS production IPA 0.13.0/5 | PASS (Finished) |
| TestFlight upload + smoke | GATED |

IPA: build `7213e09f-5b2d-4129-a99a-72e3cdd48b1d`  
Artifact: https://expo.dev/artifacts/eas/DFWIEOL2oxIABL-so6mft7NhqzfSKrMpZUPokQGxpYY.ipa

---

## Truth hierarchy (never invert)

```text
Postgres
  → Domain Logic
  → State Arbitration
  → Phoenix Realtime
  → Client Projection
  → UI
```

Forbidden:

```text
UI → fake state → AI assumption
```

Product operating stack:

```text
PRODUCT LAW
  → STATE AUTHORITY
  → BACKEND REALITY
  → AI INTELLIGENCE
  → SURFACE PROJECTION
  → UI
```

---

## Realtime and jobs

| Layer | Role |
|-------|------|
| Phoenix | Realtime edge: channels, presence, messaging, live projection |
| Phoenix PubSub | Internal fanout |
| PostgreSQL | Canonical source of truth |
| Oban | Background: AI jobs, temporal follow-through, reevaluation, providers |
| Kafka | Durable event streaming / replay / analytics pipelines only — **not** UI realtime |

Voice path (lab proven; physical two-device pending):

```text
Phoenix signaling → WebRTC → Twilio TURN → Audio
```

Voice intelligence:

```text
Call audio → Deepgram → Voice Alignment → Conversation Alignment → Opal Intelligence
```

---

## AI / provider inventory

| Service | Role | Status (W9) |
|---------|------|-------------|
| DeepSeek | Reasoning / background intelligence | LIVE |
| Deepgram | STT / voice intelligence | LIVE |
| ElevenLabs Matilda | Opal voice personality | LIVE |
| Brave | Web retrieval | LIVE |
| Twilio | SMS / Verify / TURN | LIVE |
| Duffel | Travel | TEST mode |
| Google OAuth | Calendar / Gmail | GATED (founder consent) |
| Google Places | Venues | GATED (API + billing) |
| Stripe | Wallet loads | Wired; loads gated pending legal |
| Sentry | Observability | BLOCKED (no DSN) |

---

## Product differentiator

Meta Muse: AI agent that helps a person complete tasks.

Opal: AI **relationship operating system** that helps people understand each other and create real-world alignment.

Opal must include agent execution capability, with **relationship intelligence primary** and action secondary.

Example shape (spelling locked):

```text
Chanelle
 |
 ├── Preferences
 ├── Important dates
 ├── Shared experiences
 ├── Communication style
 ├── Boundaries
 ├── Relationship context
 ├── Gifts / interests
 ├── Future intentions
 └── Memories (only when earned)
```

Never spell as "Chanel."

---

## Memory law

```text
Observed → Candidate → Confirmed → Durable Memory
```

Never:

```text
Observed → Permanent Fact
```

Occurrence / attendance law:

```text
Planned → Accepted → Scheduled → Occurred? → Confirmed
  → Memory candidate → Saved memory
```

Attendance is never silently assumed. Proof may include user confirmation, photos, receipts, shared location permission, check-ins, or conversation afterward — always with consent.

---

## Known blockers (honest)

### 1. Production API — payment gate

`https://api.opal.niovlabs.com/health` → **503 Service Suspended**.

Founder truth (2026-10-12): Render is down due to **lack of payment**.

Until billing is restored:

- TestFlight binary cannot complete production login/smoke against prod hosts
- Agent cannot unsuspend via CLI (token expired; payment is founder-owned)

Local Phoenix on this worktree remains the development authority (`production_sms`).

### 2. TestFlight

IPA exists (W9). Upload / install / smoke remain founder ASC / Transporter steps (`docs/TESTFLIGHT_UPLOAD.md`).

### 3. Calling

Lab TURN PASS. Physical two-device (push-wake, CallKit, two-way audio, decline, missed, call-log) unproven.

### 4. Founder-side Google

- OAuth consent tap (Settings → Connected accounts)
- Places API (New) enable + billing on GCP `449126891803`

---

## Milestone order (coherence before expansion)

**Next milestone: whole-system coherence → production validation.**  
Do not spend cycles “making Opal smarter” while surfaces disagree. Intelligence is ahead of coherence.

### Pass 1 — Reality graph connection (ACTIVE)

Audit and close gaps on:

```text
Conversation → Decision → Commitment → Plan → Graph → Home → Attention
```

Questions every change must answer:

- Does every decision create the correct state?
- Does every state project correctly on every surface?
- Does completed reality leave future actions without cluttering history?
- Does history stay accessible without pretending it is upcoming?

### Pass 2 — Relationship intelligence foundation

Substrate for people (example spelling: **Chanelle**): Preferences, Important dates, Shared experiences, Interests, Boundaries, Communication style, Gifts, Activities, Memories — each with context, confidence, source, privacy. Observed → Candidate → Confirmed → Durable. No feature expansion that invents facts.

### Pass 3 — App Store readiness (after Render payment)

TestFlight upload → install → onboarding → permissions → push → cold launch; social create/friend/message; intelligence conversation→suggestion→commitment→attention; two-device voice.

### Supporting compound work (parallel only when it serves Pass 1)

- Prefer-real over founder seed (seed kept for lab; never presented as a friend's reality)
- Settings: every visible control is **Live**, **honest roadmap gate**, or **not shown** — never fake toggle / dead button
- Social Home stays social
- Observability / feature flags / eval framework after coherence + prod health

---

## STATE SURFACE CONTRACT (completion law)

Authority file: `docs/authority/STATE_SURFACE_CONTRACT.md`

> **No feature is complete until every surface that represents that state has updated consistently.**

Example — a restaurant plan is not complete when only Conversation updates. Complete when:

```text
Conversation ✅  Graph ✅  Home ✅  Attention ✅  Notifications ✅  History ✅
```

One truth · one canonical action · multiple coherent projections.

## STATE OWNERSHIP LAW

Authority file: `docs/authority/STATE_OWNERSHIP_LAW.md`

> Every piece of information must have exactly one authority owner.

Time → SharedPlan · Approval → Alignment proposal/acceptance · Memory → Candidate→Confirmed · Location → permissioned service. Surfaces project; AI never owns durable truth. Duplicate active plans must be reconciled (`reconcile_conversation_plans/1`).

## REALITY SOURCE PRIORITY LAW

Authority file: `docs/authority/REALITY_SOURCE_PRIORITY_LAW.md`

> Opal must have one reality graph. Everything else is a projection.

Resolver order: live user-owned → permissioned shared → historical → explicit demo → empty. Lower never overrides higher. Production builds never auto-enable founder seed.

## FACT OWNERSHIP + VISIBILITY LAW

Authority file: `docs/authority/FACT_OWNERSHIP_VISIBILITY_LAW.md`

Every fact eventually carries Owner · Source · Confidence · Scope · Visibility · Expiration · Correction path.  
Privacy is architecture. Do not unlock Pass 2 intelligence that invents durable private facts without these fields.  
Example: Chanelle ring size — relationship-private; partner context only; Chanelle corrects/removes.

## Pass 1 final checkpoint (CLOSED) · Pass 2 (LOCKED)

Evidence: `shots/steward/PASS1_FINAL_CHECKPOINT.md`

Defensible question: **Why is Opal showing me this?**

Pass 2 entry is **not** “remember everything.” It is:

> Build a permissioned relationship graph where Opal understands people without pretending to know what it does not know.

**Gate contract (no functionality yet):** `docs/authority/RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md`  
— facts ≠ assumptions · scope required · inference ≠ desire · human explanation · correction first-class · graph ≠ flat profile.

Watch before Pass 2: open disagreement posture · relationship scope ladder · human explanation layer.  
Founder unlock required. Intelligence expansion remains HOLD.

**Hold period:** `shots/steward/HOLD_PERIOD_CHECKPOINT.md` — preservation + production readiness only.  
**Pass 2+ Capability Map (blueprint only):** `docs/authority/PASS2_PLUS_CAPABILITY_MAP.md` — proven foundation vs vision domains; does not unlock Pass 2.  
**Production Readiness Closure Matrix:** `shots/steward/PRODUCTION_READINESS_CLOSURE_MATRIX.md` — infrastructure · journeys · surface contracts before intelligence.  
**Context Alignment Engine (architecture only):** `docs/authority/OPAL_CONTEXT_ALIGNMENT_ENGINE.md` — Person+Relationship+Context+Time+Location+Intent+Permission; Pass 2 locked.  
**Dynamic Relationship Alignment Matrix (architecture only):** `docs/authority/DYNAMIC_RELATIONSHIP_ALIGNMENT_MATRIX.md` — gyroscope balances relationship context; Pass 2 locked.  
After unlock, first work defines graph authority · permissions · candidate lifecycle · correction · explanation surfaces — **then** intelligence. Never “add memory” first.

Thesis: Meta Muse helps accomplish tasks; Opal helps maintain and deepen real-world relationships.

Transition question: not “smarter” — **understand people without violating trust**.  
Governing hold question: **Does every surface represent the same reality?**

---

## Autonomous execution rule

Do not constantly ask the founder what to fix next.

Before asking:

1. Inspect repository
2. Read authority docs (this handoff, `CURRENT_OPAL_STATE`, `PRODUCT_INVARIANTS`, `AI_AUTONOMOUS_EXECUTION_CONTRACT`, `BLOCKED.md`)
3. Run tests
4. Identify regressions
5. Fix highest-value issue that is not founder-gated
6. Verify with regression proof
7. Report

Founder validates: taste, emotional experience, product feel, final decisions, payment/consent/device walks.

---

## Required regression process

Every change requires:

| Proof | Meaning |
|-------|---------|
| Code proof | Tests pass on touched paths |
| Product proof | Existing capability did not regress |
| Surface proof | Affected screens checked |
| State proof | No cross-surface contradiction introduced |

Protected surfaces (do not touch unless a paste explicitly names them): baked Splash 2 PNG, tab order, shared-plans sheet copy, You settings visual gold, free-tier-only posture.

---

## Final objective

Move Opal from "working prototype with intelligence" to "App Store-ready social AI operating system."

People use Opal because it understands who they love, what matters, what they promised, what is happening now, and what should happen next — with privacy, consent, and trust.

Do not rebuild. Do not simplify. Compound.

---

## Related authority

- `docs/authority/CURRENT_OPAL_STATE.md`
- `docs/authority/PRODUCT_INVARIANTS.md`
- `docs/authority/AI_AUTONOMOUS_EXECUTION_CONTRACT.md`
- `docs/authority/STATE_SURFACE_CONTRACT.md`
- `docs/authority/STATE_OWNERSHIP_LAW.md`
- `docs/authority/REALITY_SOURCE_PRIORITY_LAW.md`
- `docs/authority/FACT_OWNERSHIP_VISIBILITY_LAW.md`
- `docs/authority/RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md` — Pass 2 gate (LOCKED)
- `docs/authority/PASS2_PLUS_CAPABILITY_MAP.md` — life-intelligence blueprint (LOCKED; no implementation)
- `docs/authority/OPAL_UNDERSTANDING_LAW.md` — Pass 2 constitution
- `docs/authority/OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md` — time + place + context foundation
- `docs/authority/OPAL_CONTEXT_ALIGNMENT_ENGINE.md` — Context Alignment Engine (LOCKED; architecture only)
- `docs/authority/DYNAMIC_RELATIONSHIP_ALIGNMENT_MATRIX.md` — relationship gyroscope matrix (LOCKED; architecture only)
- `shots/steward/PRODUCTION_READINESS_CLOSURE_MATRIX.md` — leave-the-lab closure matrix
- `docs/authority/OPAL_RELATIONSHIP_INTELLIGENCE_DOCTRINE.md`
- `BLOCKED.md`
- `shots/walk/W9_VERIFY.md`
- `docs/TESTFLIGHT_UPLOAD.md`

### Future agent read-first (before architectural decisions)

1. `MASTER_PRODUCTION_CONTINUITY_HANDOFF.md` (this file)
2. `CURRENT_OPAL_STATE.md`
3. `PRODUCT_INVARIANTS.md`
4. `OPAL_UNDERSTANDING_LAW.md`
5. `OPAL_CONTEXT_ALIGNMENT_ENGINE.md`
6. `DYNAMIC_RELATIONSHIP_ALIGNMENT_MATRIX.md`

Continuity integrity evidence: `shots/steward/CONTINUITY_INTEGRITY_AUDIT.md` (2026-10-13; tip `67507b61`).

### Authority precedence when docs disagree

Compound only. Do not invent a competing stack. When two authority documents appear to conflict:

1. **Pass 2 unlock / intelligence shipping** → `RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md` + `HOLD_PERIOD_CHECKPOINT.md` win (Pass 2 remains LOCKED until founder unlock).
2. **Rebuild / replace architecture** → this handoff wins (compound-only).
3. **Ontology / required zeros** → `PRODUCT_INVARIANTS.md` wins (`SPEED_TO_ALIGNMENT`).
4. **Reality ownership / source priority** → Pass 1 reality laws win (`STATE_OWNERSHIP_LAW` · `REALITY_SOURCE_PRIORITY_LAW` · `FACT_OWNERSHIP_VISIBILITY_LAW` · `STATE_SURFACE_CONTRACT`). Alignment essays are architecture-only and subordinate to reality.
5. **Among locked architecture docs** → additive compound: Temporal foundation → Context Alignment Engine → Dynamic Relationship Alignment Matrix (later does not supersede earlier).
6. **Blueprint** (`PASS2_PLUS_CAPABILITY_MAP.md`) never beats gate, constitution, or product law.

Runtime truth never inverts: Postgres → domain → Phoenix → projection → UI. AI never creates truth.

Gyroscope law restated for continuity:

```text
Opal does not optimize preference similarity.
Opal optimizes contextual alignment.
```

(`RELATIONSHIP_COLLAPSED_TO_PREFERENCE_OVERLAP = 0` · `ALIGNMENT_AS_EQUAL_SACRIFICE_AVERAGE = 0`)
