# Intelligence Constitution Establishment Evidence

**Date:** 2026-08-13  
**Branch:** `build/v2-coded-experience-closure`  
**Mode:** Governance establishment (not product feature work)  
**V2 merge:** **HOLD** — this report does not authorize merge  

---

## Purpose

Establish durable, GitHub-canon intelligence architecture so future agents **compound** capability instead of replacing it:

| Artifact | Path |
|----------|------|
| Constitution | `docs/intelligence/OPAL_INTELLIGENCE_CONSTITUTION.md` |
| Capability ledger | `docs/intelligence/INTELLIGENCE_CAPABILITY_LEDGER.md` |
| Change protocol | `docs/intelligence/INTELLIGENCE_CHANGE_PROTOCOL.md` |
| Evaluation standard | `docs/intelligence/INTELLIGENCE_EVALUATION_STANDARD.md` |
| ADRs | `docs/intelligence/decisions/ADR-INT-001` … `006` |
| Golden episodes | `docs/intelligence/golden-episodes/EP-001` … `008` |
| Machine manifest | `config/intelligence_manifest.json` |
| Executable invariants | `apps/opal_core/test/intelligence/invariants_test.exs` |

---

## Method

**Audit-first, not reconstruct-from-prose.**

Classified intelligence already encoded in:

| Source | Intelligence discovered |
|--------|-------------------------|
| `SocialReality` | next_gap, partial preservation, share_kind asserts, leave-around travel truth |
| `SharedRealityPresentation` | message → reality projection |
| `PlaceGap` | order-agnostic place after time |
| `AvailabilityComposition` | daypart, dyad fit, minimal reveal |
| `GroupComposition` | participation composition |
| `composeHumanReality` / `grammar` | one fact once, gap CTAs |
| `founder_proof_fixture.mjs` / `live_jordan_foundation_proof.mjs` | episode isolation, PRODUCT vs FIXTURE fail |
| `social_reality_test` / matrix | journey permutations |
| V2 evidence under `docs/evidence/v2-coded-experience/` | journey closure, SF15 freeze, calendar privacy |
| SF15 foundation freeze | transport not reimplemented |

---

## Baseline intelligence protected (not rebuilt)

| Capability | Meaning |
|------------|---------|
| INT-JOURNEY-001 | Time → place next_gap |
| INT-JOURNEY-002 | Place → time progression |
| INT-JOURNEY-003 | Remote / no place |
| INT-JOURNEY-004 | Fixed event |
| INT-REALITY-001 | Partial dimension preservation |
| INT-AUTHOR-001 | Private selection ≠ sending |
| INT-PRESENT-001/003 | One fact once / single primary CTA |
| INT-PROOF-001/002 | Deterministic founder episode isolation + fail classification |
| INT-SF15-001 | Synthetic transport foundation (FROZEN) |
| INT-BRAND-* | BLOCKED — 93:5/7/9 EMPTY |

### Live proof baseline (pre-existing; harness not modified)

- Script: `scripts/live_jordan_foundation_proof.mjs --repeat 3`
- Fixture: `scripts/founder_proof_fixture.mjs`
- Precondition: WHO = Founder+Jordan, WHAT = Dinner, WHEN = Thursday · 6:30, WHERE open, next_gap = place
- Verified behavior (session history): 3 independent episodes, 18/18 each, 0 PRODUCT_FAIL / FIXTURE_FAIL / ENVIRONMENT_FAIL under clean namespaced fixtures

### Visual journey baseline (pre-existing; not re-litigated here)

- Home temporal dedupe, single primary Choose a place CTA  
- Curate secondary, filament collapse, same SR lineage after place share  
- Private place selection ≠ send; place share is place-specific  
- time→place and place→time generalized  

---

## Explicit non-goals for this establishment

| Non-goal | Reason |
|----------|--------|
| Brand pixel repair | 93:* EMPTY / BLOCKED workstream |
| Proof harness rewrite | INT-PROOF-* law |
| SocialReality rewrite to satisfy fixtures | PRODUCT vs FIXTURE distinction |
| V2 merge | Founder visual + brand gates remain open |
| SF15 reimplementation | Historical freeze |
| New intelligence features | Constitution only |

---

## Evaluation runs (this establishment)

Commands run 2026-08-13 from establishment context:

```bash
cd apps/opal_core && mix test test/intelligence/ \
  test/opal_core/social_flow/social_reality_test.exs \
  test/opal_core/social_flow/social_reality_scenario_matrix_test.exs \
  test/opal_core/social_flow/availability_composition_test.exs
# → 54 tests, 0 failures

cd apps/opal_web && npm test -- --run src/opalUi/
# → 5 files, 45 tests, 0 failures
#   composeHumanReality, grammar, socialReality, liveJourneyProof, founderFixture
```

| Suite | Result |
|-------|--------|
| `test/intelligence/` + social_reality* + availability_composition | **54 pass / 0 fail** |
| `apps/opal_web` `src/opalUi/` | **45 pass / 0 fail** |
| Live Jordan harness rewrite | **Not run / not modified** (INT-PROOF law) |

Ledger LAST PROVEN for INT-REALITY-*, INT-JOURNEY-*, INT-TIME-001, INT-PRESENT-*, INT-PROOF fixture unit tests remains consistent with these unit/matrix greens.

---

## Golden episode inventory (initial)

| Episode | Focus | Coverage today |
|---------|-------|----------------|
| EP-001 | Easy friend coffee | scenario / journey law |
| EP-002 | Busy dinner time→place | live Jordan + SocialReality |
| EP-003 | Place then time | matrix + invariants |
| EP-004 | Remote FaceTime | SocialReality remote? |
| EP-005 | Fixed concert | fixed_event? |
| EP-006 | Group recompose | GroupComposition |
| EP-007 | Time reversal preserves place | apply_dimension_update |
| EP-008 | Private selection not send | ADR + live side-effect |

Messy episodes (sarcasm, “whatever works”, late joiner, booking fail, etc.) remain **to expand** — catalog listed in Constitution / ledger; not all executable yet.

---

## Additive change protocol now in force

Every future intelligence change must answer:

1. Capability ID added/extended  
2. Dependencies  
3. Affected capabilities  
4. Invariants that must remain true  
5. Golden episodes to replay  
6. New episode if any  
7. Regression evidence  

**No answer = do not implement.**

Primary law: **New intelligence must compose with the existing intelligence graph. No agent may “simplify” existing intelligence merely to ship new intelligence.**

---

## Merge law reminder

Even when this documentation commits cleanly:

> **DO NOT MERGE V2.**

Governance documentation is not product closure.

---

## Agent handoff block

```text
INTELLIGENCE CONTEXT LOADED
CONSTITUTION: docs/intelligence/OPAL_INTELLIGENCE_CONSTITUTION.md v1.0.0
MANIFEST: config/intelligence_manifest.json
LEDGER: docs/intelligence/INTELLIGENCE_CAPABILITY_LEDGER.md
INVARIANTS: apps/opal_core/test/intelligence/invariants_test.exs
HARNESS: scripts/founder_proof_fixture.mjs + live_jordan_foundation_proof.mjs (DO NOT REWRITE)
BRAND: 93:* BLOCKED
V2 MERGE: HOLD
```
