# Paste I Phase 0 — Relationship Matrix

End-to-end type → behavior trace for the seven RU-1 relationship types.
Authority: `OpalCore.Relationships.Behavior` + AttentionBudget relationship bounds.

## Types → defaults

| Type | style | planning | frequency | lead_time_h | nudge_daily_cap |
|---|---|---|---|---|---|
| spouse | warm | spontaneous | daily | 0 | 3 |
| partner | warm | spontaneous | daily | 0 | 3 |
| family | warm | planned | weekly | 12 | 1 |
| close_friend | casual | spontaneous | weekly | 2 | 1 |
| friend | casual | planned | weekly | 12 | 1 |
| business | formal | planned | occasional | 48 | 0 |
| acquaintance | formal | planned | occasional | 24 | 0 |

Occasional (cap 0) denies casual priorities (`nudge` / `proactive_thread` / `routine_break`); `time_critical` and `mediation` always allowed.

## End-to-end trace — `type=spouse`

1. **Type** — owner sets contact as `spouse` (RU-1 `Relationships.set_type/4`).
2. **Bounds** — `Behavior.defaults_for("spouse")` → `%{"style" => "warm", "planning" => "spontaneous", "frequency" => "daily"}`; stored `communication_bounds` merge over defaults via `resolved_bounds/2`.
3. **Tone warm** — `plan_proposal_copy("spouse")` / `reminder_copy("partner"|"spouse")` / `invite_copy` use warm framing (personal, not formal).
4. **Planning spontaneous** — `enforce_planning("spouse", 1)` → `:ok` (same-day / 1h ahead allowed; lead_time 0).
5. **Nudges daily cap 3** — `nudge_daily_cap("spouse")` → `3` from frequency `daily`; `nudge_allowed?("spouse", "proactive_thread")` → true.
6. **AttentionBudget allows** — `AttentionBudget.request_slot(account_id, "nudge", "nudge", %{relationship_type: "spouse", provenance: "stated", ...})` grants (after maturity + quiet-hours gates). Contrast: same call with `relationship_type: "acquaintance"` → `{:denied, :relationship_bounds}`.

## Variant seams covered by tests

- **T1** — `dual_timezone_proposal/4` local labels differ; spouse vs business plan copy diverge.
- **G1** — `mediation_copy` family warm vs business formal.
- **M1** — `split_ask_copy` close_friend casual vs acquaintance formal; `shows_balance: false` both.
- **I1** — `invite_copy` body differs close_friend vs business.
- **E3** — `reminder_copy` partner warm vs acquaintance formal.
- **P2** — private ex facts via `MultiuserHarness.seed_private_memory!/3` never appear in mediation draft; `assert_no_leak!/3` for other viewers.
- **Group** — same member types labeled `family vacation` vs `quarterly offsite` → formality/planning differ (`group_context/2`).

## 0.4 Noiseless inference

Authority: `OpalCore.Relationships.Inference` + `ProductSurface.memory_transparency/1`.

- New contacts get **no label** at add time (`Relationships.get_type/2` → `nil`). `set_type` is not required; no onboarding inference ask (`peek_prompt` / `pending_prompt` / `memory_transparency` empty).
- Weak signals → `maybe_infer` returns `{:ok, :insufficient}` — no provisional row, no nag.
- Strong signals (`simulate_weeks_signals(days: 21)`) → provisional `close_friend` with `source: "provisional"` / `inference_status: "pending_confirm"`.
- One-time transparency prompt: `"I think of {name} as a close friend — right?"` via `peek_prompt` then `pending_prompt` (marks `inference_shown_at`). Second `pending_prompt` → `nil` (never re-asked).
- `dismiss` → subsequent `maybe_infer` returns `{:ok, :dismissed, _}` and does not re-prompt.
- `correct` to `friend` → confirmed type + defaults (`planned`/`casual`); `Behavior.plan_proposal_copy` reflects friend in-session.
- `confirm` (A8) → `source: "confirmed"`.

## 0.5 Asymmetry

Labels are **one-directional**. A's type for B never appears in B's contracts.

- A labels B `close_friend`; B labels A `friend` — each side's `Behavior.*` uses **own** type (tone/spontaneity differ).
- `Access.viewer_safe_relationship_contract/2` always has `"their_type_for_me" => nil` and `"asymmetry_visible" => false`.
- `Access.leaks_reverse_label?/2` → false both sides.
- `Relationships.to_contract/1` also forces `"their_type_for_me" => nil`.
- **A7** asymmetric share: close_friend (`:inner`) sees family-scoped plans of the other; friend (`:social`) does not.

## Access A1–A8

Authority: `OpalCore.Relationships.Access`.

| ID | Rule |
|---|---|
| A1 | Spouse (`:inner`) sees partner weekend plan; business cannot unless work-scoped or explicit participant. |
| A2 | Family sees family-scoped reunion; acquaintance cannot; family cannot see outsider `private_1_1`. |
| A3 | `prompt_plan_facts` for business tier strips `personal_context` / personal titles (→ `"shared work plan"`). |
| A4 | `nudge_depth("acquaintance")` → birthday true, gifts/routines false; `close_friend` → all true. |
| A5 | `friend` → `close_friend` same session: spontaneity unlocks, proactive nudge allowed, plan_proposal warms. |
| A6 | `close_friend` → `acquaintance`: `can_see_plan?` weekend personal → false immediately; Behavior copy never contains `"downgraded"`. |
| A7 | Covered with 0.5 + asymmetric family-scope share visibility. |
| A8 | 3 weeks signals → infer `close_friend` → one-time prompt → `confirm` → `source: "confirmed"`. |

AttentionBudget (Asia/Tokyo + established): `relationship_type: "acquaintance"` + nudge → `{:denied, :relationship_bounds}`; `close_friend` → granted.

## Test

```bash
cd apps/opal_core && mix test test/opal_core/relationships/relationship_matrix_test.exs \
  test/opal_core/relationships/relationship_inference_test.exs \
  test/opal_core/relationships/relationship_asymmetry_test.exs \
  test/opal_core/relationships/relationship_access_test.exs
```

Tag: `@tag :relationship_matrix` (module-level `@moduletag`).
