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

**Still open (pre-pass-3):** multi-party memory composition; provider truth beyond fixture catalog; structured place-share payload; Home place_gap_label density (M3)

---

## Pass 3 — Multi-participant memory + collective fit

### MULTI-PARTICIPANT MEMORY COMPOSITION

| | |
|--|--|
| Module | `CollectiveComposition` |
| Inputs | GroupComposition + per-participant hard/current/episode/relationship contexts |
| Weights | hard · current · episode · relationship; role required vs optional |
| Non-dominance | Majority current lively beats one quiet relationship memory |
| Optional | Soft prefs influence; cannot force sushi over required Italian |

### MEMORY DURABILITY AUDIT

| Kind | Durable? | Owner | Notes |
|------|----------|-------|-------|
| PreferenceMemory facts | **Derived / in-memory facts** | `PreferenceMemory.remember/1` pure maps | Not auto-persisted to DB in this path |
| SharedMemory schema | **Server durable** (existing) | `SharedMemory` Ecto | Consent-gated; not fully wired to CollectiveComposition yet |
| Relationship prefs in Curate UI | **Session-only bag** | `sessionStorage opal_rel_prefs:*` | Private client inject for ranking — **not** long-term SoT |
| Episode category (Italian) | **Derived** from messages / place_gap_label | SharedRealityPresentation | Recomputed each project |
| Fixture catalog venues | **Fixture** | Catalog | Synthetic provider truth |
| Group constraints (downtown, sushi) | **Derived** from conversation evidence | GroupComposition | Durable only as message history |

**Loss on new session:** sessionStorage relationship bag lost; PreferenceMemory facts not reloaded unless server SharedMemory/product path stores them. Message-derived constraints and episode category survive via recompute.

**Direction:** Prefer server SharedMemory / preference store when wiring product signals — do not treat browser sessionStorage as durable intelligence SoT.

### COLLECTIVE FIT

