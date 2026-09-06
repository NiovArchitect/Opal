# R0 Release Reality Lock — STOP REPORT

**Date:** 2026-09-06  
**Starting HEAD:** `e52d095`  
**Branch:** `build/v2-coded-experience-closure`  
**Product code changed:** **NO**  
**Infrastructure provisioned:** **NO**  
**External cost:** **NO**

## Purpose delivered

P4 answered **Can Opal think?** → YES.  
R0 answered **What is the dependency-correct path to a real release?** → defined below.

## Locked program state

```
OPAL_GRAPH_PRODUCT_STATE = POST_P4_PRODUCTIONIZATION

P2_CALLS_CONTINUITY = CURRENT_FROZEN
P3_SIGNAL_MOTION = CURRENT_FROZEN
P4_COMPLETE = YES · DO NOT REOPEN

STORE_READY = NO
FOUNDER_ACCEPTED_WHOLE_PRODUCT = NO
MERGE = NO · LIVE = NO · STORE_SUBMISSION = NO

R0_COMPLETE = YES
R1A_AUTHORIZED = NO
R1B_AUTHORIZED = NO
R2…R7_AUTHORIZED = NO
```

## Critical path (summary)

```
TLS → real SMS identity → installable native RC
  → two-phone chat → WebRTC+TURN call → push for ring
  → (parallel) ops/Kafka/Python claims
  → provider depth → privacy/store → Founder Walk → Store GO
```

**Transformative milestone:** M3 — two real phones, real audio call, Continuity + DI still true.

## Phase order (refined)

| Phase | Title | On critical path to first call? |
|-------|-------|----------------------------------|
| **R1A** | Security + Production Identity | YES |
| **R1B** | Native Shell Authority | YES (parallel late R1A) |
| **R2** | Native Product Spine | YES |
| **R3** | Call Media Reality | YES ★ |
| **R4** | Push / Background | YES for offline ring |
| **R5** | Prod intelligence ops | NO for first call |
| **R6** | Provider depth | NO |
| **R7** | Privacy + Store | Store gate |

## P0 security finding (recorded, not fixed in R0)

`apps/opal_core/config/runtime.exs` ~152–167: `ssl_opts: [verify: :verify_none]` when `DATABASE_SSL` enabled.  
**Severity:** P0_RELEASE_BLOCKER · **Fix owner:** R1A · **Do not ignore.**

No committed production secret values found (names-only inventory).

## Artifacts

| Doc | Role |
|-----|------|
| `R0_RELEASE_REALITY_INTENT_LOCK.md` | Scope law |
| `R0_RELEASE_TARGET.md` | Stage ladder A–F |
| `R0_PRODUCT_PROMISE_CLASSIFICATION.md` | Launch required vs optional |
| `R0_RELEASE_BLOCKER_LEDGER.yaml` | Normalized blockers |
| `R0_RELEASE_CRITICAL_PATH.md` | Order + milestones |
| `R0_RELEASE_DEPENDENCY_GRAPH.json` | Machine graph |
| `R0_P0_EXECUTION_ORDER.md` | First five after GO R1A |
| `R0_FOUNDER_ACTIONS.md` | Money / devices / GOs |
| `R0_CURRENT_REALITY_SCORECARD.md` | Think vs call vs store |

## Next explicit GO

**GO R1A** — Security + Production Identity (TLS + Twilio).  
Optional parallel **GO R1B** — Native Shell Authority after API reachable.

Do **not** auto-start R1. Do **not** buy TURN. Do **not** implement WebRTC.

## STOP

```
R0 COMPLETE.
RELEASE PROGRAM LOCKED.
CRITICAL PATH = IDENTITY → NATIVE → CALL MEDIA → PUSH.
P4 REMAINS COMPLETE. STORE REMAINS NO.
DO NOT BEGIN R1 WITHOUT EXPLICIT FOUNDER GO.
PRESERVE → EXTEND → COMPOUND.
STOP.
```
