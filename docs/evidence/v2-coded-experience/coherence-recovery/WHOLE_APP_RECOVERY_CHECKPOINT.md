# Whole-application coherence recovery — CHECKPOINT status

**Kind:** CHECKPOINT (not FROZEN_GREEN · not A8 COMMIT)  
**Branch:** `build/v2-coded-experience-closure`  
**Updated:** 2026-10-02

## Repository

| Field | Value |
|-------|-------|
| BRANCH | `build/v2-coded-experience-closure` |
| HEAD | see `git rev-parse HEAD` after latest push |
| REMOTE_PUSHED | YES (continuity 8412969 → temporal 6a6c656 → hygiene 3e53188 → projection f84dcc2 + follow-ons) |
| MERGE | NO |
| LIVE | NO |
| UNTRACKED_AUTHORITY_DOCS | 0 (authority committed) |
| TRACK_B | call* files remain untracked · PLAIN_CALL_PHYSICAL=RED · CALL_TRANSPORT_COMMIT=NO |

## Authority docs now in repo

- `docs/authority/CURRENT_OPAL_STATE.md`
- `docs/authority/PRODUCT_INVARIANTS.md`
- `docs/authority/STATE_SURFACE_CONTRACT.md`
- `docs/authority/STARTUP_RECOVERY_CONTRACT.md`
- `docs/authority/FOUNDER_VALIDATION_LEDGER.md`
- `docs/authority/REGRESSION_LEDGER.md`
- `docs/authority/AI_AUTONOMOUS_EXECUTION_CONTRACT.md`
- `docs/authority/CONVERSATION_STATE_ORCHESTRATION.md` (min arbitration REQUIRED NOW)
- Fort Oak truth + memory privacy audit under `docs/evidence/v2-coded-experience/coherence-recovery/`

## Fort Oak (server)

| Field | Value |
|-------|-------|
| PLAN_ID | `70804c05-779f-4991-ab9c-c75c319ebf2f` |
| PLAN_VERSION | 27 |
| START (canonical) | 2026-09-29 20:00 America/Los_Angeles → `2026-09-30T03:00:00Z` |
| TEMPORAL_STATE @ Oct 2 | **past** |
| NEXT_TOGETHER_ELIGIBLE | **false** |
| UPCOMING_READY | **false** |
| FUTURE_EXECUTION_ACTIONABLE | **false** |
| reservation_authorizable | **false** |

## Automation evidence

| Suite | Result |
|-------|--------|
| PlanStateArbitration ExUnit (12) | PASS |
| Surface/Home projection + arbitration (30) | PASS |
| nextPlan / surfaceProjection / dockUnread vitest | PASS |
| `scripts/coherence_recovery_e2e.mjs` | **GREEN** — PAST_NT=0 PAST_EXEC=0 residue sample=0 demo memory title=0 |
| `scripts/a8_cross_surface_proof.mjs` | **PARTIAL** — API/seed checks PASS; UI timeout waiting `[data-testid=gsh-activity]` (Home mount) after past-fixture world — needs proof repair |
| Founder physical | **PENDING** — ONE walk only after remaining automation green |

## Verdict

```yaml
A8_DOMAIN: GREEN_BUT_INSUFFICIENT_PRIOR; COHERENCE_GATES_NOW_CODE_GREEN
A8_MOBILE: PHYSICAL_PENDING
A8_STATE_ORCHESTRATION_MINIMUM: CODE_GREEN (min layers + temporal gates)
A8_WHOLE_APP_COHERENCE: AUTOMATION_PARTIAL → PHYSICAL_PENDING
COMMIT: NO
JOURNEY: BLOCKED
TRACK_B: RED
```

## Fresh AI recovery

Read `docs/authority/STARTUP_RECOVERY_CONTRACT.md` then `CURRENT_OPAL_STATE.md`.  
`FRESH_AI_CAN_RECOVER_FROM_REPO_ONLY` → YES (continuity checkpointed).  
`CHAT_HISTORY_REQUIRED_FOR_RECOVERY` → NO.
