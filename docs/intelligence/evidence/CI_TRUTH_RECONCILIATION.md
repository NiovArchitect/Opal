# CI TRUTH RECONCILIATION

**Date:** 2026-08-15  
**Branch:** `build/v2-coded-experience-closure`  
**Closure SHA:** `f6a4c49`  
**Remote verdict:** **GREEN** (classify + governance + production)

---

## EXECUTIVE STATE

GitHub Intelligence Gate failed repeatedly while local `./scripts/intelligence_check.sh` often printed **PASS**.

Two **systemic** root causes (not random noise):

| # | Root cause | Why local green | Why remote red |
|---|------------|-----------------|----------------|
| 1 | Constitution paths for `INV-CALENDAR-MINIMAL-REVEAL` pointed at `availability_composition.ex` + `*_test.exs` that existed **only as untracked local files** | Dirty worktree satisfied `exists()` | Clean `actions/checkout` lacked files → validate FAIL |
| 2 | Production job ran `mix` under `MIX_ENV=test` **without Postgres service** | Dev workstation already had Postgres | `Postgrex … connection refused` after RC1 fixed |

This is the gate working: **the repository alone could not reproduce the claimed intelligence state until both were fixed.**

**Do not** treat `LOCAL PASS` as merge readiness when GitHub Actions is available. Require **REMOTE PASS** on the same SHA.

---

## CURRENT / REMOTE BASELINE

| Field | Value |
|-------|--------|
| Local HEAD | `f6a4c49cede7bd093cbf8775a9029c449cd13591` |
| `origin/build/v2-coded-experience-closure` | same |
| Founder baseline before repair | `56cd92a` (and chain through Pass 20–30) |

---

## FAILURE HISTORY (same dual signature across pass chain)

Historical failing SHAs (Intelligence Gate emails):  
`530a74a`, `eb23dfa`, `f4dda8e`, `86518e8`, `960de7a`, `166e0ad`, `7b93453`, `de08689`, `56cd92a`, then `0fe25e8` (Pass 30).

| SHA | Run (example) | Classify | Governance | Production | First failing command | Error signature | Same root? |
|-----|---------------|----------|------------|------------|----------------------|-----------------|------------|
| 56cd92a | 31913958788 | PASS | FAIL | FAIL | `./scripts/intelligence_check.sh` | INV-CALENDAR-MINIMAL-REVEAL path missing `availability_composition_test.exs` | RC1 |
| de08689 | 31885088343 | PASS | FAIL | FAIL | same | same | RC1 |
| 0fe25e8 | 31914448347 | PASS | FAIL | FAIL | same | same | RC1 |
| 0b2e5bd | 31914771964 | PASS | **PASS** | FAIL | mix / app boot under test | `Postgrex … tcp connect (localhost:5432): connection refused` | RC2 (after RC1 fixed) |
| f6a4c49 push | 31914883273 | PASS | **PASS** | **skipped** | — | Classifier: governance-only paths (workflow/docs) | n/a |
| f6a4c49 dispatch `with_tests` | **31914949146** | PASS | **PASS** | **PASS** | — | Full gate green | closed |

**First commit affected (RC1):** constitution/manifest referenced composition files while they remained untracked — present for the entire Pass 20–30 push chain above.  
**RC2 first visible:** first production job that got past validate (`0b2e5bd`).

---

## WHY LOCAL PASSED

| Factor | Effect |
|--------|--------|
| Untracked `availability_composition.ex` + test on disk | validate `exists()` succeeded |
| Dirty worktree (brand, pass9, availability UI, etc.) | Agent environment not = remote tree |
| Local Postgres running | `MIX_ENV=test` Repo connect succeeded |
| Agents often ran governance-only or subset | Production path not always exercised |

## WHY REMOTE FAILED

| Factor | Effect |
|--------|--------|
| Clean `actions/checkout` | RC1 files absent |
| Manifest still required those paths | 3 hard FAILURES on INV-CALENDAR-MINIMAL-REVEAL |
| `with_tests` job had no `services.postgres` | RC2 connection refused |
| Path filter correctly ran gate on intelligence-touching commits | Failures were real, not flaky noise |

**Not the cause:** case-sensitivity mismatch, Node/Elixir version drift, absolute `/Users/...` paths in CI-critical tests, path-filter over-broadening as primary fail, secrets missing.

Non-failing warnings (still present, do not fail gate): ledger IDs `INT-ATTR-*`, `INT-ECON-001`, `INT-EXP-001`, `INT-SOCIAL-001` not in `manifest.capabilities` array.

---

## CI ENVIRONMENT (from `.github/workflows/intelligence.yml`)

| Item | Value |
|------|--------|
| OS | `ubuntu-latest` (observed: Ubuntu 24.04) |
| Working dir | repo root; mix in `apps/opal_core` |
| Node | runner default (preflight/validate) |
| Elixir | 1.17 |
| OTP | 27 |
| Postgres | **after fix:** `postgres:16-alpine`, user/pass `postgres`, DB `opal_core_test`, port 5432, healthcheck |
| Env | `MIX_ENV=test` on production job |
| Install | `mix deps.get`, `mix ecto.create --quiet \|\| true` |
| Cache | Elixir deps/`_build` key `intel-elixir-…` |
| Commands | governance: `./scripts/intelligence_check.sh` + `node scripts/intelligence_negative_prove.mjs`; production: `./scripts/intelligence_check.sh --with-tests` |
| Forced profile | `workflow_dispatch` inputs: `auto` \| `governance` \| `with_tests` \| `full` |

