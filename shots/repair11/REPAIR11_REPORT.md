# Repair #11 — Final Report: Fix-Test-Fix-Test Loops to Green + Two-User Validation (§5/§6)

**Date:** 2026-10-15
**Branch:** `muse/repair-11` @ `4b66ac3d` (after `909472d6` merged tracks + `1bf051e0` integration)
**Toolchain:** Erlang OTP 25.3.2.8 + Elixir 1.17.3 (project CI pins OTP 27.2 — flagged as drift) + Postgres 16
**Result:** 79/79 Repair #11 tests pass. Two-user harness: 11/11 pass. Full suite: 2330 tests, 26 failures — all 26 verified pre-existing.

## Loop discipline (honest iterations)

### Phase 3 loops (from prior report — preserved)

| Loop | Tests | Failures | What broke | What fixed it |
|------|-------|----------|------------|---------------|
| 1 | 79 | 15 | Regex `*{0,3}` compile error (whole app); `{:error,{:error,_}}` double-wrap ×5; `:invalid_status` on converted proposals; non-UUID test ids; `ensure_safe_sender` leaked `:opal_sender_not_configured`; "I confirm" never classified | See fixes below |
| 2 | 79 | 9 | Named-venue case fix worked; double-wrap fixed; converted short-circuit worked | Fixed UUIDs, sender safety |
| 3 | 79 | 8 | Decision/Event FK; contradictory test assertion | Persisted Event+Decision; aligned test with addendum C |
| 4 | 79 | 1 | "I confirm" not in extractor `@confirm` regex | Added `i confirm` / `^confirm$` |
| 5 | 79 | 0 | — | GREEN |

### Two-user harness loops (§5 — this pass)

| Loop | Tests | Failures | What broke | What fixed it |
|------|-------|----------|------------|---------------|
| 6 | 11 | 11 | `normalized_time_candidates` needs `%{"label" => _}` maps, not strings | Fixed test helper payload |
| 7 | 11 | 7 | **H1:** `social_flow:revision` never arrived — channel `social_flow_visible_to?/2` drops ALL shared signals | Fixed visibility filter (shared → visible to topic members) |
| 8 | 11 | 5 | Push payloads are envelopes (`%{"payload" => ...}`), not inner payloads; `message:new` uses direct broadcast | Fixed test assertions |
| 9 | 11 | 4 | **H2:** `revision_confirmation` → `{:ok, :no_proposal}` when classifier omits candidate | Moved clause before `is_nil(candidate)` guard |
| 10 | 11 | 3 | `cant_make_it` returns string keys; `leave/1` needs channel-pid unlink; `leave` returns ref not `:ok` | Fixed test mechanics |
| 11 | 11 | 1 | `broadcast_from!` excludes sender — only one `message:new` per send | Fixed assertion count |
| 12 | 11 | 0 | — | GREEN |

Two of the twelve loops found **real product bugs** (H1, H2), not test bugs. Both
fixed, both re-verified by full re-runs. See `FAILURE_LEDGER.md` H1/H2.

## Fixes applied (all verified by test execution)

1. **`opal_intent.ex` — named-venue regex compile error.** The routing track shipped `~r/...([A-Z][\w'&.]*(?:\s+[A-Z][\w'&.]*)*{0,3})/` — `*{0,3}` is "nothing to repeat" (Regex.CompileError). The entire `opal_core` application did not compile. Fixed to `{0,3}`.
2. **`opal_intent.ex` — named-venue verb case-sensitivity.** `(?:find|look\s+up|search\s+for)` was lowercase-only with no `i` flag; "Find Nighthawk" (capital F, the normal case) never matched. Fixed with `(?i:...)` group; the proper-noun `[A-Z]` detection stays case-sensitive.
3. **`social_flow.ex` — error double-wrapping (×5).** `{:error, _} = err -> Repo.rollback(err)` produced `{:error, {:error, :not_a_member}}`. Fixed to `Repo.rollback(reason)` (unwrap before rollback) in `approve_coordination`, `respond_to_option`, `respond_to_revision`, `apply_revision`, `propose_revision`.
4. **`social_flow.ex` — idempotent opportunity taps.** `respond_to_option` rejected repeat accepts on converted proposals with `:invalid_status` before reaching the conversion guard. Added a short-circuit: `converted` status → `recover_raced_plan/1` → `{:ok, %{plan: same_plan}}`. Satisfies founder addendum C. One contradictory test assertion aligned with addendum C (repeat accept resumes; re-approve still `:invalid_status`).
5. **`executor.ex` — `ensure_safe_sender/1` fail-closed.** Returned `{:error, :opal_sender_not_configured}` when env unset; now returns `{:error, :unsafe_sender}` (single refusal shape for callers).
6. **`extractor.ex` — "I confirm" classification.** The `@confirm` regex had no `confirm` alternative, so NL "I confirm" never became `plan.confirm` and the end-to-end confirm path was unreachable. Added `i confirm` and bare `^confirm$`.
7. **Test hygiene (no weakened assertions).** `bot-repair11` and `d-*-1` ids → valid UUIDs (`User.id`/`Decision.id` are `:binary_id`); `decision!/5` now persists `Event` + `Decision` rows (FK constraint).

