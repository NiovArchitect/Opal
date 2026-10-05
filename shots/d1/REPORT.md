# Phase D-1 report

## Product

`group_tastes` table + `OpalCore.GroupTastes`. Deterministic `group_hash`
(SHA256 first 16 of sorted member ids joined by `|`). Learns vibes, cuisines,
temporal day patterns from agreed SharedPlans. Suggests after 3+ plans.
6-month decay at 0.5 weight. Opt-out via `users.group_taste_opt_out`.
Aggregate only — no individual leakage, no compatibility scores.

## Integration

- `PlanAgreementTasteBridge.after_agreed/1` → `GroupTastes.record_plan/2`
- OC-2 `assemble/2` adds `:group_tastes` (top 3 groups with plan_count ≥ 3)
- OC-4 `:recommend` → "You three always love lively italian on Fridays…"
- OC-4 `:plan_create` → "You usually do Fridays with Maya and John — want Friday?"

## Verification

- GroupTastesTest: 15/15
- OpalContextTest (incl. group_tastes key): 5/5
- Manual: 3 lively/italian/friday + 1 quiet/thai/saturday → suggest
  `%{vibes: ["lively","quiet"], cuisines: ["italian","thai"], best_day: "friday"}`
