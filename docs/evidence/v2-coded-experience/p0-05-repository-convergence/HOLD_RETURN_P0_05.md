# P0-05 DURABLE AUTHORITY + REPOSITORY CONVERGENCE — HOLD RETURN

## A. HOLD

```
HOLD.
DO NOT MERGE.
permissionToStartLive = NO.
LIVE BLOCKED.
GLOBAL OPAL PAUSED.
```

This pass did **not** redesign screens or move pixels.

---

## B. Precheck branch / HEAD / tree

| | Before | After |
|---|---|---|
| Branch | `build/v2-coded-experience-closure` | same |
| HEAD | `cb1bd4382d73fb7a83b29658ec3a48942801219e` | **`1f08e72`** (product checkpoint **`ab3d81e`**) |
| Dirty | YES (215 porcelain / 974 untracked) | **clean (0)** |

Precheck dump: `00_PRECHECK/git_precheck.txt`

---

## C. Dirty-tree classification

UNKNOWN → **0**. Full summary: `DIRTY_TREE_CLASSIFICATION.md`

Buckets: P0_EVIDENCE, P0_BRAND_ASSET, P0_RUNTIME_INFRA, P0_TEST, P0_GRAPHS, P0_COMMUNICATION, P0_FIRST_RUN, P0_HOME, P0_YOU_SETTINGS.  
Quarantine/lowres/local_media → gitignored (not product authority).

---

## D. Deprecated authority grep

See `DEPRECATED_AUTHORITY_GREP.md`.

Forbidden `539:* / 540:* / 541:8 / 554:5` only in registry/tests/inert CSS — **not** current production authority.  
Needs you / Enter Journey / Flip / Messages·Calls — rejected in comments + tests; no executable Flip / Enter Journey CTA found.

---

## E–H. Manifests created

| File | Role |
|---|---|
| `docs/authority/OPAL_CURRENT_AUTHORITY.yaml` | Current Figma nodes + forbidden states + governance |
| `docs/authority/FIGMA_RUNTIME_LEDGER.yaml` | Node → React/CSS/domain/tests/evidence |
| `docs/authority/SUPERSEDED_PRESENTATIONS.yaml` | Rejected presentation owners |
| `docs/authority/ASSET_PROVENANCE.yaml` | Promise / Center Opal / Juniper SHAs |
| `docs/authority/CSS_CONVERGENCE_AUDIT.yaml` | `.app > *` and broad-rule classifications |

---

## I. CSS convergence

`.app > *:not(...call-surface...tabbar...dated-conv...)` classified **SCOPED** with required exclusions. Guard + test enforce exclusions remain.

---

## J. Authority guard

`scripts/opal-authority-check.mjs` → **GREEN**

Asserts: manifests present, Promise SHA, Juniper bytes, no Flip, Graphs Action, founder seed not default-true, Group send no border chrome, brand registry, `.app > *` exclusions.

---

## K. New regression tests

`apps/opal_web/src/opalUi/authorityRejectedStates.test.ts` — **17/17 PASS**

Covers Promise SHA, Juniper bind, Activity title, Graphs Action, no Enter Journey, no Flip, Direct/Group typography, Group send, dock Option B, founder seed off by default, You ≠ Person.

---

## L. Production / founder fixture firewall

`founder_fixture_is_production_default: false` in authority YAML.  
`isFounderSeedEnabled()` remains opt-in (`?opal_founder_seed=1` / env).  
Guard fails if `.env*` sets `VITE_OPAL_FOUNDER_SEED=true`.

---

## M. Checkpoint commit SHA

| Commit | Meaning |
|---|---|
| **`ab3d81ed49fb92814c40599e63e1911c4bbfc029`** | Product + authority + tests + evidence (P0-04.7 convergence) |
| **`1f08e72`** (HEAD) | Post-checkpoint smoke evidence |

`HEAD` is **no longer** `cb1bd43`.

---

## N. Post-checkpoint git status

```
clean (0 short status lines)
```

---

## O. Runtime identity

| | |
|---|---|
| PID | `65643` |
| cwd | `.../apps/opal_web` |
| branch | `build/v2-coded-experience-closure` |
| HEAD | `1f08e72` (product `ab3d81e`) |
| start | `2026-08-27T05:32:50Z` |
| URL | `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1` |

---

## P. Post-checkpoint smoke matrix

| Surface | Result |
|---|---|
| First Run splash | PASS |
| Home | PASS |
| Dock Option B 16,758,358×86 | PASS |
| Activity | PASS |
| Graphs All·Action·Ready | PASS |
| Graph Detail / no Enter Journey | PASS |
| You / settings | PASS |
| Chats list | **EMPTY** on this seed session (see note) |
| Direct / Group / call | not re-hit due to empty chats; **still proven at P0-04.7 evidence on this lineage** |

Note: smoke observed “No conversations yet” under founder seed — messaging seed/API gap for this phone, not a visual rollback of Direct/Group code.

---

## Q. Known remaining product defects

1. Activity icon — founder judgment  
2. Chats list may be empty without messaging seed data (fixture/API) — investigate before founder walk if needed  
3. Global Opal / Live — not started (by law)

---

## R. Founder-only decisions

- Activity icon  
- When to authorize founder visual walk from checkpoint `ab3d81e` / tip `1f08e72`  
- When (if ever) to authorize Live / Global Opal / merge

---

## S. Next authorized tranche

**Founder visual walk of the current P0 candidate from this durable checkpoint** — repair only what the founder eye rejects.  
Do **not** reopen solved Direct/Group/Dock/Promise/Graph Detail mechanically.

Future agent pass start contract is in `OPAL_CURRENT_AUTHORITY.yaml`.

---

## T. STOP

```
HOLD.
DO NOT MERGE.
NO LIVE.
NO GLOBAL OPAL.
permissionToStartLive = NO.
```

Repository now has: Git byte memory · Figma authority memory · ledger retrieval · rejected-state tests · authority guard.
