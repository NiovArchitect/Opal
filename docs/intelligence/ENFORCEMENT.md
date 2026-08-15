# Intelligence Constitution Enforcement

**Status:** ACTIVE  
**Established:** 2026-08-13 (post `fbaabed`)  
**Purpose:** Make the constitution operationally unavoidable. Not a second philosophy layer.

---

## Single entrypoint

```bash
./scripts/intelligence_check.sh                         # FAST
./scripts/intelligence_check.sh --impact                # IMPACT
./scripts/intelligence_check.sh --impact --with-tests   # INTELLIGENCE CHANGE
./scripts/intelligence_check.sh --full                  # FULL
# LIVE: optional/manual only — not CI
```

Related:

| Command | Role |
|---------|------|
| `node scripts/intelligence_preflight.mjs` | Discovery: version, counts, suites |
| `node scripts/intelligence_validate.mjs` | Integrity: dangling IDs, version, coverage |
| `node scripts/intelligence_impact.mjs` | Impact: files/capabilities → risk set |
| `node scripts/intelligence_ci_classify.mjs` | CI profile classification |
| `node scripts/intelligence_negative_prove.mjs` | Fail-closed proof A–E |
| `.github/workflows/intelligence.yml` | Path-filtered GitHub gate |

---

## Required agent preflight

Before any intelligence code change, emit:

```text
INTELLIGENCE CONTEXT LOADED
CONSTITUTION VERSION
CAPABILITIES TOUCHED
DEPENDENCIES
INVARIANTS AT RISK
GOLDEN EPISODES TO REPLAY
AUTHORITY BOUNDARIES
PRIVACY BOUNDARIES
EXPECTED INTELLIGENCE DELTA
```

Pre-implementation (before edits):

```text
INTELLIGENCE CONTEXT LOADED
TARGET CAPABILITY
CURRENT BEHAVIOR
PROPOSED DELTA
DEPENDENCIES
INVARIANTS TO PRESERVE
EPISODES TO REPLAY
EXPECTED NON-CHANGES
```

Post-implementation:

```text
INTELLIGENCE DIFF
Capabilities added / modified / unchanged
Invariants pass/fail
Golden episodes improved|unchanged|regressed
Privacy / authority / coordination residue impact
Known unknowns
```

**Absent preflight → change not authorized.**

Use [INTELLIGENCE_CHANGE_TEMPLATE.md](./INTELLIGENCE_CHANGE_TEMPLATE.md).

---

## LOCAL PASS vs REMOTE PASS (mandatory)

`./scripts/intelligence_check.sh` prints **LOCAL PASS** only. That is **not** merge-readiness evidence.

| Claim | Allowed only when |
|-------|-------------------|
| LOCAL PASS | Script succeeded on the machine that ran it (may include uncommitted files) |
| REMOTE PASS | GitHub Actions workflow **Intelligence Gate** is green on **that same SHA** for the required profile (governance and/or production) |
| Intelligence protected / merge-ready | **REMOTE PASS** when Actions is available — never LOCAL alone |

Rules for agents:

1. Never report `intelligence_check: PASS` as merge readiness without checking remote CI for the current SHA when GitHub is available.
2. Distinguish explicitly: **LOCAL PASS** vs **REMOTE PASS**.
3. Clean-checkout or remote green is required before claiming the repo alone reproduces intelligence state.
4. Untracked constitution paths can make LOCAL green while remote red — see [evidence/CI_TRUTH_RECONCILIATION.md](./evidence/CI_TRUTH_RECONCILIATION.md).

---

## Change detection (when to run intelligence checks)

### Triggers intelligence profile

Paths listed in `config/intelligence_enforcement.json` → `file_triggers`, including:

- `SocialReality`, `SharedRealityPresentation`, `PlaceGap`
- `AvailabilityComposition`, availability modules
- `GroupComposition`, alignment*, chronology*, product signals, memory*
- `apps/opal_core/test/intelligence/**`
- `social_reality*` tests
- `apps/opal_web/src/opalUi/**`, `sharedReality.ts`, gap grammar, `OpalApp.tsx` place/extend paths
- `scripts/founder_proof_fixture.mjs`, `live_jordan_foundation_proof.mjs`
- `config/intelligence_*.json`, `docs/intelligence/**`

### Does **not** trigger full intelligence eval

- Brand rasters / Figma export images  
- Random CSS-only chrome  
- Unrelated docs under non-intelligence paths  
- Public static images  

Governance-only doc/manifest edits → **governance** profile (validate only).  
Domain/UI intelligence edits → **intelligence_lightweight** or **intelligence_full**.

---

## CI scope plan (do not make CI brittle)

Wired: **`.github/workflows/intelligence.yml`**

| Change class | Required |
|--------------|----------|
| Unrelated product (no trigger paths) | Workflow does not run (path filter) |
| Governance-only (`docs/intelligence/**`, `config/intelligence_*`, `scripts/intelligence_*`) | `./scripts/intelligence_check.sh` + negative prove |
| Core domain / presentation intelligence paths | `./scripts/intelligence_check.sh --with-tests` |
| Availability / calendar composition | profile `full` → `--full` (+ web opalUi) |
| Proof harness scripts | `--with-tests`; live Jordan **never** mandatory CI |
| Brand assets / pure CSS / images | **No** intelligence suite |

Classifier: `scripts/intelligence_ci_classify.mjs` (uses enforcement file_triggers where practical).

Never require full social evaluation for every CSS or image PR.

---

## Supersession check

A capability, invariant, or golden episode must not disappear silently.

To retire/replace:

1. Add entry to `config/intelligence_enforcement.json` → `supersessions[]` with `from`, `to`/`replacement`, `reason`, `evidence`, `adr`
2. ADR-INT under `docs/intelligence/decisions/`
3. Update ledger status SUPERSEDED
4. Keep episode/test history referenced from evidence

`intelligence_validate.mjs` requires complete supersession records when present.

---

## Test / episode removal guard

Deleting or disabling:

- `apps/opal_core/test/intelligence/**`
- registered golden episode MD
- invariant coverage paths
- protected paths in enforcement config

requires explicit SUPERSEDE explanation in the change template.  
“Test no longer relevant” without reason → reject.

Validate ensures registered episodes/invariants/protected paths still exist.

---

## Golden episode execution bridge

Docs live in `docs/intelligence/golden-episodes/`.  
Executable mapping: `config/intelligence_enforcement.json` → `episode_eval_bridge`  
Runner: `apps/opal_core/test/intelligence/golden_episode_bridge_test.exs`

Prefer existing domain APIs + harness references. No second evaluation platform.

---

## Constitution version lock

`manifest.constitution.version` **must** equal `**Version:**` in  
`docs/intelligence/OPAL_INTELLIGENCE_CONSTITUTION.md`.

Update both in the same change or validation fails.

---

## Frozen during enforcement (product)

Do not use enforcement work to modify:

- SocialReality / AvailabilityComposition **semantics**
- founder proof harness architecture  
- brand 93:*  
- V2 layouts  
- SF15 historical foundation  

Enforcement is discoverability + regression wiring only.

---

## Merge law

Enforcement commits are **not** V2 product merge.  
`v2_merge: HOLD` remains until founder visual + brand gates close.

---

## Model neutrality

Canon is repository files + scripts. Not Grok/Claude/GPT-specific prompts.  
Any coding agent loads the same preflight.