- Ranked options with internal reasons; human_surface quiet (“I've got a few that fit the group.”)
- Hard filters: downtown, sushi conflict, party capacity
- Soft current: lively/quiet majority
- `authorizes_set: false`

### PARTICIPATION WEIGHT

- required vs optional/late
- Sam optional sushi does not dominate Italian required group
- Member add: WHEN preserved; party_size recomputes (GroupComposition tests)

### PRIVACY

- Human surface never includes “Maya prefers quiet” / allergy medical detail
- eval_snapshot marks memory refs private

### AUTHORITY

- candidate_only; Set remains AlignmentAuthority

### NON-DOMINANCE

- Proven in `collective_composition_test` “without single-person memory dominance”

### ABSTENTION

- Zero viable options → abstain + shared_safe summary

### ONE-QUESTION

- Downtown main conflict may surface “Downtown is the main conflict — avoid it?”

### KNOWN UNKNOWNS (post pass 3 — closed in pass 4 where marked)

- ~~Wire CollectiveComposition into ProductSignals / live Curate~~ → **pass 4**
- ~~Persist PreferenceMemory server-side~~ → **DurablePreferenceMemory / RelationshipMemory**
- Full allergy→cuisine hard filter map
- Provider truth (hours, capacity live)
- Multi-group Home presentation of “Downtown doesn't fit”
- Full multi-browser group live proof (domain+signals green)

---

## Pass 4 — Live collective continuity + durable memory authority

### LIVE COLLECTIVE PATH

```text
Messages + Membership + DurablePreferenceMemory (DB)
→ SocialReality.project
→ GroupComposition
→ CollectiveComposition
→ ProductSignals.collective_fit (shared-safe only)
→ Curate / place sheet consume server options
→ private select → explicit share
```

### PRODUCTSIGNALS BRIDGE

| Field | Ships |
|-------|--------|
| authority | candidate_only |
| authorizes_set | false |
| options | id/name/area/tag/cuisine |
| abstain / one_question / human_surface | yes |
| private reasons / Maya quiet text | **never** |

### GROUP CURATE BRIDGE

- Prefer `signal.collective_fit.options` when present (no client re-rank)
- Abstain + one_question on private place/curate surfaces
- Client composePlaceOptions only as fallback

### MEMORY DURABILITY / SERVER OWNER

| | |
|--|--|
| **SERVER SoT** | `DurablePreferenceMemory` → `RelationshipMemory` / `personal_relationship_memories` |
| visibility | private (schema) |
| write | `remember_explicit` (rejects “tonight” episode-only) |
| read | `list_for_owners` / `facts_for_participants` |
| supersede / forget | yes |
| sessionStorage | not SoT |
| MemoryStore Agent | separate adaptive path — not place SoT |

### SESSION RESTART / OVERRIDE / PRIVACY

- DB re-query proves durability after signal build
- Episode “lively tonight” not durable; quiet durable remains
- Shared signal never contains preference prose

---

## Post-change intelligence DIFF (pass 2–4)

```text
PASS 4 IMPROVED:
  live ProductSignals collective_fit continuity
  DurablePreferenceMemory server authority
  Curate/place consume server options
  no sessionStorage ranking SoT when server present

UNCHANGED: journey law, chronology deltas, authorizes_set false, brand, SF15, harness
REGRESSED: none
```

---

## Pass 5 — Live multi-user collective + external-world truth

### LIVE MULTI-USER PROOF

Executable: `live_group_collective_proof_test.exs`

| Check | Result |
|-------|--------|
| Correct-human attribution (Chris/Alex/Maya) | PASS |
| Durable Maya quiet memory private on all signals | PASS |
| Current lively override (no silent durable rewrite) | PASS |
| Hard downtown / no sushi on options | PASS |
| Sam join party 6, WHEN preserved | PASS |
| ProductSignals.collective_fit authorizes_set false | PASS |
| Non-member isolation | PASS |
| Private selection (no auto message) | PASS |
| Abstention when only downtown candidates | PASS |

Browser multi-tab harness: not required for this pass; multi-user is proven via real membership + Messages + dual ProductSignals viewers.

### EXTERNAL WORLD TRUTH

| Artifact | Role |
|----------|------|
| `docs/intelligence/EXTERNAL_WORLD_TRUTH_CONTRACT.md` | Human canon |
| `ExternalWorldTruth` | Executable boundaries |
| Existing `ProviderAuthority`, `ProviderBoundary`, `WorldFact`, `ProviderResultGate` | Anchors |

Laws: social_fit ≠ provider ≠ execution; LLM ≠ provider; booking needs authorization; failure preserves social dims.

Collective options on ProductSignals carry `truth_class=social_fit`, `provider_status=unknown`, synthetic fixture provenance.

### COORDINATION RESIDUE (synthetic)

Without composition: humans re-ask downtown, sushi, Sam late, party size, vibe.  
With composition: constraints attributed; Curate surfaces ranked social_fit options; one-question/abstain available when fit fails.

---

## Pass 6 — Multi-client collective continuity (proof only)

Script: `scripts/live_multi_client_collective_proof.mjs`  
Evidence: `docs/intelligence/evidence/LIVE_COLLECTIVE_PRODUCT_PROOF.md`  
JSON: `docs/evidence/v2-coded-experience/live-closure/multi-client-collective/LIVE_MULTI_CLIENT_PROOF.json`

| Check | Result |
|-------|--------|
| 6 sessions activated | PASS |
| Group create 5 + Sam → 6 | PASS |
| Correct-human attribution | PASS |
| Delivery matrix all peers | PASS |
| collective_fit all members | PASS |
| Private memory leak scan | PASS |
| Hard constraints | PASS |
| External truth on options | PASS |
| Non-member 403 | PASS |
| Sam recompose / WHEN | PASS |
| authorizes_set false | PASS |
| Explicit share to peer | PASS |
| Browser 2-context ~12s probe | PASS (optional PROOF_BROWSER=1) |
| Jordan dyad | re-run required this pass |

No intelligence semantics changed — organism reliability proof.

---

## Pass 7 — Sustained six-client realtime soak

| | |
|--|--|
| Purpose | Prove Pass 6 organism **lives** under sustained browser realtime, interruption, and private UI isolation |
| Intelligence delta | **NONE** |
| Duration | **20.05 min** (requested 20; not 30) |
| Episode | `soak7-mss7meq2` |
| Script | `scripts/six_client_realtime_soak.mjs` |
| Evidence | `docs/intelligence/evidence/SIX_CLIENT_REALTIME_SOAK.md` + `.json` |
| Result | **34/34 PASS** · product 0 · env 0 |
| Matrix | 6×6 pure realtime PASS (no reload counted) |
| Sockets | HEALTHY ×6 · connectCount=1 · reconnectScheduleCount=0 |
| Recovery | bg/fg · network · logout/login · Sam late rejoin all PASS |
| Private UI | Curate isolation PASS; peer curate_seen=false |
| Jordan | **18/18** after soak |
| Repair | Clear sticky loadError on openChat; expose joinedChannels diagnostics; harness hard-rejoin late members |

Pre-repair 20m (`soak7-mss6gwti`): 31 PASS / 1 PRODUCT (Sam late-join matrix only). Post-repair full 20m: clean.

**Foundation stance:** core social intelligence + realtime collective continuity treated as foundation-closed subject to founder visual judgment. Brand still BLOCKED; V2 merge HOLD; providers still outside external-truth boundary.

---

## Brand / merge

- Brand 93:* **BLOCKED** — untouched  
- V2 merge **HOLD**
