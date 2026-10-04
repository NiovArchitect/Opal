# Phase 5C — taste learning → ranking synthesis

Proves 5A taste candidates influence `RecommendationIntelligence` place ranking.

## Chain

1. Agree italian plan → candidate `taste:cuisine:italian` (conf 0.35)
2. Three agreements → strengthen to obs=3, conf 0.59 (≥ 0.5 soft floor)
3. Auto-promote **holds** for `accepted_plan_pattern` (recorded — not a bug)
4. `load_a4_candidates: true` → italian ranks above equal-score thai
5. Fresh user control → no boost

## Fix (smallest)

`usable_soft_prefs` treated every non-explicit A4 candidate as `inferred` → always
`weak_pref` (tiny influence). Now:

- parse `taste:cuisine:italian` → preference label `italian`
- `accepted_plan_pattern` / `repeated_behavior` with obs ≥ 3 → `weight_class: repeated_behavior`
- pass `observation_count` + `evidence_kind`

Did **not** lower the 0.5 confidence floor or touch memory gates / schema /
`record_acceptance`. Temporal (`recurring_routine`) stays out of place ranking.

## Verify

- `mix test …/taste_learning_ranking_synthesis_test.exs` — 4/4
- recommendation_intelligence regression — 14/14
- A8 surface projection — 13/13
