# P4.3 Question Selection Policy

**Version:** `p4.3.question.v1`

## Utility (conceptual)

Prioritize: `EXPECTED_DECISION_GAIN × DECISION_IMPACT × ANSWERABILITY × FRESHNESS_VALUE / USER_FRICTION`

## Eligible HUMAN_ONLY dimensions (P4.3)

| Dimension | When material | Example choices |
|-----------|---------------|-----------------|
| `TIME_PRECISION` | Intent needs time; time_context empty/vague | Earlier · Later · Flexible |
| `VIBE` / indoor-outdoor | Candidates split strongly on quiet/energy | Quiet · Lively |
| `BUDGET` | Candidates span price bands; no budget_context | Keep it light · Fine to spend |
| `DISTANCE_TOLERANCE` | Far candidates compete with near | Nearby · Worth the trip |

## Never ask (examples)

- Venue open? → MACHINE (catalog/provider)  
- Who is in Graph? → AUTHORITY_LOOKUP  
- Model uncertain with complete context → system handles, not user  
- Favorite color / blank non-impacting fields → skip  

## After answer

Mutate DecisionContext only on that dimension → revision++ → HighConfidence.evaluate → ONE ANSWER if High earned.
