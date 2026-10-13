# PASS 2 ENTRY REVIEW

**Status:** ARCHITECTURE REVIEW ONLY — Pass 2 remains LOCKED  
**At:** 2026-10-13  
**Tip context:** Consumer Reality Gate GREEN (`a4d48179` on `muse/packet-b-batch-2`)  
**Purpose:** Give the founder enough evidence to decide whether/when to unlock — **not** to implement

```yaml
pass_2: LOCKED
implementation: FORBIDDEN
memory_expansion: STOPPED
relationship_inference_productization: STOPPED
```

## Framing shift this review protects

| Before (wrong next question) | Now (correct next question) |
|------------------------------|-----------------------------|
| Can Opal know things about people? | Can Opal reliably facilitate people connecting with each other? *(proven — Reality Gate)* |
| Build memory | How does Opal understand people without violating trust? |

Human loop first. Understanding second. Founder unlock decides when second begins.

---

## 1. Existing relationship-related code

### Backend (`apps/opal_core`)

| Area | Path / module | Status |
|------|---------------|--------|
| Relationship types (RU-1) | `lib/opal_core/relationships.ex`, `relationships/relationship_type.ex`, migration `20261009010000_relationship_types.exs` | **Exists** — explicit per-contact types |
| Access scopes (Paste I) | `relationships/access.ex` (inner / social / work / distant / unset) | **Exists** — API + prompt visibility tiers |
| Behavior framing | `relationships/behavior.ex`, `broadcast_framing.ex` | **Exists** |
| Type inference | `relationships/inference.ex`, migration `20261019010001_relationship_type_inference.exs` | **Partial** — substrate present; productization held |
| ConsentProof | `consent.ex`, `consent/consent_proof.ex`, migrations `consent_proofs*` | **Exists** — act-on-behalf gating |
| ConversationAlignment | `social_flow/conversation_alignment.ex` | **Exists** — Pass 1 authority spine |
| SharedPlan / participation | `social_flow` plan + participant modules | **Exists** — multi-user shared reality |
| AttentionCenter | `social_flow/attention_center*.ex` | **Exists** |
| Celebrations | product celebrations paths (Phase 10A / D-2) | **Exists** — owner-scoped |
| Invites (NE-1) | `invites.ex`, `product_invite_controller.ex` | **Exists** — distinct from RelationshipInvitation |
| RelationshipInvitation | `social_flow/relationship_invitation.ex`, FE `people/FindPeopleFlow.tsx` | **Exists** — onboarding graph invite |
| Celebrations | `celebrations.ex` + reminder worker + controllers | **Exists** — owner-scoped; subject is `person_name` string (weak identity) |
| Financial comfort (RU-3) | `financial_profiles.ex` + TrustTiers | **Exists** — trust-gated |
| Center memory facade | `memory.ex` → `SocialFlow.RelationshipMemory` | **Exists** — explicit store/recall only; never invents |
| Memory candidates | `SocialFlow.MemoryCandidate` (+ migration) | **Exists** — closest coded spine to Fact Ownership Law |
| Durable preferences | `DurablePreferenceMemory` (visibility forced `private`) | **Exists** — explicit / gated promote paths |
| MemoryIntelligence | `intelligence/` memory promotion paths | **Partial / hold** — `maybe_promote` / auto-promote must not expand under lock |
| Person memory schema | `social_memory/person_memory.ex` (`known_facts` **untyped map**) | **Exists as schema — high risk if productized raw** |
| Social memory suite | `social_memory/` (routine, plan_memory, social_pattern, weekly_briefing, ingest, recall, `scoped.ex`, workers) | **Partial** — account-scoped substrate; do not expand product surfaces |
| SharedMemoryConsent | `social_flow/shared_memory_consent.ex` | **Exists** — pending/accept/decline/not_now |
| Behavior profiles | migration `20261013010002_create_relationship_behavior_profiles.exs` | **Exists** — substrate |
| RecommendationIntelligence (A5) | recommendation paths | **Exists** — laws: does not commit SharedPlan; does not auto-write durable from accepts |

### Frontend (`apps/opal_web`)

