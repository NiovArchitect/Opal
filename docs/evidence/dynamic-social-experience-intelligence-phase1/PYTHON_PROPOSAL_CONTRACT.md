# Python proposal contract — collective fit dinner

## Capability

`social_flow_collective_fit_rank`

## Input (structured JSON in context item)

```json
{
  "kind": "collective_fit_input",
  "candidates": [{ "id": "venue_1", "quiet": true, "price_band": "$$", "...": "..." }],
  "hard_constraints": { "require_quiet": true, "earliest_available": "19:30" },
  "private_hard_features": { "max_price_band": "$$" },
  "soft_preferences": { "prefer_novelty": true, "prefer_balanced_travel": true }
}
```

Private features are protected flags for ranking only. They must never appear in explanation text.

## Output

```json
{
  "result_type": "collective_fit_ranking",
  "collective_fit_ranking": {
    "ranked_candidate_ids": ["venue_1"],
    "explanations": [{ "candidate_id": "venue_1", "text": "..." }],
    "preferred_id": "venue_1",
    "restraint_recommendation": "surface",
    "confidence": 0.8,
    "no_match": false
  }
}
```

## Guarantees

- Max three candidate IDs
- No raw private budget in explanations
- Deterministic local model `deterministic-collective-fit-dinner`
- No free-form LLM control as sole authority
