# Intelligence Continuity Audit

**Date:** 2026-08-13  
**Branch:** `build/v2-coded-experience-closure`  
**Constitution:** v1.0.0 (`fbaabed` … remote tip)  
**Mode:** Correctness pass under Constitution — not a new governance layer  
**V2 merge:** HOLD  

---

## Preflight (before product work)

```bash
./scripts/intelligence_check.sh --impact --with-tests
```

| Field | Value |
|-------|--------|
| CONSTITUTION VERSION | 1.0.0 MATCH |
| TARGET CAPABILITY | INT-REALITY-001/002, INT-JOURNEY-001/003, INT-PLACE-001, INT-PRESENT-003, INT-AUTHOR-001, INT-CURATE-001 |
| CURRENT BEHAVIOR | Jordan TIME→PLACE works in domain; continuity drops at liveSignals, fabricated WHEN, dual next_gap owner, place UI ignoring category |
| PROPOSED DELTA | Minimal propagation/adapter repairs only |
| DEPENDENCIES | SocialReality, SharedRealityPresentation, ProductSignals, client deriveSocialReality/grammar |
| INVARIANTS TO PRESERVE | INV-PRESERVE-DIM, INV-NEXT-GAP-ONE, INV-REMOTE-NO-PLACE, INV-PLACE-SHARE-KIND, INV-AUTHORIZES-SET-FALSE, INV-SELECTION-NOT-SEND |
| EPISODES | EP-001…EP-008 (esp. EP-002, EP-004, EP-007, EP-008) |
| AUTHORITY | SocialReality remains `authorizes_set: false`; Set still AlignmentAuthority |
| PRIVACY | Private place select ≠ send; calendar private strip only when time gap |
| EXPECTED NON-CHANGES | Brand, harness architecture, SF15, V2 merge, no new providers |

---

## Jordan lineage trace (EP-002 dinner)

| Step | SOURCE | TRANSFORM | OUTPUT | OWNER | PERSISTED? | PRIVATE/SHARED |
|------|--------|-----------|--------|-------|------------|----------------|
| 1 Human messages | Founder/Jordan POST bodies | Message store | Evidence stream | Messaging | Yes | Shared |
| 2 Evidence stage | Bodies vs plan/availability/ready patterns | classify → still_open / set | lifecycle_stage | ProductSignals | Recomputed | Shared-progress |
| 3 Authority Set | Messages + proposal id | AlignmentAuthority.authorize_set? | elevated stage | AlignmentAuthority | Stage recomputed | Shared when authorized |
| 4 Inferred dims | Bodies | extract what/when/place_truth | Dinner, Thu·6:30, Italian category, where nil | SharedRealityPresentation | No | Shared-safe |
| 5 next_gap | Dims + stage | SocialReality.next_meaningful_gap | **place**, Choose a place | SocialReality (+ presentation) | No | Shared |
| 6 Product signal | project() whole picture | embed shared_reality | ProductSignal | ProductSignals | Recomputed | Shared |
| 7 Client | signal.shared_reality | deriveSocialReality prefer server gap | SocialRealityView | socialReality.ts | No | Client projection |
| 8 CTA | next_gap place | One primary chip/journey | Choose a place | grammar + OpalApp | No | Shared label; sheet private |
| 9 Private select | Venue options | buildPlaceShareDraft → composer | Draft only | OpalApp | No | **PRIVATE** |
| 10 Explicit share | User send | POST message | Peer sees place | Messaging | Yes | **SHARED** |
| 11 Chronology | Stage + headline | moments / durable chrono | Filaments | ProductSignals / Chronology | Yes | Shared |
| 12 Home / Plans | same signals | presenceLines / isDurable | Jordan presence | sharedReality.ts | No | Shared |

### Snapshot after mutual time agreement (fixture)

```text
Evidence: dinner + Thursday + after 6 / 6:30 + affirmations
Reality: WHAT=Dinner WHEN=Thursday·6:30 WHERE=open
Inference: place strongest unresolved; Italian category when said
Authority: authorizes_set=false; stage set only via AlignmentAuthority
Privacy: place sheet private until send
next_gap: place
Candidate actions: Choose a place / Curate / Share a place
Suppressed: Find a time
```

---

## Intelligence loss seams

| ID | Sev | Capability | Where enters | Where lost | Loss? | Root cause | Repair | Episodes | Result |
|----|-----|------------|--------------|------------|-------|------------|--------|----------|--------|
| C1 | CRITICAL | INT-PRESENT-002/003 | ProductSignals shared_reality | openChat used label-only signal | YES | liveSignals not updated on openChat | Merge primary signal into liveSignals | EP-002 | **REPAIRED** |
| C2 | CRITICAL | INT-CURATE-001 / PLACE | place_gap_label Italian | Place sheet generic options | PARTIAL | Hardcoded venues ignore category | Show place_gap_label; Italian soft-sort | EP-002 | **PARTIAL REPAIR** |
| H1 | HIGH | INT-JOURNEY-* | SocialReality.project tests | ProductSignals used presentation only | YES | Dual next_gap owner | ProductSignals uses SocialReality.project | all EP | **REPAIRED** |
| H2 | HIGH | INT-PRESENT-003 | open_loop | Default Find a time | YES | grammar fallback | Only Find a time when next_gap=time | EP-002 | **REPAIRED** |
| H3 | HIGH | INT-TIME-001 / REALITY | extract_when | Invented Thursday 6:30 | YES | demo default | Day-only without clock; bare hour kept | EP-001/004 | **REPAIRED** |
| H4 | HIGH | INT-CHRON-001 | Chronology | always still_open | YES | hard-coded stage | Reality-delta chronology | EP-002/007 | **REPAIRED (pass 2)** |
| M1 | MED | memory | PreferenceMemory | Curate/place | YES | not wired | PlaceOptionComposition + client composePlaceOptions | EP-002 | **REPAIRED (pass 2)** |
| M2 | MED | calendar | private windows strip | competes with place | YES | not gap-gated | Private strip only when next_gap=time | EP-002 | **REPAIRED** |
| M3 | MED | Home detail | place_gap_label | Home generic Choose the place | residual | wording density | OPEN | EP-002 | OPEN |
| R1 | MED | restraint | thin chat | next_gap time | YES | empty dims still gap when | thin_chat → empty gaps | — | **REPAIRED** |
| R2 | MED | INT-JOURNEY-003 | FaceTime | not extracted / when invent | YES | missing activity + Thursday default | FaceTime extract + remote no place | EP-004 | **REPAIRED** |

