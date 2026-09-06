# P4.3 Medium-Confidence Intent Lock

**Starting HEAD:** `e8d0ae5` · **Branch:** `build/v2-coded-experience-closure`

```
P4_3_AUTHORIZED = YES
P4_4 = HOLD
988:2 = CURRENT Medium visual
CANDIDATE_SOURCE = FIXTURE (honest)
```

## Law

MEDIUM → **ONE NECESSARY HUMAN QUESTION** after machine-resolvable gaps are exhausted.  
Never ask for what Opal can fetch/derive/already knows.  
Never ask to compensate for model weakness.  
Answer → same `decision_id` · revision++ · settle question · re-eval → High if earned.

## Gap classes

`MACHINE_RESOLVABLE` · `HUMAN_ONLY` · `AUTHORITY_LOOKUP` · `EXTERNAL_DEPENDENCY` · `NOT_CLARIFIABLE`

## Deliver

- Extend DecisionResult for medium/question fields  
- Gap classifier + question utility policy  
- `resolve_medium` / unified resolve · `answer_question`  
- Events: `decision.question_asked` / `answered` / `superseded`  
- UI: one question + choices (988:2 People-2 semantics)  
- Stale question / superseded protection  

## Non-goals

Low/tradeoff · 988:263 · weaken High · wizard/forms · fake REAL candidates
