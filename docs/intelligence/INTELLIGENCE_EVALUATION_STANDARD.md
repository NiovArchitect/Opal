# Intelligence Evaluation Standard

**Status:** ACTIVE  

## Outcome labels (per episode / invariant)

| Label | Meaning |
|-------|---------|
| **IMPROVED** | Stronger correctness, privacy, or human usefulness without breaking prior laws |
| **UNCHANGED** | Same outcomes as baseline |
| **REGRESSED** | Prior green behavior weaker, wrong, or missing |

Any REGRESSED blocks merge of that intelligence change unless intentional SUPERSEDE with founder-facing rationale.

## Failure classes (proof harness)

| Class | Meaning |
|-------|---------|
| **PRODUCT_FAIL** | Running product violated a product law under correct fixture |
| **FIXTURE_FAIL** | Starting episode was not the required reality; fix fixture |
| **ENVIRONMENT_FAIL** | API/rate-limit/browser/env |
| **PASS** | Product and fixture OK |

Never “fix” SocialReality to turn FIXTURE_FAIL into PASS.

## Suites

| Suite | Command / path | Role |
|-------|----------------|------|
| Invariants | `mix test test/intelligence/` | Machine law |
| Social reality matrix | `mix test test/opal_core/social_flow/social_reality*` | Order-agnostic gaps |
| Availability composition | `mix test test/opal_core/social_flow/availability_composition_test.exs` | Calendar privacy |
| Web presentation | `cd apps/opal_web && npm test -- --run src/opalUi/` | Compose/grammar/journey |
| Founder live | `node scripts/live_jordan_foundation_proof.mjs --repeat 3` | Deterministic UI proof |

## Golden episode scoring

For each episode report:

```text
EPISODE: EP-00N
EXPECTED_NEXT_GAP: ...
ACTUAL_NEXT_GAP: ...
EXPECTED_PRESERVED: ...
ACTUAL_PRESERVED: ...
FORBIDDEN_ACTIONS_TRIGGERED: yes|no
RESULT: IMPROVED|UNCHANGED|REGRESSED
```

## Baseline SHA

Record `LAST_PROVEN_SHA` on capability ledger entries when evaluation passes.
