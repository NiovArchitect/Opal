# P4.2 High-Confidence Intent Lock

**Starting HEAD:** `bb17d81`  
**Branch:** `build/v2-coded-experience-closure`

```
P4_2_AUTHORIZED = YES
P4_3+ = HOLD
P2_FROZEN = YES · P3_FROZEN = YES
MERGE = NO · LIVE = NO
```

## Authority chain

P4.0 contracts · P4.1 DecisionContext · P4.1a Kafka GREEN · visuals `979:2` / `979:280` · shell `618:902`

## Deliver

1. Durable **DecisionResult** (Elixir/Postgres)  
2. `based_on_context_revision` server enforcement (stale → reject)  
3. Multi-dimensional **HIGH** gate + hard blockers → else `NOT_HIGH_CONFIDENCE`  
4. Candidate provenance via `CandidateSource` / Catalog — **FIXTURE** honesty  
5. Python high_eval propose contract (optional path) + Elixir validation required  
6. Initial truth_state **PROVISIONAL** (violet) — not Gold  
7. One answer only (no carousel/rank)  
8. Accept → same Graph (`graph_id`) without shadow AI plan  
9. Kafka: `decision.resolved` / `decision.accepted`  
10. Global Opal result region: one provisional answer when High  

## Candidate honesty

```
HIGH_ENGINE_BACKEND = REAL
CANDIDATE_SOURCE = FIXTURE (Place.Catalog)
PRODUCTION_HIGH_DECISION = PARTIAL
STORE_READY = NO
```

## Non-goals

Medium/Low UI · P4.3 questions · provider booking · 1046:2 · P2/P3 reopen · fake production candidates · Gold-from-confidence
