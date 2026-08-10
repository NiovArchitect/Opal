# CI cost and gates

Concise rules for Opal monorepo CI. Product test bar is **not** reduced.

## Model

| Phase | What runs |
|-------|-----------|
| **Local (always first)** | `scripts/ci/local_gate.sh` for touched domains |
| **PR iteration** | Path-aware jobs only (one `pull_request` matrix; no feature-branch `push` twin) |
| **Ready to merge** | Full matrix: label PR **`full-ci`** (or multi-surface / workflow change auto-full) |
| **main push** | Full matrix once |
| **Manual** | `workflow_dispatch` force full |

## Path ownership

| Job | Paths |
|-----|--------|
| Elixir core | `apps/opal_core/**` |
| Contracts + Python | `services/opal_ai/**`, `contracts/**` |
| Public web | `apps/opal_web/**` |
| Mobile shell | `apps/opal_mobile/**` |
| Docker | Dockerfiles + runtime lock/deps when relevant; also with Elixir/Python on targeted runs |
| Docs lite | `docs/**`, `*.md` only — secrets scan, not monorepo |

Shared/workflow changes → **full**.

## Concurrency

Same PR/ref: `cancel-in-progress: true`. Stale commits stop burning minutes.

## Local-first law

Do **not** use GitHub Actions as the compiler.

Before push:

```bash
# Elixir SocialFlow change
scripts/ci/local_gate.sh elixir --quick   # or full elixir without --quick

# Full approximation of hosted CI
scripts/ci/local_gate.sh full
```

Batch format + Credo + tests + evidence into **one** push.

## Required check

Prefer branch protection / ruleset on **`CI gate`** (aggregate).  
Legacy names still exist for individual jobs when they run:  
`Elixir core`, `Contracts + Python`, `Docker build`, `Mobile shell`, `Public web`.

## PR #74 recovery (billing)

1. Do **not** rewrite #74 head for billing noise.  
2. When runners work: **re-run exact head**.  
3. Green → merge. Red → fix real failure only.

## Self-hosted runners

Optional later. **Founder approval required.** Not enabled by agents.

## Success

Stop paying to re-test **unchanged** surfaces every commit.  
Keep **full product regression** before merge and on main.
