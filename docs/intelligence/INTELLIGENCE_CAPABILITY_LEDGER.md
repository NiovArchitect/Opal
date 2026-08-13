# Intelligence Capability Ledger

**Status:** ACTIVE  
**Last audit:** 2026-08-13  
**Note:** Documents intelligence **already encoded** in code/tests/evidence. Complements `docs/product/CAPABILITY_LEDGER.md` (merge verticals).

Legend status: **PROVEN** (tests/live) · **LAW** (canon docs) · **PARTIAL** · **FROZEN** · **BLOCKED**

---

## Core social reality

| ID | Name | Purpose | Domain owner | Inputs | Outputs | Authority | Privacy | Dependencies | Scenarios / tests | Invariants | Status |
|----|------|---------|--------------|--------|---------|-----------|---------|--------------|-------------------|------------|--------|
| INT-REALITY-001 | Partial dimension preservation | Changing one dimension keeps others true | `SocialReality` | dimension update | updated reality | does not auto-set | n/a | SocialReality, SharedRealityPresentation | `social_reality_test`, matrix | INV-PRESERVE-DIM | PROVEN |
| INT-REALITY-002 | One Shared Reality lineage | Same object evolves; no restart plan | SocialReality / ProductSignals | messages, stage | lineage projection | not Set store | shared | messaging | live Jordan, matrix | INV-ONE-LINEAGE | PROVEN |
| INT-JOURNEY-001 | Time→place next_gap | After WHEN known, place when WHERE matters | `SocialReality.next_meaningful_gap` | gaps, dims | `next_gap=place` | candidate CTA | n/a | INT-REALITY-* | EP-002, live proof, matrix | INV-NEXT-GAP-ONE | PROVEN |
| INT-JOURNEY-002 | Place→time progression | Order-agnostic inverse | same | gaps, dims | `next_gap=time` | candidate CTA | n/a | INT-REALITY-* | EP-003, matrix | INV-NEXT-GAP-ONE | PROVEN |
| INT-JOURNEY-003 | Remote / no place | FaceTime/call skip venue | SocialReality | what remote | no place gap | n/a | n/a | INT-REALITY-* | EP-004, matrix | INV-REMOTE-NO-PLACE | PROVEN |
| INT-JOURNEY-004 | Fixed event | Concert fixed time/place; no find-time | SocialReality | fixed_event | participants/none | n/a | n/a | INT-REALITY-* | EP-005, matrix | INV-FIXED-EVENT | PROVEN |

---

## Time & calendar

| ID | Name | Domain owner | Tests / evidence | Status |
|----|------|--------------|------------------|--------|
| INT-TIME-001 | Natural availability composition | `AvailabilityComposition` | `availability_composition_test` | PROVEN |
| INT-CALENDAR-001 | Private calendar availability | Availability + freebusy contracts | calendar privacy addendum, availability tests | PROVEN |
| INT-CALENDAR-002 | Access ≠ disclosure | AvailabilityComposition | privacy tests / laws | PROVEN / LAW |
| INT-TIME-002 | Open-ended social time | Availability windows | availability + SocialReality | PROVEN |

---

## Place

| ID | Name | Domain owner | Tests / evidence | Status |
|----|------|--------------|------------------|--------|
| INT-PLACE-001 | Place gap reasoning | `PlaceGap` + SocialReality | place_gap, social_reality | PROVEN |
| INT-PLACE-002 | Place share payload contract | client `buildPlaceShareDraft` + asserts | socialReality.test, live | PROVEN |
| INT-AUTHOR-001 | Private selection ≠ sending | OpalApp place sheet | live Jordan, side-effect audit | PROVEN |

---

## Group & participation

| ID | Name | Domain owner | Tests | Status |
|----|------|--------------|-------|--------|
| INT-GROUP-001 | Required/optional participation | GroupComposition / AlignmentAuthority | group_composition_test, matrix | PROVEN |
| INT-GROUP-002 | Recompose without restart | GroupComposition | group tests, scenario matrix | PROVEN |

---

## Presentation

| ID | Name | Domain owner | Tests | Status |
|----|------|--------------|-------|--------|
| INT-PRESENT-001 | One fact once / temporal compression | `composeHumanReality` | composeHumanReality.test | PROVEN |
| INT-PRESENT-002 | Four-surface truth agreement | presenceLines + SocialReality | assertRealityConsistency, live | PROVEN |
| INT-CHRON-001 | Semantic filament collapse | OpalApp interleave + isRedundantFilamentLabel | compose + live visual | PROVEN |
| INT-PRESENT-003 | Single primary next_gap CTA | gap grammar + OpalApp | grammar.test, live | PROVEN |

---

## Curate / Extend / Temporal / Social Moment

| ID | Name | Domain owner | Status |
|----|------|--------------|--------|
| INT-CURATE-001 | Gap-aware experience composition | Curate UI + SocialReality | LAW + PARTIAL code |
| INT-EXTEND-001 | Private continuation intelligence | Extend panel laws | LAW + PROVEN private-first tests |
| INT-TEMPORAL-001 | Temporal maturation one object | presentation laws | LAW |
| INT-MOMENT-001 | Social Moment media lineage | SocialMomentCard | PARTIAL |

---

## Transport / proof (do not reimplement)

| ID | Name | Owner | Status |
|----|------|-------|--------|
| INT-SF15-001 | Synthetic activation/session/invite/messages | SF15 closed | FROZEN |
| INT-PROOF-001 | Deterministic founder episode isolation | `founder_proof_fixture.mjs` | PROVEN |
| INT-PROOF-002 | Fixture-fail vs product-fail classification | live_jordan_foundation_proof.mjs | PROVEN |

---

## Brand (blocked)

| ID | Name | Status |
|----|------|--------|
| INT-BRAND-001 | Core orbital mark from Figma 93:5 | **BLOCKED** — pixels missing |
| INT-BRAND-002 | Wordmark 93:7 / lockup 93:9 | **BLOCKED** |

---

## LAST PROVEN (representative)

| Capability | Last proven |
|------------|-------------|
| INT-JOURNEY-001 + INT-PROOF-* | Live Jordan ×3 PASS 2026-08-13 |
| INT-PRESENT-001/003 | Unit + live visual P1 pass |
| INT-REALITY-001 | social_reality_test + matrix |

Update this table when evaluations pass; do not invent SHAs for unrun suites.
