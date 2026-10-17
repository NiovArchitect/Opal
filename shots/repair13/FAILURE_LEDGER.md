# FAILURE_LEDGER — Repair #13 (hardening for TestFlight)

**Branch:** `muse/repair-13` (from `origin/muse/repair-12` tip `5f170ead`) · **Date:** 2026-10-16/17
**Method:** every entry verified by direct code read with a failing-then-passing regression test (break-fix-break-fix). Fresh randomized accounts for all participant-visible behavior — never fixtures.
**Provenance:** machine-proven, pending founder phone walk.

The F12 list (Repair #12) is the floor — no F12 regressions re-appeared. These are NEW findings from the R13 workstreams:
W1 = 30+ complex user journeys · W2 = sinister attacks + blind-spot sweep ·
W3 = YOU-screen settings audit · W4 = chat redundancies/stuck states/wrong info ·
W6 = gyroscope structural hardening (preventive; detailed in `GYROSCOPE.md`).

---

## F13-01 — propose_revision on a cancelled/completed plan succeeded (fake success) [W2]
**Repro:** `cancel_plan` → `propose_revision` on the cancelled plan returned `{:ok, ...}` — a live proposal on a dead plan.
**Root cause:** `propose_revision/1` checked membership but never plan status.
**Fix:** refuse terminal plans with `{:error, :invalid_status}` (terminal set matches the F12-62 guard; W6's `PlanTransition` gate now owns this structurally).
**Test:** `repair13_sinister_test.exs`.

## F13-02 — accepting a superseded revision silently regressed the plan [W2]
**Repro:** rev1 (8:00 PM) proposed, rev2 (9:00 PM) proposed and accepted → plan at 9:00 PM; accepting rev1 afterwards flipped the plan back to 8:00 PM. Reachable via channel (client-supplied `revision_id`) and the mobile "Accept change" button on a stale card.
**Root cause:** nothing ever wrote the `"superseded"` status the schema already had.
**Fix (invariant layer):** `apply_locked_revision` retires all other live proposals to `"superseded"` in the same transaction and retires their visible signals (no dead "Accept change" buttons); later accepts hit `status == "proposed"` → `:forbidden`.
**Test:** `repair13_sinister_test.exs` (retirement + refused re-accept + sibling-lifecycle guard).

## F13-03 — get_plan_for_user forbade a Center plan's own owner [W2]
**Repro:** Center-created plan (nil `conversation_id`) → `get_plan_for_user(plan.id, owner_id)` returned `:forbidden` for the creator.
**Root cause:** membership check on nil `conversation_id` could never match; predated `ensure_plan_access/2`.
**Fix:** route through `ensure_plan_access/2`; public contract unchanged.
**Test:** `repair13_sinister_test.exs`.

## F13-04 — plan_modify backstop pointed at a fictional Graph confirm action [W2, refined W4]
**Repro:** "cancel the Oak plan" → "Open it on your Graph to confirm — chat cancels aren't live yet." Both claims false: the Graph has no cancel/confirm action, and chat move/change/cancel are live since R11/R12.
**Root cause:** stale copy predating the repairs.
**Fix:** backstop rewritten for the unified chat pipeline (which routes through `ActionOrchestrator`, where W4 built real modify/cancel execution): actionable retry phrasing, never a fictional destination, never "aren't live".
**Test:** `opal_response_test.exs` (merged F13-04/W4-2 contract).

## F13-05 — modify verbs lost to the plan_create trigger [W2]
**Repro:** `classify("cancel all plans")` → `:plan_create`; `classify("change the dinner plan")` → `:plan_create`.
**Root cause:** `@plan_create_trigger` matches bare `\bplans?\b` and `try_plan_create` ran before `try_plan_modify`.
**Fix:** `try_plan_modify/2` runs before `try_plan_create/2`; pure creations unaffected.
**Test:** `opal_intent_test.exs`.

## F13-06 — open-chat NL invented meridiem ("Saturday after 10" → "after 10 PM") [W1]
**Repro:** "Saturday after 10" mutated the plan to "after 10 PM"; "around 8" → "about 8:00 PM"; "make it 8" → "8:00 PM". `nl_schedule_label/1` passed interpreter summaries straight through and `DateTimeChange` defaults missing meridiem to PM.
**Root cause:** no meridiem-signal check before pinning AM/PM — the exact invention family the R2 bare-hour law was meant to kill.
**Fix (invariant layer):** refuse `{:error, :no_time_found}` when the utterance carries no meridiem signal but the interpretation pins AM/PM. Extends the pinned R2 law to the whole invention family.
**Test:** `repair13_w1_journeys_test.exs` (J4 battery: 7 explicit-meridiem apply, 7 meridiem-less honestly refuse; 111/111 across W1+R4+R12-coherence files).

## F13-07 — follow-up "make it 8 PM" did nothing; saying "yes" twice made two plans [W4]
**Repro:** after creating a plan, "Actually make it 8 PM" went stale (PlanningContext never got `plan_id`); saying "yes" twice created two plans (`pending_plan_create` never consumed the ask).
**Root cause:** `generate_with_side_effects` didn't merge `plan_id` into PlanningContext on `:plan_confirm`; `pending_plan_create` used `Enum.find_value` (always newest ask, never consumed).
**Fix:** merge `plan_id` on successful confirm; rewrote ask-consumption with `reduce_while` (consumed on affirmation + successful confirm; failed confirm leaves ask pending for retry).
**Test:** `repair13_w4_chat_test.exs` (W4-1, W4-1b, W4-1c).

## F13-08 — "cancel the dinner plan" had no execution path; "move dinner to Saturday" dead-ended [W4]
**Repro:** "cancel the dinner plan" → no cancel path (also misclassified `:plan_create` per F13-05); "move dinner to Saturday" with expired/no sticky plan_id → dead-end.
**Root cause:** no `:plan_modify`/cancel branch in `after_classify`; `handle_when_correction` requires `plan_id_active?`.
**Fix:** `try_plan_modify` before `try_plan_create` (shared with F13-05); new `plan_cancel_turn?` → `handle_plan_cancel` → real `SocialFlow.cancel_plan` with honest copies; new `plan_modify_correction_turn?` → owner-scoped `resolve_plan_ref_to_id` (unique-best/tie/no-match) → existing `handle_when_correction`; clears sticky plan_id. This fix also closed the pre-existing baseline OC-3/OC-4 failures.
**Test:** `repair13_w4_chat_test.exs` (W4-2, W4-2b, W4-2c, W4-2d).

## F13-09 — double-tap POST duplicated the message and re-ran the pipeline [W4]
**Repro:** retrying a Center POST duplicated the user message and re-executed the pipeline.
**Root cause:** `create_user_message` had no idempotency key.
**Fix:** additive migration (nullable `client_message_id` + partial unique index); `find_idempotent_pair` pre-check; race-losers route to the winner's triple; controller passes `client_message_id`.
**Test:** `repair13_w4_chat_test.exs` (W4-3, W4-3b).

## F13-10 — sticky "You mentioned X earlier" hijacked direct questions [W4]
**Repro:** direct questions falling to `:chat` got the sticky `recent_who` re-engagement instead of an answer.
**Root cause:** `render_chat` sticky branch fired regardless of turn shape.
**Fix:** sticky branch now requires `not question_shaped?(lower)`.
**Test:** `repair13_w4_chat_test.exs` (W4-4 through W4-4d).

## F13-11 — "Who's coming?" / "Where is dinner?" → "Tell me more" dead-ends [W4]
**Repro:** person/place questions about plans dead-ended; "where is The Henry" risked misrouting.
**Root cause:** Oracle had no person/place question kinds; no place-question path.
**Fix:** new `:plan_attendees`, `:plan_organizer`, `:plan_place` Oracle kinds answered from real `PlanParticipant`/`SharedPlan` rows (owner-scoped); `:oracle`/`:recall` added to the template-only list so the LLM can't rewrite grounded facts; proper-noun venue questions stay `:named_venue`.
**Test:** `repair13_w4_chat_test.exs` (W4-5 through W4-5f).

## F13-12 — "Remind me to X" → "Tell me more" dead-end [W4]
**Repro:** reminder requests dead-ended.
**Root cause:** no reminder execution path exists in Center.
**Fix:** honest refusal with a redirect ("I can't set reminders yet — want me to help you plan it instead?"). No fake success.
**Test:** `repair13_w4_chat_test.exs` (W4-6, W4-6b).

## F13-13 — mobile YOU screen fabricated device/block counts [W3]
**Repro:** Devices card showed hardcoded `deviceCount={1}` → "1 active session(s)"; Safety card showed hardcoded `blockCount={0}` → "No active blocks".
**Root cause:** decorative props with invented numbers.
**Fix:** props removed; cards now read "This phone / Active session" and "Quiet safety controls / Blocking stays private" — true statements, no false counts.
**Test:** `settingsWireClass.test.ts` (Repair #13 guard: no fabricated counts).

## F13-14 — dead Engagement/Safety settings screens [W3]
**Repro:** two settings screens unreachable from the YOU hub (no hub row, no `onOpenSetting` path, no deep link) rendering exactly one note and zero controls.
**Root cause:** dead surface definitions.
**Fix:** removed per the founder's no-dead-surface law (screen defs, keys, figma map, semantic mapping).
**Test:** `settingsWireClass.test.ts` (dead screens gone).

---

## W3 settings audit — full verdicts
Every YOU-screen control traced UI → handler → persisted setting → behavior. **WIRED and proven by test (17 new backend tests):** profile name/handle save, memory forget, relationship-type picker, trust-tier grant/revoke, celebrations CRUD + curation, home timezone, assist-on-calls consent, graphing pause/modes/per-person grants, act-on-behalf consent gates (calls_outbound, bookings_reserve), message/call notification toggles, read-receipts toggle, spending profile, invite links, appearance picker, fit preferences, delete-account honesty. **HIDDEN (not painted, kept in inventory):** controls whose backing APIs are not shipped — never shown as live. **NOISE trimmed** across 20+ copy sites (plain hyphens, no em-dashes). Full inventory: `SETTINGS_AUDIT.md`.

## W6 gyroscope — structural prevention (see GYROSCOPE.md)
`SocialFlow.PlanTransition`: one gate owning every plan/proposal/revision transition, wired at 21 writer sites (JourneyAuthority shares the table); terminal states have no outbound rows. `SocialFlow.PlanProjection`: single-store registry test fails the build on unregistered plan-table readers + ETS shadow-copy scan; SocialMemory recall cache now invalidated post-commit on both broadcast and journey tracks. `journey_guard_test.exs` (22 tests): permanent regression gate over the F11/F12 classes. Python evaluation: NO Python build — `services/opal_ai` is stateless by design; a Python-side check would duplicate the transition table (two sources of truth). "Python proposes candidates only. Elixir owns truth."

## Noted, not fixed (pre-existing / product decisions)
- `classify("Any upcoming plans?")` → `:plan_create` instead of `:check_status` (baseline failure; orthogonal question-detection issue for a future classifier pass).
- Withdrawn participants still block proposal consensus (`required_approvals` has no withdrawal filter) — revision sits honestly `"proposed"`; product decision for the founder; test pins current behavior.
- `mix precommit` fails repo-wide on pre-existing `--warnings-as-errors` in untouched files; R13 files are warning-clean.
- Live Geoapify provider results untested (no key in this environment); near-me provider leg honestly records `"no_provider"`.
