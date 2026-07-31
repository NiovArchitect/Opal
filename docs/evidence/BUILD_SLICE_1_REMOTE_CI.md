# Build Slice 1 — Remote CI Evidence

**Branch:** `build/slice-1-core-ai-contracts`  
**Final green SHA:** `4b37fa8`  
**Date:** 2026-07-31  

## Initial failure (pre-fix)

| Run | Result | Notes |
|-----|--------|-------|
| 30614374457 / 30614367818 | Python **fail**; Elixir/Docker **pass** | Ruff F401 unused import; B017 blind `Exception` assert |

### Root causes

1. `services/opal_ai/opal_ai/contracts.py` imported unused `ValidationError`.
2. `tests/test_worker.py` used `pytest.raises(Exception)` (ruff B017).
3. Secret scan used `rg` (may be missing); switched to `grep`.

### Corrections

- Remove unused import; assert `ValidationError`.
- Fix mypy `no-any-return` on `load_schema`.
- Harden secret-scan step in CI.

## Final green runs

| Trigger | Run ID | Result | Duration |
|---------|--------|--------|----------|
| push | **30628916853** | **success** | 2m24s |
| pull_request | **30628920474** | **success** | 2m28s |

### Jobs (run 30628916853 / push)

| Job | Status | Duration |
|-----|--------|----------|
| Contracts + Python | pass | ~22s |
| Elixir core | pass | ~2m14s |
| Docker build | pass | ~1m25s |

### Jobs (run 30628920474 / PR)

| Job | Status | Duration |
|-----|--------|----------|
| Contracts + Python | pass | ~29s |
| Elixir core | pass | ~2m17s |
| Docker build | pass | ~1m13s |

## Workflow

- Name: `CI` (`.github/workflows/ci.yml`)
- Covers: ruff format/lint, mypy, pytest, mix format/compile/credo/test, docker builds, basic secret scan

## Gate 10 status

**PASS** — remote GitHub Actions fully green on the Slice 1 branch after fixes.
