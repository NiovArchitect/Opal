# P4.6 Authority Reconciliation

**Date:** 2026-09-05  
**HEAD at start:** `939b8ea`  
**Branch:** `build/v2-coded-experience-closure`  
**Mode:** Audit first — record contradictions before repair.

## Authority snapshot (as of start)

| Flag | Value |
|------|-------|
| P2 / P3 | FOUNDER ACCEPTED · FROZEN |
| P4.0–P4.5 | COMPLETE |
| `post_b7_p4_complete` | **false** (correct until convergence) |
| `post_b7_p4_6_authorized` | false at start → GO now |
| `authorized_next_square` | was HOLD_P4_6 |
| REAL_EXTERNAL | `openstreetmap_overpass` |
| Google / Ticketmaster | DEPENDENCY |
| Kafka local | GREEN · prod NO · SoT NO |
| STORE_READY | NO |
| MERGE / LIVE | NO |

## Contradictions / stale statuses found

| # | Source | Says | Truth | Action |
|---|--------|------|-------|--------|
| 1 | Kafka ADR | Activate / required at **P4.4**; stub adapter | Publish+proof **P4.1/P4.1a**; consumer **P4.5** | Doc repair |
| 2 | `P4_EVENT_CONTRACT.md` | Kafka relay **P4.4** | Same as above | Doc repair |
| 3 | Reality Matrix rows | DecisionContext / ladder NOT_BUILT; Kafka implemented NO | Built through P4.5 | Doc repair |
| 4 | `OPAL_REALTIME_INTELLIGENCE_ARCHITECTURE.md` | Non-goals: do not implement Kafka/P4 | Superseded | Strike / annotate |
| 5 | `OPAL_DECISION_INTELLIGENCE.md` | `p4_checkpoint: P4.0` | Should be P4.5→P4.6 | Doc repair |
| 6 | YAML header `checkpoint_sha` / version | 2026-09-01 / a183db9 | Tip is 939b8ea | Refresh on close |
| 7 | FOUNDER_P3_ACCEPTED | `P4_AUTHORIZED=NO` | Historical freeze; YAML is current | Annotate historical |
| 8 | P4.5 world audit | Consumer/materiality NOT_BUILT | Built in P4.5 | SUPERSEDED banner |
| 9 | PlaceProvider capability matrix | hours/price/ratings true | OSM incomplete vs Google | Honesty note — not ecosystem complete |
| 10 | Activity icon labels | FOUNDER_REVIEW vs REJECTED mix | `1046:2` review-only; not implement | Keep; no 1046:2 |
| 11 | **Global Opal → DI** | Product implies Center decides | **UI demo only; no DI HTTP/API** | **PROVEN DEFECT — surgical wire for cold start** |
| 12 | OSM ≠ provider ecosystem | Risk of overclaim | Discovery REAL_EXTERNAL ≠ booking/slots/confirm | Freeze law |

## Duplicate ownership

- Truth of Kafka phase: ADR vs Event Contract vs STOP lineage — reconcile to P4.1a publish / P4.5 consume.
- Reality Matrix vs YAML half-updated — YAML wins for flags; matrix must catch up.

## Incorrect REAL / FIXTURE

- Default places mode without key remains **synthetic → Catalog FIXTURE** — honest for tests; must not be silent production fallback.
- OSM is REAL_EXTERNAL **when connected** — not silent default.
- Do **not** upgrade Google/Ticketmaster without keys.

## Visual authority (unchanged)

`618:902` shell · `979:2` / `979:280` High · `988:2` Medium · `988:263` Low · Activity dest `618:2384` · icon `1046:2` FOUNDER_REVIEW only.

## Objective P4 defects discovered

1. **COLD_START_PRODUCT_PATH** — Nearby now / Global Opal does not invoke `DecisionIntelligence` / OSM. Backend ladder is real; product surface is fixture. Blocks canonical cold-start proof and “one pipeline” claim for the user-visible Center.
2. **Doc phase drift** — Kafka “P4.4” myths and Reality Matrix NOT_BUILT rows undermine institutional memory.

## Non-defects (do not auto-fix as P4)

Production Kafka, App Store packaging, TURN/WebRTC, APNs/FCM, production SMS default, Sentry — **STORE_READY blockers**, not P4_COMPLETE hostages.
