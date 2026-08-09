# GitHub Actions cost / CI efficiency audit

**Date:** 2026-08-09  
**Branch:** `build/ci-efficiency`  
**Constraint:** Do **not** weaken Opal regression standard — make CI intelligent.

Status legend: **KNOWN** (workflow source or API) · **INFERRED** · **UNAVAILABLE** (billing block)

---

## 1. Current workflows

| Workflow | Triggers | Jobs |
|----------|----------|------|
| `ci.yml` (before this PR) | `push: main, build/**` + `pull_request: main` | 5 always: Contracts+Python, Elixir, Docker, Mobile, Public web |
| `deploy-opal-api.yml` | `workflow_dispatch` only | build-push-deploy (not on every PR) |

No `schedule`, `merge_group`, or `workflow_call` present. **KNOWN**

---

## 2. Duplicate push + pull_request — **YES**

**KNOWN from workflow source:**

```yaml
on:
  push:
    branches: [main, "build/**"]
  pull_request:
    branches: [main]
```

Feature branches named `build/**` with an open PR therefore fire **two** full matrices per push.

**KNOWN from Actions metadata (PR #73):**

| Run ID | Event | Title |
|--------|-------|-------|
| 31342106529 | `push` | feat(device): leave-by/nav… |
| 31342108934 | `pull_request` | feat(device): leave-by/nav… |

Same head, ~4s apart, 5 jobs each → **10 jobs billed** for one logical push.

---

## 3. Jobs per ordinary feature push (before optimization)

Always (no path filters):

1. Contracts + Python  
2. Elixir core  
3. Docker build (opal_ai + opal_core)  
4. Mobile shell  
5. Public web  

**KNOWN:** no `paths` / `paths-filter` in old `ci.yml`.

Docs-only / evidence commits: **same full matrix**. **KNOWN**

---

## 4. Representative durations (main merge #73 run 31342268730)

| Job | Wall time | Rounded billable min (typical) |
|-----|-----------|--------------------------------|
| Contracts + Python | ~25s | 1 |
| Public web | ~38s | 1 |
| Mobile shell | ~41s | 1 |
| Docker build | ~92s | 2 |
| Elixir core | ~182s | 4 |
| **Sum (one matrix)** | wall ~3m | **~9 runner-min** |

**INFERRED billable:** GitHub rounds each job up to whole minutes.

---

## 5. Cost model (ordinary Grok feature push)

| Scenario | Matrices | ~Runner-min |
|----------|----------|-------------|
| One push with open PR (old) | 2 (push+PR) | **~18** |
| 4 intermediate pushes (format/credo/test/docs) | 8 | **~72** |
| PR merge to main | +1 full | **~9** |
| **One “logical” PR with high churn** | | **~80+** |

**Waste multipliers (ranked):**

1. **push + PR double matrix** (~2×) — **KNOWN**  
2. **No path filters** (web/mobile/docker on Elixir-only) — **KNOWN**  
3. **No concurrency cancel** (superseded commits keep running) — **KNOWN**  
4. **High push frequency** (Grok iterative remote CI) — **INFERRED** from session history  
5. **No dependency/Docker caches** — **KNOWN** (`NO_CACHE` in old workflows)  
6. **Web dist artifact every PR** — **KNOWN**  
7. Matrix OS/runtime multi-version — **no** (single ubuntu, single Elixir/Node/Python) — **KNOWN**

---

## 6. Answers to audit questions

| # | Question | Answer |
|---|----------|--------|
| 1 | push+PR duplicate? | **YES** on `build/**` |
| 2 | All five jobs always? | **YES** (old) |
| 3 | Docker on docs-only? | **YES** (old) |
| 4 | Artifacts every run? | Web dist always (old); no size API — **UNAVAILABLE** exact GB |
| 5 | Cache churn? | **No caches** → full install every job |
| 6 | Matrix multiply versions? | **No** |
| 7 | Superseded runs continue? | **YES** (no concurrency) |
| 8 | concurrency cancel-in-progress? | **No** (old) |
| 9 | Evidence commits full CI? | **YES** |
| 10 | Fast lane + full merge gate? | **Implemented in this PR** |

---

## 7. Implemented design

### Triggers

- **`push`:** `main` only (full matrix)  
- **`pull_request`:** path-aware + optional full  
- **`workflow_dispatch`:** force full  
- **Removed:** `push` on `build/**` → eliminates twin runs  

### Concurrency

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

### Path ownership

| Surface | Paths |
|---------|--------|
| Elixir | `apps/opal_core/**` |
| Python | `services/opal_ai/**`, `contracts/**` |
| Web | `apps/opal_web/**` |
| Mobile | `apps/opal_mobile/**` |
| Docker | Dockerfiles + lock/mix/pyproject when runtime-relevant |
| Docs | `docs/**`, `*.md` → lite gate only |

**Full matrix when:**

- push to `main`  
- PR label `full-ci`  
- `workflow_dispatch`  
- `.github/workflows/**` or shared contracts change  
- **≥2 product surfaces** in one push  

### Caches

- Elixir: `deps` + `_build` keyed by `mix.lock`  
- Node: setup-node npm cache  
- Python: setup-python pip cache  
- Docker: GHA Buildx cache (`type=gha`)  

### Artifacts

- Web dist upload **only on main push** (retention 7d)  
- Not on every PR  

### CI gate

Job `CI gate` aggregates path-aware results for a **single required check**.

### Local-first Grok rule

Before remote push:

1. `mix format` / Credo / focused + relevant suite  
2. Batch formatter/Credo/test fixes into **one** push  
3. Docs-only follow-ups should not be mixed with code if avoidable  
4. Before merge: apply label **`full-ci`** (or ensure multi-area/full path) so full matrix runs once  

---

## 8. Expected reduction (conservative)

| Change | Est. savings vs old feature push |
|--------|-----------------------------------|
| Kill push+PR double | **~50%** |
| Path filter (Elixir-only PR) | drop web+mobile+python ≈ **~3 min** of 9 → **~45%** of remaining |
| Concurrency cancel | high variance; often **20–40%** on rapid iteration |
| Caches | **10–30%** wall on warm runs |
| No PR web artifact | small storage, minor time |

**Combined (Elixir-only iteration push):**  
Old ~18 runner-min (double full) → New ~4–6 (single Elixir+Docker with cache) ≈ **65–80% reduction** per such push.

**Full merge / main:** still ~9+ runner-min — **intentional**.

---

## 9. What must remain fully tested (merge / main)

- Real People, auth/session, invites, continuation  
- Phoenix realtime, Set authority, private non-leak  
- Availability, native social time, feasibility  
- Block/revoke, group viability  
- Ambient Opportunity, Device boundary  
- Contracts/Python when those surfaces ship  
- Docker image build when runtime changes or on full gate  

---

## 10. Self-hosted runner (analysis only — no enable)

| | |
|--|--|
| Pros | Cuts billed Actions minutes on private repo |
| Cons | Machine sleep/offline, secrets exposure, untrusted PR risk, maintenance |
| Decision | **Founder only** — do not enable automatically |

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| Merge with only path-filtered green | Label `full-ci` before merge; prefer branch protection on `CI gate` + require full-ci label for production PRs |
| Shared file miss | `contracts/**` and workflow changes force full |
| Cache poison | Keys include lockfiles; main always rebuilds full |
| Billing still blocked | Code ready; founder restores Actions spend |

---

## 12. Success definition

Not fewer tests.  

**Stop paying to test unchanged parts of Opal over and over.**  
Develop: targeted. Merge/main: full product. Cancel stale. Batch pushes. Cache smart.
