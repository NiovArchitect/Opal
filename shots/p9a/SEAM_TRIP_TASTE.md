# Escalation — Journey 2 taste seam (Phase 9A)

## Observed
After trip create → curate → add leg → `create_plan_from_leg` → `accept_going`:
- SharedPlan.status remains `"tentative"`
- `PlanAgreementTasteBridge.after_agreed/1` is **not** invoked
- No `taste:*` MemoryCandidates for participants

## Existing wires (unchanged)
- `SocialFlow` confirm/agree path → `after_agreed`
- `JourneyAuthority.activate/1` when `origin == :created` → `after_agreed`

## Why not auto-fixed in 9A
Trip-leg plans have `place_label` (+ optional dates), not full recommendation alignment (cuisine/vibe/area). Blindly calling `after_agreed` would invent taste attributes or no-op on empty extract — either is a design call.

## Ask for focused paste
1. Should trip-leg plans ever transition `tentative → agreed`? On first accept-going? On all participants accepted?
2. What taste attrs are lawful from a leg (name parse? destination pack cuisine? none until user confirms a venue card)?
3. Should 5A stay conversation/outing-only until that decision?
