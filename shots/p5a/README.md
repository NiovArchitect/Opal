# Phase 5A — plan-agreement → taste candidate bridge

Lawful learning loop: when a `SharedPlan` transitions **TO** `agreed`, extract
present taste attributes and submit them through `MemoryIntelligence.consider/1`
once per (participant × dimension). Existing gates decide admission/promotion.

## Laws honored

- `RecommendationIntelligence.record_acceptance` **untouched** — still
  `durable_memory_written: false`
- `MemoryIntelligence` gates / candidate schema **untouched**
- Never invent taste attrs (missing → silent skip; catalog `quiet` ≠ vibe)
- cancelled / tentative → nothing
- Idempotent on `(plan_id, owner, dimension)` via `idempotency_key` prefix

## Hooks

- `SocialFlow.create_shared_plan` → `PlanAgreementTasteBridge.after_agreed/1`
- `JourneyAuthority.activate` → only when plan origin is `:created`

## Verify

- `mix test test/opal_core/social_flow/plan_agreement_taste_bridge_test.exs` — 8/8
- record_acceptance regression — PASS
- A8 surface projection — 13/13
- Live: 2 participants + cuisine/vibe → 10 candidates (5 dims × 2 owners)
