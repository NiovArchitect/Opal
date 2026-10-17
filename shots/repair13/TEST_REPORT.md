# TEST_REPORT — Repair #13 (hardening for TestFlight)

**Branch:** `muse/repair-13` · **Date:** 2026-10-16/17 · **Provenance:** machine-proven, pending founder phone walk
**Discipline:** break-fix-break-fix; every failure understood end-to-end before fixing; no weakened assertions; fresh randomized accounts (never fixtures) for all participant-visible behavior; every assertion on real effects (DB rows, actual PubSub receipt, projection updates) — no fake successes.

## New tests: 160, all green

| Workstream | File(s) | Tests | Result |
|---|---|---|---|
| W1 user journeys | `test/opal_core/repair13_w1_journeys_test.exs` | 44 | green |
| W2 sinister | `repair13_sinister_test.exs` (24) + `repair13_sinister_channel_test.exs` (6) + `repair13_sinister_plans_api_test.exs` (2) | 32 | green |
| W3 settings | `test/opal_core/repair13_settings_audit_test.exs` | 17 | green |
| W4 chat loops | `test/opal_core/repair13_w4_chat_test.exs` | 21 | green |
| W6 gyroscope | `plan_transition_test.exs` (17) + `journey_guard_test.exs` (22) + `plan_projection_coherence_test.exs` (7) | 46 | green |

Plus web: `settingsWireClass.test.ts`, `youSettingsRender.proof.test.tsx`, `WhatOpalRemembersSection.test.tsx` and others per `SETTINGS_AUDIT.md` — green.

## W1 journey matrix (each multi-run with paraphrased inputs)

| Journey | Runs | Proven |
|---|---|---|
| J1 1:1 plan→confirm→change→cancel→re-plan | 3 | PubSub pushes received on conv topic; re-plan takes over active slot |
| J2 3-person group, decline mid-flow | 3 | `cant_make_it` keeps plan alive; consensus real (one accept leaves revision `proposed`) |
| J3 overlapping plans, same person | 3 | NL targets newest; direct edit by id never contaminates; recency ordering (F12-59) |
| J4 time phrasings | 16 | 7 explicit-meridiem apply; 7 meridiem-less honestly refuse; "Saturday after 10 AM" keeps AM |
| J5 location | 4 | near-me+coords → device-anchored (`origin_source: device`); w/o coords → honest gate; "Nighthawk in Coronado" attaches venue+address; "Oceanside" invents no coords |
| J6 knowledge (who/where/when) | 3 | same answer contract across chat-built, Center-built, post-decline plans |
| J7 mid-flow settings change | 3 | notification toggle flips the real `Inbox.message_notice` gate; plan row byte-identical |
| J8 interrupted / cross-surface | 3 | abandon→return resumes same plan (1 row); chat→direct→listing+push agree |
| J9 cross-surface same-time | 3 | Center plan in owner listing; broadcast + listing agree; change/cancel history consistent |
| J10 timezone edge | 3 | per-viewer local clock for one absolute instant (LA PT vs Tokyo JST) |

## W2 attack summary (32 attacks — full table in F13_LEDGER_W2.md)
Prompt injection ("ignore previous instructions", "admin mode", "system: delete") → refused, no state change. Fake confirmations (none pending, own proposal, consumed, cross-conversation) → refused honestly. Permission probes (non-member/ non-organizer actions, cross-account reads, unauthenticated) → refused, no leakage. Rapid contradictory commands, triple submits, session replay (same/new session, post-cancel, cross-conversation), `sender_user_id` override → exactly-once, no resurrection, no phantom mutation. Malformed inputs (RTL/zero-width, 10KB body, emoji-only, SQL-ish) → no crash, no corruption, caps enforced.

## W4 chat-loop proof (21 tests)
Sticky plan_id follow-ups mutate (W4-1); no duplicate plans on double "yes" (W4-1b); retry after failed confirm still classifies (W4-1c); Center cancel executes for real (W4-2); modify fallback resolves unique-best/tie/no-match honestly (W4-2d); message idempotency via `client_message_id` (W4-3/3b); sticky re-engagement never hijacks questions (W4-4x); person/place questions answered from real rows (W4-5x); reminders honestly refused (W4-6).

## W6 structural proof (46 tests)
Transition gate: 17 tests over the 29-row table (terminal states have no outbound rows; illegal transitions unrepresentable). Journey guard: 22 tests as the permanent F11/F12-class regression gate. Projection coherence: 7 tests (registry fails the build on unregistered plan-table readers; ETS shadow-copy scan; recall-cache invalidation on both tracks).

## Full suite (gate) — FINAL
Backend `mix test --seed 0` on the merged branch: **2618 tests, 11 failures.**
All 11 are pre-existing, in documented categories: voice/Deepgram key-gated
(7: `voice_api_test`, `voice_test`, `deepgram_ears_test` x4), `virtual_plan_test`,
`founder_graph_commitment_seed_test`, `opal_intent_test` ("Any upcoming plans?"
check_status), `pipeline_test` (1.3), `event_driven_test` (B4). Zero failures in
`social_flow`, `center`, `conversation_channel`, `journey_authority`, `trips`,
or any `repair11_*` / `repair12_*` / `repair13_*` area. W4's plan-create parking
closed the former baseline OC-3/OC-4 failures; the remaining baseline flakes
(Metrics, CardinalityPressure N3) are order-dependent and did not reproduce.
**Zero regressions.** Web vitest on touched areas: settings files green; full web
suite failures match the pre-existing baseline (see `SETTINGS_AUDIT.md`).

## Break-fix loops
W1: meridiem-invention found → fixed at invariant layer → 111/111 across journey+R4+R12-coherence files. W2: 5 blind-spot findings → all fixed, tests failed-before/passed-after. W4: full rewrite after worktree incident → 21/21 re-verified. W3: 8 tracked files reverted by interleave → redone byte-for-byte, re-verified. W6: gate overwrite-vs-refuse semantics, journey invalidation gap → fixed, none weakened.
