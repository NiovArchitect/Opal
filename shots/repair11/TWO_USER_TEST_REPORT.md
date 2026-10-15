# TWO_USER_TEST_REPORT — Repair #11, Directive §5

**Branch:** `muse/repair-11` · **Date:** 2026-10-15
**Harness:** `apps/opal_core/test/opal_core_web/two_user_plan_lifecycle_test.exs`
**Result:** 11/11 pass.

## Provenance label: LIVE-SESSION (with one stated boundary)

Every test in the harness runs **two distinct, real authenticated Phoenix channel
sessions** against the real backend (Postgres + PubSub):

- User A and User B are **fresh UUID users per test** (no shared fixtures, no seed).
- A's session: `connect(UserSocket, %{"user_id" => a.id, "device_id" => "device-a-2u", ...})`.
- B's session: `connect(UserSocket, %{"user_id" => b.id, "device_id" => "device-b-2u", ...})`.
- Every action attributed to B **genuinely originates from B's session**: B's chat
  messages are `push`ed on B's channel, B's revision confirmations go through
  `push(chan_b, "social_flow:respond_revision", ...)`, and context calls carry B's
  user id explicitly. Nothing about the peer is fabricated.

**Boundary (stated, not hidden):** the sessions are server-side channel-test
sessions, not two physical phones. Transport-level realities (real WebSocket
framing, mobile OS backgrounding, push delivery to a device) are **not** exercised
here — the physical-phone pass remains `NOT_CLAIMED` (founder-only). What *is*
exercised is exactly the layer Repair #11 changed: authentication, channel join,
broadcasts, the deterministic state machine, and the visibility filter — all
against the real backend with two real sessions. No test in this file is labeled
SIMULATED because no peer behavior is simulated; the only simulation is
"network loss" (abrupt channel drop + fresh-session reconnect), which is labeled
inline.

## Scenario coverage (§5.1–12) — all passing

| # | Scenario | Key assertions |
|---|----------|----------------|
| 1 | A invites B; B receives invitation + chat message; B accepts; plan created | B's session gets `social_flow:signal` with the proposal id; B's session gets `message:new` for A's message (sender reconciles via reply; `broadcast_from!` excludes sender); both accept → plan row; both sessions get `social_flow:plan` |
| 2 | A proposes time change; **B confirms on B's own socket** (real client path `social_flow:respond_revision`) | reply `{:ok, "accepted"}`; committed row carries the new time; both sessions observe the plan broadcast; `sync_for_user` for A and B agree field-for-field |
| 3 | A withdraws; B gets the durable notification; B continues; non-lead cancel fails closed | `cant_make_it` → `response_state: "withdrawn"`, `cancels_everyone: false`; plan NOT cancelled; durable `journey.participant_withdrawn` outbox row exists; B still accepted; non-lead `cancel_plan` → `{:error, :not_authorized}`; plan still not cancelled |
| 4 | Both leave and re-enter the thread | fresh sockets, same users → `history:sync` identical and `server_seq`-ordered on both; plan status identical |
| 5 | Reconnect after simulated network loss | abrupt channel drop → fresh sessions → pre-drop message present exactly once; idempotent resend of same `client_message_id` does not duplicate (exactly one `Message` row) |
| 6 | Reversed authority (B organizes, A participates) | full flow mirrored: B proposes, A confirms on A's socket, both syncs agree |
| 7 | B declines the change | revision `rejected`; plan `time_label` unchanged |
| 8 | Double-accept race | concurrent accepts → exactly one `SharedPlan` row |
| 9 | Consumed revision cannot be confirmed twice | second confirm → `{:error, :no_pending_revision}` (exactly-once) |
| 10 | NL "I confirm" routes to the pending revision | `revision_confirmation` result type (no candidate object) → revision accepted, plan updated |
| 11 | Lead cancels the whole plan | `cancel_plan` → status `cancelled`; both sessions observe the push; `notify_user_ids` includes both; durable `plan.cancelled` outbox row |

## Defects the harness found (fixed in this pass — see FAILURE_LEDGER H1/H2)

1. **H1:** the channel visibility filter dropped **all** shared plan signals — no client
   ever received `social_flow:signal` or `social_flow:revision` pushes. Fixed in
   `conversation_channel.ex`; tests 1–2 now assert B's session receives them.
2. **H2:** `revision_confirmation` was unreachable when the classifier omitted a
   candidate object (`{:ok, :no_proposal}`). Fixed in `social_flow.ex`; test 10
   covers it.

Both fixes were verified by full re-runs (loop table in `REPAIR11_REPORT.md`).

## What this harness does NOT claim

- It does not exercise the web/mobile clients (no UI, no real WebSocket transport).
- It does not deliver push notifications to a physical device (phone pass: NOT_CLAIMED).
- It does not test cross-account isolation beyond per-test user freshness (covered
  separately by the per-account isolation tests from the W9 verification).
- Simulated elements are labeled inline (the "network loss" test); nothing else
  in the file simulates a peer.

## How to run

```
export PATH=~/workspace/elixir/bin:$PATH ELIXIR_ERL_OPTIONS="+fnu" LANG=C.UTF-8
cd apps/opal_core
MIX_DEPS_PATH=/tmp/opal_deps MIX_ENV=test mix test test/opal_core_web/two_user_plan_lifecycle_test.exs
```

Result at report time: **11 tests, 0 failures** (8.1s).