## Regression verification

Full suite (`mix test`, seed 0): **2330 tests, 26 failures** (was 2319 + 11 new two-user harness tests = 2330). Failure list extracted and compared: **0 failures in `social_flow`, `conversation_channel`, or `two_user` areas.** The 26 are the same pre-existing set as the baseline — Voice/Deepgram key-gated (7), Relationships (4), MultiuserPressure/AttentionBudget/Coordinator (8), Metrics (1), and the 6 in `opal_intent`/`pipeline`/`opal_conversations`/`virtual_plan`/`founder_graph_commitment_seed` that fail identically without these changes (verified in the prior pass). **Zero regressions introduced. CAPABILITY_LOSS=0, PRIOR_GREEN_REGRESSIONS=0.**

## Adversarial coverage (in the 79)

Confirming others' proposals (rejected), confirming own/expired/consumed (rejected, exactly-once), canceling others' plans (rejected), non-participant actions (rejected), double-tap idempotency (one effect), concurrent accepts (one plan, loser resumes), cross-thread isolation (conversation-scoped), stale/superseded proposals (rejected with clear state), seed-mode quarantine (unit-tested), attribution (bot sender + marker), permission boundaries (fail closed), adversarial language ("cancel all plans" → safe), reconnect/replay (idempotency keys), durable notifications (outbox, not just PubSub).

## Directive §6 — regression gate results

| Gate | Result | Evidence |
|------|--------|----------|
| (1) Deterministic state — owners, valid states, auth rules, idempotent handling | PASS | Two-user harness tests 1–3, 8–11; repair11 adversarial suite |
| (2) Persistent conversation — survive navigation/reload/reconnect | PASS | Harness tests 4–5 (leave/re-enter, network-loss reconnect); `history:sync` ordering |
| (3) Context intelligence — mixed-intent, explicit intent never overridden by stale workflows | PASS | Routing-track tests (named-venue intent, intent-vs-stale-workflow precedence) |
| (4) Participant sync — two sessions, same authoritative state, appropriate notifications only | PASS | Harness tests 1–2, 6 (both syncs agree; H1 fix = notifications now actually delivered) |
| (5) Geographic intelligence — device vs manual origins distinguished | **GAP (honest)** | `LOCATION_PIPELINE_REPORT.md`: device coords unwired end-to-end; no fabrication; near-me is an explicit gap message |
| (6) Physical phone | **NOT_CLAIMED** | Founder-only; unchanged |
| (7) No regression | PASS | 2330 tests, 26 failures — all pre-existing, none in touched areas |

## Environment notes

- `/home/hatch` is an overlayfs mount where `chown` is blocked even as root; Elixir's `File.cp` (which preserves ownership) fails there. Workaround: `MIX_DEPS_PATH=/tmp/opal_deps` (deps compile on /tmp where chown works). Project source stays in workspace.
- `mix.exs` lives in `apps/opal_core` (no umbrella root).
- OTP version drift: CI pins OTP 27.2; VM has OTP 25 (Ubuntu). Elixir 1.17 supports OTP 25; all tests pass, but flag for CI.

## Remaining gaps (explicit non-claims)

- **Graph visual artifacts (item E):** BLOCKED on founder phone screenshot — no fix attempted without it.
- **Prod `OPAL_INTELLIGENCE_SENDER_USER_ID`:** value invisible — founder-only.
- **Device location wiring:** unwired end-to-end — reported honestly, never faked (`LOCATION_PIPELINE_REPORT.md`).
- **Physical phone pass:** NOT_CLAIMED — founder-only.
- **F03 (Confirm overflow):** needs the founder's phone screenshot before any fix.
- **W7 (native mobile realtime dead code):** documented as a revival hazard, not repaired (not on the founder's path).
- **W1/W4/W5 residuals:** dual authority tracks not fully unified; legacy proposal TTL; intelligence-pipeline hardening — queued behind the "pristine repairs first" sequencing rule.
- Push `muse/repair-11` to origin (this report covers through `4b66ac3d`).
- BLOCKED items (unchanged): no bot `is_bot` flag (product decision); no true `message_type: "system"` without migration (product decision).
