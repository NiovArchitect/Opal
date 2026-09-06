# P4.4 Low / Conflicted Decision Intelligence — STOP REPORT

**Date:** 2026-09-05  
**Starting HEAD:** `a175199`  
**Visual:** `988:263` · People 4 · **Not** `988:2` · **Not** historical `979:834` / `984:264`

## Law delivered

LOW = **one real human tradeoff** when facts are known but two legitimate needs conflict.  
Not missing info (Medium). Not model/system failure. Not zero hard-feasible candidates (`NO_VALID_CANDIDATE`).  
Hard constraints are **never** tradeoff options.  
VISIBLE_TRADEOFF_COUNT = 1 · OPTIONS = 2 · no blame / no private preference leakage.  
Choice → same `decision_id` · revision++ · soft preference only · re-eval → High if earned.

## Delivered

| Item | Status |
|------|--------|
| Inventory + intent lock + conflict/tradeoff policy | REAL |
| Structured conflict on DecisionResult | REAL |
| `LowConfidence` grounded axis detection | REAL |
| `resolve` → LOW / `resolve_tradeoff` | REAL |
| Events `tradeoff_presented` / `selected` / `superseded` | REAL |
| Stale tradeoff supersession | REAL |
| High re-eval after tradeoff (`HIGH_AFTER_TRADEOFF`) | REAL |
| Global Opal one-tradeoff UI (`opal_low_demo=1`) | REAL |
| Tests | 5 low + medium + high PASS (14) |
| Prove script + UI smoke | PASS |

## Honesty

```
LOW_ENGINE_BACKEND = REAL
CANDIDATE_SOURCE = FIXTURE
STORE_READY = NO
```

## Explicit

```
P4_4_COMPLETE = YES
P4_5_AUTHORIZED = NO
P4_COMPLETE = NO
P2_FROZEN = YES · P3_FROZEN = YES
MERGE = NO · LIVE = NO
ACTIVITY_ICON_APPROVED = NO
```

## Product meaning protected

Opal compresses real conflict into one understandable axis so disagreement is less socially expensive — without naming who caused which side.

## STOP

```
P4.4 COMPLETE.
ONE REAL TRADEOFF. SAME DECISION. THEN ONE ANSWER IF EARNED.
P4.5 WAITS — realtime recomposition + provider/world truth.
DO NOT BEGIN P4.5 AUTOMATICALLY.
PRESERVE → EXTEND → COMPOUND.
STOP.
```