---

## CLEAN CHECKOUT PROOF

### Before repair (dirty vs clean)

```text
DIRTY (untracked availability_composition*): intelligence_validate → PASS
CLEAN clone of origin (pre-0b2e5bd):        intelligence_validate → FAIL
  INV-CALENDAR-MINIMAL-REVEAL … availability_composition_test.exs missing
```

### After repair (clean worktree at `f6a4c49`)

```text
git worktree add /tmp/opal-ci-repro-final origin/build/v2-coded-experience-closure
# HEAD f6a4c49
node scripts/intelligence_validate.mjs  → RESULT: PASS (5 ledger warnings only)
./scripts/intelligence_check.sh         → LOCAL PASS + note requiring remote GREEN
ls …/availability_composition.ex        → present (committed)
ls …/availability_composition_test.exs  → present (committed)
```

---

## AUDIT RESULTS (reconciliation checklist)

| Audit | Result |
|-------|--------|
| Case-sensitivity | No RC for this chain; paths are snake_case and committed as referenced |
| Version drift | Not root cause; Elixir/OTP pinned in workflow |
| Env vars | No secret required for governance/with_tests gate |
| Database | **RC2** — production needs Postgres + ecto.create; now in workflow |
| Manifest / canon | Constitution paths correct; files must be **in git**, not only on disk |
| Fixture paths | No absolute `/Users/genghishameha/...` in CI-critical intelligence scripts for this fail |
| Test order | Not implicated; fail was validate-path then connect refused |
| Negative prove | Restores files; remote: `RESULT: PASS (all violations fail closed + restored)` |
| Path filter | Correct: visual-only would not need production; intelligence paths correctly triggered red validate. Do **not** weaken filters to hide failures |

---

## REPAIRS (no gate weakening)

### RC1 — missing constitution files

**Commit `0b2e5bd`:** commit constitution-referenced modules:

- `apps/opal_core/lib/opal_core/social_flow/availability_composition.ex`
- `apps/opal_core/test/opal_core/social_flow/availability_composition_test.exs`
- `scripts/intelligence_check.sh` → print **LOCAL PASS** + remote-CI note
- this evidence file (initial)

Result: Governance job GREEN on clean tree.

### RC2 — production job missing Postgres

**Commit `f6a4c49`:** update `.github/workflows/intelligence.yml` `with_tests` job:

- `services.postgres` (`postgres:16-alpine`)
- `mix ecto.create` under `MIX_ENV=test`
- `MIX_ENV=test` on intelligence `--with-tests` step

**Forbidden fixes not used:** `continue-on-error`, `|| true` on gate, removing tests/invariants, skipping governance, dishonest path narrowing, optional jobs.

Unrelated dirty availability UI / brand / pass9 assets remained **unstaged**.

---

## REMOTE PROOF (authoritative)

| Event | Run ID | SHA | Classify | Governance | Production | Conclusion |
|-------|--------|-----|----------|------------|------------|------------|
| push (workflow + docs) | 31914883273 | f6a4c49 | GREEN | GREEN | skipped (profile governance) | success |
| workflow_dispatch `profile=with_tests` | **31914949146** | f6a4c49 | GREEN | GREEN | **GREEN** | **success** |

Production URL:  
https://github.com/NiovArchitect/Opal/actions/runs/31914949146

---

## LOCAL = REMOTE LAW

| Label | Meaning |
|-------|---------|
| **LOCAL PASS** | Preflight + validate (+ tests if requested) on the machine that ran the script |
| **REMOTE PASS** | GitHub Actions **Intelligence Gate** green on that SHA for the required profile |
| Merge readiness | Requires **REMOTE PASS** when Actions is available — never LOCAL alone |

Agent preflight must **not** say “intelligence protected / merge-ready” from LOCAL PASS while remote is red or unrun.

`scripts/intelligence_check.sh` now prints:

```text
LOCAL PASS
NOTE: LOCAL PASS is not remote CI. When GitHub Actions is available,
      require Intelligence Gate GREEN on this SHA before merge readiness.
```

---

## VERSIONS (CI)

| OS | ubuntu-latest |
| Elixir | 1.17 |
| OTP | 27 |
| Postgres | 16-alpine (with_tests) |
| Node | runner default |

Local may differ; this failure was **not** version drift.

---

## V2 MERGE VERDICT

**HOLD. DO NOT MERGE.**

CI truth reconciled. Product Pass 30 work remains under V2 HOLD. Intelligence protection workflow is **no longer systemically red** on every push.

---

## FORBIDDEN FIXES (not used)

- continue-on-error  
- removing invariant  
- path filter dishonest narrowing  
- optional jobs  
- shrinking tests to force green  
- treating LOCAL PASS as REMOTE PASS  
