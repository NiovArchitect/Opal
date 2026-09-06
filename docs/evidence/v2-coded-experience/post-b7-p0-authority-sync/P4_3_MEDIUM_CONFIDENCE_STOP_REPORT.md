# P4.3 Medium-Confidence — STOP REPORT

**Date:** 2026-09-05  
**Starting HEAD:** `e8d0ae5`  
**Visual:** `988:2` · **Not** `988:263`

## Law delivered

MEDIUM → **one necessary human question** after machine-resolvable gaps.  
Answer → same `decision_id` · revision++ · settle question · re-eval → High if earned.  
Never ask for machine-fetchable truth. Never ask to cover model weakness.

## Delivered

| Item | Status |
|------|--------|
| Gap classifier + question utility | REAL |
| DecisionResult medium fields | REAL |
| `resolve` / `answer_question` | REAL |
| Events `question_asked` / `answered` / `superseded` | REAL |
| Stale question supersession | REAL |
| High re-eval after answer | REAL |
| Global Opal one-question UI (`opal_medium_demo=1`) | REAL |
| Tests | 4 medium + 5 high PASS |

## Honesty

```
MEDIUM_ENGINE_BACKEND = REAL
CANDIDATE_SOURCE = FIXTURE
STORE_READY = NO
```

## Explicit

```
P4_3_COMPLETE = YES
P4_4_AUTHORIZED = NO
P4_COMPLETE = NO
P2_FROZEN = YES · P3_FROZEN = YES
MERGE = NO · LIVE = NO
```

## STOP

```
P4.3 COMPLETE.
ONE QUESTION. SAME DECISION. THEN ONE ANSWER IF EARNED.
P4.4 WAITS.
PRESERVE → EXTEND → COMPOUND.
STOP.
```
