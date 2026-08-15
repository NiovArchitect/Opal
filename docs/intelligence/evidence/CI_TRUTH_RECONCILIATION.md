# CI TRUTH RECONCILIATION

**Date:** 2026-08-15  
**Branch:** `build/v2-coded-experience-closure`  
**Verdict after repair:** see push / Actions

---

## EXECUTIVE STATE

GitHub Intelligence Gate failed repeatedly while local `./scripts/intelligence_check.sh` often printed **PASS**.

**Root cause (single systemic signature across the pass chain):**

The intelligence **manifest constitution** requires:

- `apps/opal_core/lib/opal_core/social_flow/availability_composition.ex`
- `apps/opal_core/test/opal_core/social_flow/availability_composition_test.exs`

for invariant **INV-CALENDAR-MINIMAL-REVEAL**.

Those files existed **only as untracked local work** in the agent worktree.  
Local validate **passed** because the files were on disk.  
Clean CI checkout **failed** because they were never committed.

This is exactly the gate doing its job: **the repository alone could not reproduce the claimed intelligence state.**

---

## FAILURE HISTORY (same root cause)

| SHA | Governance | Production | Signature |
|-----|------------|------------|-----------|
| 530a74a … 0fe25e8 | FAIL | FAIL | INV-CALENDAR-MINIMAL-REVEAL path missing `availability_composition_test.exs` |

Latest run example: **31914448347** (head `0fe25e8`)

- Classify: **success**
- Governance: **failure** at `./scripts/intelligence_check.sh` → validate FAIL
- Production: **failure** same validate step before mix tests

---

## WHY LOCAL PASSED

| Factor | Effect |
|--------|--------|
| Untracked `availability_composition.ex` + test on disk | `exists()` checks in `intelligence_validate.mjs` succeed |
| Dirty worktree | Agent local gate green |
| Local Elixir suite runs those files | Tests green when present |

## WHY REMOTE FAILED

| Factor | Effect |
|--------|--------|
| Clean `actions/checkout` | Files absent |
| Manifest still points at them | 3 hard FAILUREs |
| Domain owner path warning | AvailabilityComposition missing |

Warnings only (not exit-failing alone): ledger IDs INT-ATTR-*, INT-ECON-001, INT-EXP-001, INT-SOCIAL-001 not in `manifest.capabilities` array.

---

## CLEAN CHECKOUT PROOF (before repair)

```text
git clone origin/build/v2-coded-experience-closure → /tmp/opal-ci-repro
node scripts/intelligence_validate.mjs
RESULT: FAIL
  INV-CALENDAR-MINIMAL-REVEAL executable path missing: …/availability_composition_test.exs
```

## DIRTY CHECKOUT (before repair)

```text
worktree with untracked availability_composition*
node scripts/intelligence_validate.mjs
RESULT: PASS
```

---

## REPAIR

**Commit** the constitution-referenced modules:

- `availability_composition.ex`
- `availability_composition_test.exs` (16 tests)

Do **not** disable the gate.  
Do **not** retarget the invariant away from real coverage.  
Do **not** stage unrelated brand/pass9 noise.

Availability.ex dirty UI diffs remain unstaged (not required for composition tests).

---

## LOCAL = REMOTE LAW

| LOCAL PASS | filesystem + committed tree |
| REMOTE PASS | GitHub Actions Intelligence Gate green on SHA |
| Agents must not claim merge readiness from LOCAL alone when remote CI is available |

---

## VERSIONS (CI)

| OS | ubuntu-latest |
| Elixir | 1.17 |
| OTP | 27 |
| Node | runner default (preflight/validate only need node) |

Local may differ; this failure was **not** version drift.

---

## FORBIDDEN FIXES (not used)

- continue-on-error
- removing invariant
- path filter dishonest narrowing
- optional jobs