| Area | Path | Status |
|------|------|--------|
| Relationship type UI | `opalUi/relationshipTypes.ts`, You hub People picker | **Exists** |
| Person memory view | `opalUi/intelligence/PersonMemoryView.tsx` (+ tests) | **Exists** — representation / transparency; expand carefully |
| What Opal Remembers | `WhatOpalRemembersSection` (+ tests) | **Exists** — honesty surface |
| Center chat | `OpalCenterChat.tsx` | **Exists** — companion; Remember chip locked in consumer walks |
| Intelligence client | `api/intelligenceClient.ts` | **Exists** |
| Settings honesty | `settingsWireClass.ts`, You settings destinations | **Exists** — GREEN / HONEST_GATE / HIDDEN |

### Proven multi-user loop (Consumer Reality Gate G4)

Walk A ↔ Walk B: create direct conversation → send → receive → reply → both list conversation. Evidence: `shots/founder_staging_walk_correction/reality_gate/G4_TWO_USER.json`.

---

## 2. Existing permission model

| Mechanism | Status | Notes |
|-----------|--------|-------|
| ConsentProof grant/revoke | **Exists** | Capability-gated execution |
| Relationships.Access tiers | **Exists** | Viewer’s own type label; asymmetry preserved |
| PlanParticipant share | **Exists** | Explicit share beats ambient visibility |
| Founder seed gate | **Exists** | `resolveFounderSeedGate` / production_default seed off |
| Settings visibility classes | **Exists** | Incomplete rows hidden; no “not wired” consumer paint |
| Device / OTP / session | **Exists** | DeviceSession, production_sms on staging |
| Fact visibility law | **Law only** | Schema expansion deferred — see §3 |

**Gap:** Full Person-permission graph (every relationship fact carries enforced Visibility + Correction in product UI) is **not** Pass 2-ready. Access tiers + ConsentProof are the foundation.

---

## 3. Existing data ownership model

| Layer | Status |
|-------|--------|
| `STATE_OWNERSHIP_LAW.md` | Authority — one owner per fact class |
| `REALITY_SOURCE_PRIORITY_LAW.md` | live → shared → historical → demo → empty |
| `FACT_OWNERSHIP_VISIBILITY_LAW.md` | Law formalized: Owner · Source · Confidence · Scope · Visibility · Expiration · Correction |
| `OPAL_UNDERSTANDING_LAW.md` | Constitution: six questions before store/recall/act |
| ConversationAlignment / SharedPlan lineage | **Coded** — Postgres truth for plans |
| Memory ladder Observed→Candidate→Confirmed→Durable | **Doctrine + partial code** (`MemoryCandidate`, durable preference, hygiene columns `20261015010003`) |
| PersonMemory `known_facts` map | **Weak vs law** — map blob does not yet enforce six-question fields per fact |

**Gap:** Durable relationship facts as first-class rows with mandatory six fields are **not** uniformly enforced. Expanding PersonMemory without that schema would violate the constitution.

---

## 4. Existing AI integrations

| Component | Path | Role |
|-----------|------|------|
| LlmAdapter | `intelligence/llm_adapter.ex` | Provider-agnostic chat (deepseek/openai); honest readiness; never fakes text |
| LlmExtract / LlmRespond | `intelligence/llm_extract.ex`, `llm_respond.ex` | Extract / respond paths |
| EventIngestor | `intelligence/event_ingestor.ex` | Event intake |
| FeedbackLoop | `intelligence/feedback_loop.ex` | Feedback pipeline |
| Extractor / Reasoner / PromptBuilder | `intelligence/` | Pipeline pieces |
| Provenance | `intelligence/provenance.ex` | Attribution spine |
| Memory hygiene | `intelligence/memory_hygiene.ex` | Hygiene worker path |
| Center / OpalResponse | `opal_response.ex`, Center product surfaces | Conversational assistance |
| Call intelligence / transcription | `call_intelligence.ex`, Deepgram clients | Call-adjacent |

**Law already coded in posture:** AI may Interpret · Assist · Explain · Propose. AI must not create durable truth. Template floors / readiness patterns exist so disabled providers fail honestly.

**Gap / risk:** Extraction → PersonMemory / preference promotion paths must not auto-promote Candidates to Durable without Confirm + six questions. Product “Remember” affordances remain locked on consumer walks.

---

## 5. Proposed relationship intelligence boundaries

### Must NOT ship until unlock

