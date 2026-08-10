# GitHub recovery state (2026-08-09)

## PRESERVE

| Item | Notes |
|------|--------|
| **PR #74** head `39808b0` | `build/ambient-chaos-network` — chaos harness + network + booking. **FROZEN.** Locally green. Do not rewrite for billing. |
| **PR #75** head `ab2e61d`+ | `build/ci-efficiency` — path-aware CI, concurrency, caches. |
| origin/main `0c17e43` | Includes #71–#73 merges. |
| Merged product work | #71 feasibility, #72 physical+ambient, #73 device bridge. |

## SUPERSEDED (safe to leave; do not delete casually)

Old worktrees for already-merged product PRs (physical-reality, time-feasibility, etc.) — historical heads, product already on main.

## Queued after Actions healthy

1. Re-run **#74 exact head** → merge if green  
2. Land **#75** (CI efficiency) if green  
3. Rebase/rebuild next product branch from updated main only as needed  

## Billing

- Annotation (when blocked): *payments failed or spending limit*  
- Org billing API: **404 / needs admin:org** from this token  
- PR #75 later showed **runners starting** again — treat as intermittent restore; still need founder confirmation of spend limit  

## Founder-only

If runners block again: org **Billing & plans → Actions spending limit / payment method**.  
Grok must **not** authorize new paid spend.
