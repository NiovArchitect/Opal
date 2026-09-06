# P4.5 Realtime Recomposition + World Truth — Intent Lock

**Starting HEAD:** `ddbae07`  
**Branch:** `build/v2-coded-experience-closure`  
**Authorized square:** `POST_B7_P4_5_REALTIME_WORLD_TRUTH` **ONLY**  
**Visual:** reuse High/Medium/Low authorities — **no new Figma · no 1046:2**  
**Audit:** `P4_5_WORLD_PROVIDER_REALITY_AUDIT.md`

```
P4_5_AUTHORIZED = YES
P4_6 = HOLD
P2_FROZEN = YES · P3_FROZEN = YES
MERGE = NO · LIVE = NO
CANDIDATE_SOURCE must leave silent FIXTURE default for production config
```

## Authority read

| Checkpoint | Status |
|------------|--------|
| P4.0 domain lock | COMPLETE |
| P4.1 DecisionContext + Outbox | COMPLETE |
| P4.1a Kafka local produce | GREEN |
| P4.2 High | REAL (fixture candidates) |
| P4.3 Medium | REAL |
| P4.4 Low | REAL (`ddbae07`) |

## Core law

```
EVENT ≠ CONSEQUENCE
Reality changes → does it affect an active decision?
  NO → silence
  YES → material?
    NO → evidence refresh / silence
    YES → delta mutate → revision++ → same ladder (H/M/L/FAIL)
      → persist → Outbox → Kafka → Phoenix
      → P3 decides human attention
```

**Before commitment: optimize. After commitment: protect the agreement.**

## Real candidate-source strategy

1. **Extend** existing `CandidateSource` / `OpportunitySource` / `PlaceProvider` / `Mode` — do not invent a second DI engine.  
2. Add **OpenStreetMap Overpass** adapter as **REAL_EXTERNAL** (public, no paid signup, no founder cost).  
3. Keep `Place.Catalog` as **FOUNDER_FIXTURE_ONLY** for deterministic tests.  
4. Production / `connected` modes must **never** silently fall back to founder fixture.  
5. Google Places / Ticketmaster remain adapters; keys currently **DEPENDENCY** — do not fake live responses.  
6. Canonical proof: **live Overpass → same High/Medium/Low pipeline**.

## World / provider truth model

- Facts carry provenance (`WorldFact`): source, external_id, observed_at, expires_at, live/cached, synthetic/real.  
- Provider capabilities queried; do not claim slots from discovery-only sources.  
- OSM: discovery + partial hours tags; **inventory_unknown**; **not** booking.  
- LLM cannot override provider/OSM operational facts.

## Freshness

See `P4_5_WORLD_FRESHNESS_POLICY.md`. Critical open-now / availability facts must be fresh enough for High; otherwise refresh or fail High honestly.

## Materiality

See `P4_5_EVENT_MATERIALITY_POLICY.md`. Deterministic first pass before Python. Classes:

`NO_EFFECT` · `EVIDENCE_REFRESH_ONLY` · `DETERMINISTIC_RESULT_UPDATE` · `RECOMPUTE_REQUIRED` · `USER_ACTION_REQUIRED` · `URGENT_INVALIDATION`

Same answer after recompute → **silence** (no breath/Activity/notify).

## Invalidation

Activate stored `invalidation_conditions` on DecisionResult. Map events → predicates. Do not leave as documentation-only.

## Dependency index

Entity → active decisions (`provider_place_id`, `participant_id`, `graph_id`, `journey_id`, `decision_id`). Avoid O(all) scans.

## Kafka consumer

- Group: `opal-decision-recomposition-v1`  
- Topics: `opal.decision.events` (+ world/provider when emitted)  
- Dedupe `event_id`, revision guards, coalescing, poison→quarantine/DLQ, bounded concurrency  
- Postgres remains SoT; Kafka is not SoT

## Recompute

`DecisionRecomposer` / materiality owner:

1. Load latest DecisionContext revision (latest wins).  
2. Apply delta dimensions only (dependency matrix).  
3. Re-run **existing** `resolve` ladder — no parallel engine.  
4. Per-decision lock / job uniqueness.  
5. Emit `decision.recomputed` only when material user consequence changes.

## Commitment inertia

See `P4_5_COMMITMENT_RECOMPOSITION_POLICY.md`.

| Stage | Default |
|-------|---------|
| Provisional (pre-accept) | AUTO_ADAPT allowed |
| Graph proposal shared | careful / often USER_CONFIRM |
| Participants Going | protect; material disruption only |
| Provider reserved / Journey | highest threshold |

## Phoenix

Broadcast shareable projection: `decision_id`, revisions, result id, mode, truth_state. Clients reject stale. No private evidence.

## Signal / interruption

P3 frozen. Map consequences to existing hues. See `P4_5_INTERRUPTION_MATERIALITY_POLICY.md`. Realtime is not a color. No perpetual motion.

## Failure

Provider/Python/broker outages: honest dependency; last-valid vs invalidated distinction; no fake certainty; no infrastructure in UX copy.

## Learning foundation

Durable outcome events exist for later learning. Do not midstream-flip active decisions from background preference updates.

## Explicit non-goals

- P4.6 / final convergence auto-start  
- Reopen High/Medium/Low product law  
- Reopen P2/P3  
- Merge / Live / 1046:2  
- Paid provider signup / live booking / spend  
- Redesign Home/Activity/Opal Center  
- Kafka as SoT  
- Silent fixture in production mode  

## Production blockers (honest)

| Item | Status |
|------|--------|
| Google Places key | DEPENDENCY |
| Ticketmaster key | DEPENDENCY |
| Traffic ETA / weather | NOT_BUILT |
| Live reservation inventory | NOT_BUILT |
| Kafka production cluster | NOT_DEPLOYED |
| STORE_READY | NO until real discovery + freshness + consumer proven |

## Rollback boundary

Feature-flag OSM / consumer. Fixture path remains for tests. Disable consumer → prior P4.4 ladder still works on fixtures.

## Proof plan

1. Live Overpass → candidates → High (same DI).  
2. NO-OP silence (non-material event).  
3. Material High→High / High→Failure (deterministic + real where possible).  
4. Medium/Low supersession via world event.  
5. Kafka consumer idempotency + restart + poison quarantine.  
6. Multi-client Phoenix convergence (local).  
7. Commitment inertia: post-accept does not casual-swap.  

## STOP law

Implement P4.5 only → prove → commit → push → **STOP**. Do not begin P4.6.
