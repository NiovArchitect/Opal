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
| H4 | HIGH | INT-CHRON-001 | Chronology | always still_open | YES | hard-coded stage | Deferred (no broad chrono rewrite) | EP-002 refresh | OPEN |
| M1 | MED | memory | PreferenceMemory | Curate/place | YES | not wired | Deferred | — | OPEN |
| M2 | MED | calendar | private windows strip | competes with place | YES | not gap-gated | Private strip only when next_gap=time | EP-002 | **REPAIRED** |
| M3 | MED | Home detail | place_gap_label | Home generic Choose the place | residual | wording density | OPEN | EP-002 | OPEN |
| R1 | MED | restraint | thin chat | next_gap time | YES | empty dims still gap when | thin_chat → empty gaps | — | **REPAIRED** |
| R2 | MED | INT-JOURNEY-003 | FaceTime | not extracted / when invent | YES | missing activity + Thursday default | FaceTime extract + remote no place | EP-004 | **REPAIRED** |

---

## Domain results (post-repair)

| Area | Result |
|------|--------|
| **MEMORY** | Not compound-wired into Curate; Italian is presentation category only. Long-term memory overwrite tests not executed this pass. **PARTIAL / OPEN** |
| **GROUP** | Dyad Jordan OK; EP-006 bridge property only. No group repair this pass. **UNCHANGED** |
| **CALENDAR** | Private strip gated to time gap; composition laws intact. **IMPROVED (presentation gate)** |
| **PLACE** | Gap math OK; options still demo list with Italian soft-order + label carry. **IMPROVED** |
| **CURATE** | Still private-first; now inherits place_gap_label context in place sheet. Full memory rank OPEN. **PARTIAL** |
| **EXTEND** | Still only when next_gap none + set/ready. **UNCHANGED (correct restraint)** |
| **CONTRADICTION** | apply_dimension_update preserves WHERE when WHEN changes. **PROVEN UNCHANGED** |
| **RESTRAINT** | Thin chat no longer invents time homework; remote FaceTime no place CTA. **IMPROVED** |

---

## Repairs made (minimal)

1. `OpalApp.tsx` — merge conversation primary signal into `liveSignals` on openChat  
2. `product_signals.ex` — `SocialReality.project/2` for production shared_reality  
3. `shared_reality_presentation.ex` — no fabricated Thursday 6:30; bare hour evidence; FaceTime activity; thin-chat restraint; remote place_matters  
4. `grammar.ts` — no default Find a time unless next_gap=time; confirmation chip; private windows only for time gap  
5. Place sheet shows `place_gap_label`; Italian soft-sort options  
6. Tests for no invent time, FaceTime, Italian place gap  

**Not done:** Chronology stage hard-code (H4), PreferenceMemory→Curate (M1), structured place share payload, full group matrix product proof.

---

## Post-change intelligence DIFF

```text
CAPABILITIES IMPROVED:
  INT-REALITY-001 (evidence-only WHEN)
  INT-JOURNEY-001/003 (product path = project; FaceTime remote)
  INT-PRESENT-003 (no wrong default time CTA)
  INT-PRESENT-002 (liveSignals continuity)
  INT-PLACE-001 (category residue into private place UI)
  INT-CALENDAR-* presentation gate (private strip)

CAPABILITIES UNCHANGED:
  INT-GROUP-*, INT-EXTEND-001, INT-PROOF-*, INT-SF15, brand
  INV-PRESERVE-DIM, share_kind place contract, private select ≠ send

CAPABILITIES REGRESSED: none observed in suites

AUTHORITY: still authorizes_set false; Set via AlignmentAuthority
PRIVACY: place private-first; calendar strip narrower
COORDINATION RESIDUE: Italian label preserved into place sheet
KNOWN UNKNOWNS: H4 chronology stage; memory composition; live browser re-proof
```

---

## Brand / merge

- Brand 93:* **BLOCKED** — untouched  
- V2 merge **HOLD**