- Partner / Person Graph productization as “Opal knows them”
- Preference learning that invents Durable facts
- Emotional inference labeled as Confirmed desire
- Personality / relationship scoring in consumer UI
- Assumption engine / automated life management
- Flat profile cards without Source · Confidence · Scope
- Cross-context fact leak (work preference shown as partner truth)

### Architecture prep ALLOWED now (this review)

- Understanding Law + Context Model (done)
- Entry contract + capability map (already authority)
- Inventories, risk lists, smallest-slice design docs
- Pass 1 coherence / production readiness
- Schema *design* notes that cite six questions — **no** intelligence feature PRs

### Governing documents

1. `OPAL_UNDERSTANDING_LAW.md`  
2. `RELATIONSHIP_CONTEXT_MODEL.md`  
3. `RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md`  
4. `FACT_OWNERSHIP_VISIBILITY_LAW.md`  
5. `PASS2_PLUS_CAPABILITY_MAP.md`  

---

## 6. Security / privacy risks if Pass 2 unlocked naively

| Risk | Failure mode |
|------|----------------|
| Scope collapse | Dyad-private fact projected into group / Home feed |
| Confidence laundering | Observed utterance → Durable “likes X forever” |
| Asymmetry break | A’s type label for B appears in B’s contracts |
| Seed impersonation | Founder universe presented as user’s people |
| Silent overwrite | New inference erases prior belief without history |
| Current-state blindness | Stressed “quiet night” ignored; historical “loves restaurants” wins |
| Group→person bleed | “We should do Cabo” becomes everyone’s travel fact |
| Consent bypass | Assist / act-on-behalf without ConsentProof |
| Explanation void | Surfaced suggestion with no human-readable why |
| Correction absent | No path for Chanelle (or owner) to fix wrong belief |

Any unlock plan must treat these as **required zeros**, not post-launch polish.

---

## 7. First smallest useful relationship capability (recommendation)

**Not** “build memory.”  
**Not** “Person Graph v1.”  
**Not** expand `PersonMemory.known_facts` or MemoryIntelligence auto-promote.

### Recommended first slice (after explicit founder unlock only)

**Two-step trust ladder:**

#### Step A — Permissioned edge confirmation (smallest)

Treat already-coded RU-1 provisional inference (`Relationships.Inference` + Access asymmetry + confirm/dismiss) as the **sole** first consumer behavior under the entry contract:

- Human explanation: “I think of Maya as a close friend — right?”
- Correction first-class
- No new Durable preference / emotional / gift automation

#### Step B — Scoped observation Candidate (next)

Only after Step A feels trustworthy:

1. User A states something about / with person B in an existing conversation.  
2. Create a **Candidate** with Source · Owner · Scope=relationship-private · Confidence=Candidate · Correction · Expiration/review.  
3. Surface only to permitted viewers with human explanation (“You mentioned…”) — never as permanent fact.  
4. Owner confirms, edits, or dismisses. Confirm → Confirmed; never Observed → Durable.  
5. STATE SURFACE CONTRACT: Conversation + transparency surface agree; no Home/Graph contradiction.

Why this order:

- Step A reuses green RU-1/Access without opening the `known_facts` bag  
- Step B exercises Understanding Law end-to-end on MemoryCandidate (closest existing spine)  
- Proves trust UX before pattern learning or group intelligence  

**While still LOCKED (allowed prep only):** schema gap inventory between Fact Ownership Law and (a) MemoryCandidate / RelationshipMemory vs (b) `PersonMemory.known_facts` — document required zeros; do not implement promotion, scoring, or partner graphs.

Defer: group shared-intent extraction, cross-context profiles, gift automation, emotional scoring.

---

## Founder decision gate

Pass 2 opens only with explicit unlock:

> "Opal is ready to begin understanding people."

Until then:

- Keep Pass 1 / Reality Gate green  
- Keep production readiness path active  
- Treat this review + Understanding Law + Context Model as the constitution  
- **Do not** implement §7

## Evidence / related

- Consumer Reality Gate: `docs/evidence/founder_staging_walk_correction/CONSUMER_REALITY_GATE_RESULT.md`  
- Hold: `shots/steward/HOLD_PERIOD_CHECKPOINT.md`  
- Pass 1 close: `shots/steward/PASS1_FINAL_CHECKPOINT.md`  
