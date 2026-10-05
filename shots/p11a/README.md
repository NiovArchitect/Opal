# Phase 11A — create plan from conversation (Plan this)

Place-sheet **Plan this** creates a tentative SharedPlan for the conversation (members as participants; no auto-agree; Choose/draft unchanged).

## What shipped

- `SocialFlow.create_tentative_plan_from_conversation/3` — status `tentative`, source `conversation`, creator accepted/lead, peers pending, `authority_source: plan_this`
- `POST /api/v1/product/conversations/:id/plans`
- FE `createConversationPlan` + place-option **Plan this** beside Choose
- Structured-layout **Choose a place** entry (`place-gap-cta`) — classic chip stays CSS-hidden (46fabf5)
- Chats-list fix: `list_conversations` no longer `Repo.one`s SharedPlan when a conversation has multiple plans

## Evidence

| File | What |
|------|------|
| `mix_test.log` | create-plan unit/API + messages multi-plan — 12/12 |
| `fe_test.log` | socialReality (incl. 11A) — 14/14 |
| `a8_surface_regression.log` | SurfaceProjection — 13/13 |
| `no_score.txt` | `no_score_ok` |
| `place_sheet_390.png` / `430` | Choose + Plan this on options |
| `after_plan_this_390.png` / `430` | Confirmation after create |
| `browser_VERIFY.json` | Live API + UI rollup |
| `VERIFY.json` | SHA parity + checks |

## Laws held

- Tentative only (5A taste bridge waits for later agreement)
- Conversation members as participants; non-member → 404
- Never invent cuisine/vibe/price from place names
- Choose still drafts only; trip-leg create-plan (4E) untouched
- Classic chip `display:none` under structured layout preserved
