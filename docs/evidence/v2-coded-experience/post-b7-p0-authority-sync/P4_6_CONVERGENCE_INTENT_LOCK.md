# P4.6 Convergence Intent Lock

**Starting HEAD:** `939b8ea`  
**Branch:** `build/v2-coded-experience-closure`  
**Square:** `POST_B7_P4_6_CONVERGENCE` **ONLY**  
**Reconciliation:** `P4_6_AUTHORITY_RECONCILIATION.md`

```
P4_6_AUTHORIZED = YES
P4_COMPLETE = undecided until proofs
STORE_READY = NO (expected)
MERGE = NO · LIVE = NO
P2_FROZEN = YES · P3_FROZEN = YES
1046:2 = DO NOT IMPLEMENT
```

## Purpose

Prove P4.0–P4.5 behave as **one coherent Decision Intelligence system**, classify production/store reality honestly, close P4 only if earned. **Not** a feature wave.

## Absolute distinction

| Gate | Question |
|------|----------|
| **P4_COMPLETE** | Is DI coherently implemented and proven per P4 authority? |
| **STORE_READY** | Can this ship Apple/Google with required infra, security, native, compliance? |

Legitimate: `P4_COMPLETE=YES` + `STORE_READY=NO`.

## P4 owners (runtime)

| Concern | Owner |
|---------|-------|
| DecisionContext / Result / facade | `OpalCore.DecisionIntelligence*` |
| High / Medium / Low | `high_confidence` / `medium_confidence` / `low_confidence` |
| Candidates | `CandidateAcquisition` → PlaceProvider / OSM / Catalog |
| Materiality / Recomposer / deps | `materiality` / `recomposer` / `dependency_index` |
| Outbox / Kafka / Consumer | Events Publisher, KafkaAdapter, DecisionRecompositionConsumer |
| UI shell | Global Opal `618:902` (`OpalAmbient`) — **must gain surgical DI path for cold start** |
| Phoenix DI channel | NOT_BUILT → minimal product API allowed as defect fix |

## External sources

| Source | Class |
|--------|-------|
| OSM Overpass | REAL_EXTERNAL (connected) |
| Place.Catalog | FIXTURE tests / synthetic default |
| Google Places / Ticketmaster | DEPENDENCY |
| Reservation inventory / confirm | NOT_BUILT |

**Law:** `REAL_EXTERNAL_ADAPTER=openstreetmap_overpass` ≠ `PROVIDER_ECOSYSTEM=COMPLETE`.

## Local vs production infra

| | Local | Production |
|--|-------|------------|
| Postgres | REAL | PARTIAL deploy path |
| Kafka/Redpanda | LOCAL_REAL GREEN | NOT_DEPLOYED |
| Python AI | compose LOCAL | NOT claimed |
| Twilio SMS | adapter; synthetic default | DEPENDENCY |
| WebRTC/TURN | NOT_BUILT | DEPENDENCY |
| Push APNs/FCM | NOT_BUILT | DEPENDENCY |
| Native Expo | PARTIAL internal RC | NOT store-ready |

## Canonical E2E journeys (prove)

1. Solo High fixture (regression)  
2. Solo High **live OSM** with lat/lng  
3. Medium one question → High  
4. Low one tradeoff → High  
5. Non-material event → **silence**  
6. Provider unavailable → honest failure  
7. Commitment accepted → no silent place swap  
8. **Cold start:** new user, no founder seed, Nearby now → real external candidates via product path  
9. Stale revision rejected  
10. Privacy: no blame / no private budget leak in shareable

## Failure / privacy / security matrices

Document in companion files. Target: honest FAILURE states; `PRIVATE_CROSS_BOUNDARY_LEAKS=0` for DI shareable path; no new security theater.

## Multi-user / multi-device / realtime

| | Expectation |
|--|-------------|
| Multi-user | Same decision_id/revision when Phoenix/API projects |
| Multi-device | Latest revision wins on reconnect |
| Realtime | Materiality silence preserved; consumer flagged |

## Native mobile matrix

Expo shell PARTIAL; store packaging NOT_BUILT → **STORE blocker**, not auto P4 fail.

## Release readiness categories

See `P4_6_RELEASE_BLOCKER_MAP.md`. Expected `STORE_READY=NO`.

## Explicit non-goals

New Figma · new tabs · new Activity icon · reopen P2/P3 · merge/live · paid signup · invent provider ecosystem completeness · auto-fix every store blocker · P5 start.

## Allowed code changes

Only **PROVEN DEFECT** maps:

1. Doc phase reconciliation (Kafka ADR, matrix, DI doctrine checkpoint).  
2. **Cold-start product path:** thin authenticated Decision API + Global Opal Nearby → DI/OSM (no redesign; reuse 618:902 / High visual laws).  
3. Proof harness + matrices evidence.  
4. Authority flag updates on close.

## P4_COMPLETE = YES iff

All P4.0–P4.5 complete · real external in pipeline · unified classifier · continuity/idempotency/privacy Green for DI · High/Med/Low/failure/silence/commitment proofs · cold-start real-world Solo value without founder fixture · fixture production fallback = 0 · P2/P3 unregressed · evidence committed · pushed.

Does **not** require: App Store, prod Kafka, TURN, all provider keys, native packaging.

## STORE_READY = YES iff

All release-critical categories Green (native, SMS prod, push if claimed, WebRTC if Calls claimed, prod Kafka if claimed, privacy nutrition, signing, observability, etc.). **Expected NO.**

## P4.6.x rule

If objective P4 blocker remains after this pass: `P4_COMPLETE=NO`, record surgical P4.6.x — do not broaden wave.

## STOP

Prove → classify → decide P4_COMPLETE → commit → push → **STOP**. Do not start next phase.
