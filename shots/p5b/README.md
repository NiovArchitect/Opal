# Phase 5B — temporal habit miner (`recurring_routine`)

`TemporalHabitMiner.mine/1` analyzes a user's **agreed/completed** SharedPlans
(with `start_at`), extracts temporal patterns, and submits candidates through
`MemoryIntelligence.consider/1`. No cron/Oban wiring this phase.

## Patterns

- **prefers** `(weekday × daypart)` when share ≥ 40% and total plans ≥ 5  
  → `temporal:prefers:friday_evening`
- **avoids** `daypart` with 0 plans when total ≥ 10  
  → `temporal:avoids:morning`
- **Fewer than 5 timed plans** → `:insufficient_data` (submits nothing)

Dayparts reuse `AvailabilityComposition.resolve_daypart/3` windows
(morning / afternoon / evening / night). Local wall clock uses each plan's
`timezone`.

## Laws

- Only agreed/completed (tentative/changed/cancelled excluded)
- No edits to `memory_intelligence.ex`, `memory_candidate.ex`, `availability_composition.ex`
- Idempotent on `(user, value_key)` — re-mine does not duplicate
- No people-scoring / no `*_score`

## Verify

- `mix test test/opal_core/social_flow/temporal_habit_miner_test.exs` — 6/6
- Live seed → mine → prefers friday_evening + avoids morning
- A8 surface projection — 13/13
