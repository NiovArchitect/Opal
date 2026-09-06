# P4.2 High-Confidence Policy

**Version:** `p4.2.high.v1`

## Law

High ≠ model sounds sure. High = context sufficient, evidence good, fresh, hard constraints ok, candidate legitimate, another question would add more friction than value.

**Confidence ≠ confirmation.** Result starts **PROVISIONAL** (violet). Gold only when Ready/Reserved/Confirmed earned later.

## Dimensions (inspectable)

| Dimension | High-friendly when |
|-----------|-------------------|
| CONTEXT_COMPLETENESS | intent + people/scope + enough time/budget/vibe for the job |
| EVIDENCE_QUALITY | hard claims present or soft prefs consistent |
| CONFLICT_LEVEL | no hard conflicts in `conflicts[]` |
| FRESHNESS | no critical stale evidence |
| FEASIBILITY | ≥1 candidate survives hard filter |
| PROVIDER_CERTAINTY | for provisional recommend: fixture/provider_freshness allowed; no booking claim |
| PEOPLE_ALIGNMENT | scope participants known |
| RISK | recommend-only (reversible) — no auto book/pay |
| MODEL_CERTAINTY | optional; cannot alone create High |

## Hard gates (any → NOT_HIGH)

- unresolved hard constraint conflict  
- critical stale availability  
- candidate closed/unavailable  
- required participant unavailable  
- scope ambiguity (missing participants for dyad/group)  
- candidate not in authorized set  
- based_on_context_revision ≠ current  

## Output

- HIGH → exactly one `answer_entity_id` + provisional DecisionResult  
- else → `NOT_HIGH_CONFIDENCE` with reason_codes (no forced High; no Medium question yet)

## Machine config

See `P4_2_HIGH_CONFIDENCE_POLICY.json`
