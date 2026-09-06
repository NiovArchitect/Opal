# P4.3 Medium Existing Owner Inventory

**HEAD:** `e8d0ae5`

| Owner | Action |
|-------|--------|
| `DecisionIntelligence` + DecisionContext/Evidence/Result | **EXTEND** — Medium as DecisionResult mode |
| `HighConfidence` | **REUSE** — re-eval after answer; do not weaken |
| CandidateSource / Place.Catalog | **REUSE** — still **FIXTURE** |
| Outbox / Kafka / DomainEvent | **EXTEND** — question_asked / answered / superseded |
| Global Opal `OpalAmbient` | **EXTEND** — one-question region (988:2) |
| P4.2 High UI / engine | **DO_NOT_TOUCH** conceptually — re-prove if shared code changes |
| P2 / P3 | **DO_NOT_TOUCH** |

No parallel AIQuestionSystem — question lives on DecisionResult.
