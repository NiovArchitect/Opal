# P4.4 Low/Conflicted Intent Lock

**Starting HEAD:** `a175199` · **Visual:** `988:263` (People 4)

```
P4_4_AUTHORIZED = YES
P4_5 = HOLD
CANDIDATE_SOURCE = FIXTURE (honest)
```

## Law

LOW = **one real human tradeoff** between two legitimate values — not missing info (Medium), not model failure, not zero candidates (`NO_VALID_CANDIDATE`).

Hard constraints are **never** tradeoff options.  
VISIBLE_TRADEOFF_COUNT = 1 · OPTIONS = 2.  
Choice → same decision_id · revision++ · recompute → High if earned.  
No blame / private preference leakage.

## Deliver

Conflict classification · tradeoff axis · persist on DecisionResult · resolve_tradeoff · events · UI · proofs

## Non-goals

P4.5 · voting · Gold · auto-book · reopen High/Medium concepts · 1046:2