---

## Domain results (post-repair)

| Area | Result |
|------|--------|
| **MEMORY** | PlaceOptionComposition + PreferenceMemory rank; current intent > episode > relationship; non-destructive. **IMPROVED (pass 2)** |
| **GROUP** | Dyad Jordan OK; multi-party memory not fully solved. **UNCHANGED** |
| **CALENDAR** | Private strip gated to time gap; composition laws intact. **IMPROVED (presentation gate)** |
| **PLACE** | Gap math OK; ranked options compose category + memory. **IMPROVED** |
| **CURATE** | Private-first; top ranked from composition; arc uses composed top. **IMPROVED (pass 2)** |
| **EXTEND** | Still only when next_gap none + set/ready. **UNCHANGED (correct restraint)** |
| **CONTRADICTION** | apply_dimension_update preserves WHERE when WHEN changes. **PROVEN UNCHANGED** |
| **RESTRAINT** | Thin chat no time homework; remote FaceTime no place; chrono only on delta. **IMPROVED** |
| **CHRONOLOGY** | Reality-delta kinds (time_resolved, place_resolved, replace, reopen). **IMPROVED (pass 2)** |

---

## Pass 2 — H4 Chronology

| | |
|--|--|
| BEFORE | `maybe_record_shared_reality` always projected `:still_open`, kind `shared_reality`, keyed only by headline phash → spam / stale stage |
| ROOT CAUSE | Stage hard-coded; no BEFORE/AFTER dimension compare |
| REPAIR | `SocialReality.project` before/after; emit only deltas (`time_resolved`, `place_resolved`, reopen, replace); lifecycle from reality |
| AFTER | Causal labels e.g. “6:30 became the time”; “Friday replaced Thursday”; no identical still_open dump flood |
| EPISODES | chronology_test delta + replacement; EP-002/007 |
| INVARIANTS | INV-PRESERVE-DIM, INV-ONE-LINEAGE intact |

## Pass 2 — Memory → Curate

| | |
|--|--|
| BEFORE | PreferenceMemory ranked in isolation; Curate/place sheet ignored it |
| MEMORY SOURCE | PreferenceMemory facts (relationship/episode); episode category from place_gap_label |
| COMPOSITION PATH | `PlaceOptionComposition.compose` + client `composePlaceOptions` |
| RANKING EFFECT | Italian episode → italian cuisine first; lively intent overrides quiet memory |
| PRIVACY | Prefs private_viewer; reasons not peer-disclosed; no “Jordan prefers quiet” shared filament |
| OVERRIDE | Current intent > episode category > relationship memory; memory fact not revoked |
| RESULT | **REPAIRED** with unit/property tests; live Jordan 18/18 |

## Repairs made

### Pass 1
1. liveSignals merge · ProductSignals → SocialReality.project · no fabricated 6:30 · FaceTime remote · thin restraint · grammar time gate · place_gap_label

### Pass 2
1. Chronology reality deltas (H4)  
2. PlaceOptionComposition + PreferenceMemory category boost  
3. Client placeComposition + Curate/place sheet ranking  
4. Catalog Juniper italian + Campfire  
5. chronology_test + place_option_composition_test + placeComposition.test  

**Still open:** multi-party memory composition; provider truth beyond fixture catalog; structured place-share payload; Home place_gap_label density (M3)

---

## Post-change intelligence DIFF (pass 2)

```text
CAPABILITIES IMPROVED:
  INT-CHRON-001 (causal deltas)
  INT-CURATE-001 / INT-PLACE-001 (memory+episode composition)
  INT-MEM composition path (PreferenceMemory → rank)

CAPABILITIES UNCHANGED:
  INT-JOURNEY-001/002, INT-AUTHOR-001, INT-PROOF-*, brand, SF15
  INV-PRESERVE-DIM, private select ≠ send, authorizes_set false

CAPABILITIES REGRESSED: none

CHRONOLOGY DIFFERENCE: stage dump → dimension deltas
MEMORY DIFFERENCE: disconnected → compose with precedence
AUTHORITY: candidate_only ranking; no auto settle
PRIVACY: private prefs not shared filaments
PRESENTATION: Curate arc uses ranked top; place options ranked
COORDINATION RESIDUE: Italian + optional quiet memory compound
LIVE JORDAN: 18/18 PASS (0 PRODUCT/FIXTURE/ENV fail)
KNOWN UNKNOWNS: group multi-memory; durable preference store in product signals
```

---

## Brand / merge

- Brand 93:* **BLOCKED** — untouched  
- V2 merge **HOLD**
