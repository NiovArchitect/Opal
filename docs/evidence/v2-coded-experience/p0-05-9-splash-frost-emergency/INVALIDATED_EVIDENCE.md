# INVALIDATED EVIDENCE — Splash frost-only founder failure

**Status:** `SUPERSEDED_BY_REAL_FOUNDER_FAILURE` / `INVALID_FOUNDER_RUNTIME_PROOF`

## Revoked claims

| Claim | Source | Status |
|-------|--------|--------|
| P0-05.8 Splash GREEN | geometry harness only | **REVOKED** |
| P0-05.8A FOUNDER_WALK_READY = YES | PRE_FOUNDER_GO_NO_GO.md | **REVOKED** |

## Why

Founder personally opened `/?opal_reset_first_run=1&opal_founder_seed=1` and saw frost/brand colors only — primary Splash content not usable.

Lesson (Promise saga): **container geometry ≠ founder-visible primary content.**

## Root cause (P0-05.9)

`LEGACY_PARENT_SHELL` + `STALE_PROCESS`

- Splash nested under premember walkthrough + `.app-ambient` + technicolor full + Motion initial opacity 0 + `.fr-void`
- Vite process had been running since 12:46 (hours of HMR drift)

## Repair

Top-level `FirstRunSplashPage` (same pattern as Promise). Fresh Vite restart. Founder route proof screenshots show primary content.

Do not treat prior Splash GREEN geometry-only reports as current proof.
