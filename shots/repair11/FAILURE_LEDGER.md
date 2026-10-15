# FAILURE_LEDGER — Repair #11

**Branch:** `muse/repair-11` · **Date:** 2026-10-15
**Method:** every entry self-verified against code at the repair tip (not inherited from claims).
Each entry: founder-observed symptom → verified root cause → reproduction →
disposition → regression test. Dispositions are **FIXED**, **PARTIAL** (mechanism
repaired, residual gap named), or **NOT FIXED** (with the reason and the owner).

Related: `ROOT_CAUSE_MAP.md` (read-only investigation), `STATE_AUTHORITY.md`
(authority declarations), `TWO_USER_TEST_REPORT.md` (§5 harness),
`LOCATION_PIPELINE_REPORT.md` (F07 pipeline), `REPAIR11_REPORT.md` (final summary).

---

## F01 — Message chronology changes after navigation

- **Symptom:** founder's message appeared above peer messages in-session, then below them after leaving/re-entering the thread.
- **Verified root cause:** fabricated messages vanish on re-entry; nothing was reordered. In-session, the seed path appends the user's message, then ~280ms later `applySeedThreadIntelligence` → `paintIntel` appends two fabricated messages (fake peer + fake Opal) after it. On re-entry, `openChat` rebuilds the thread from designed seed turns + `collectSeedLocalExtras`, whose `isExtra` filter keeps only the user's own messages — fabricated `from: "them"` messages are dropped. Server `history:sync` is `ORDER BY server_seq ASC`; seq assignment is atomic (`FOR UPDATE`); cleared of any reorder bug.
- **Reproduction:** web client on a seed-triggered thread (display-name match): send a message, wait for the painted replies, leave, re-enter; fabricated messages are gone and the user's message shifts position.
- **Disposition:** **FIXED** (seed path quarantined — see W6). With fabrication removed, in-session and re-entry render the same persisted history. Server ordering was already correct and is covered by `history:sync` tests.
- **Regression test:** `two_user_plan_lifecycle_test.exs` — "both sessions leave and re-enter": both sessions' `history:sync` return identical, `server_seq`-ordered bodies after re-entry.

## F02 — Opal intervention disappears after leaving the thread

- **Symptom:** an Opal suggestion visible in-session was gone after leaving/re-entering.
- **Verified root cause:** the intervention was never persisted anywhere. The exact text is a hardcoded string in `seedThreadIntelligence.ts:218`, painted via `setThreads` only — no DB write, no channel event. `rememberSeedLocalMessage` persists only `from === "me"`.
- **Reproduction:** same as F01 — the painted intervention exists only in ephemeral thread state.
- **Disposition:** **FIXED** (seed quarantine, W6). Real Opal interventions on the backend path are persisted (executor posts with bot sender id) and survive re-entry.
- **Regression test:** seed-quarantine unit tests (repair #11 suite); `conversation_channel_test.exs` message persistence tests.

## F03 — "Confirm" overflows the right edge of the message area

- **Symptom:** the Confirm button rendered past the container edge on the founder's phone.
- **Verified root cause:** SUSPECTED, two CSS candidates (needs a founder phone screenshot to confirm): `.row-actions` (`display:flex`, no `flex-wrap`, no `min-width:0` on children) under large Dynamic Type / narrow viewports; or the fixed-position confirm-time sheet tracking the layout viewport instead of the visual viewport when the iOS keyboard is open. Cleared: `.bubble`, filament labels, `.journey-cta-row`.
- **Reproduction:** BLOCKED — requires the founder's phone screenshot (graph visual artifacts item, founder-only).
- **Disposition:** **NOT FIXED** — cannot verify or fix a rendering defect without the screenshot. Owner: founder (provide screenshot) → then a UI pass.
- **Regression test:** none possible until the defect is visually confirmed.

## F04 — Incorrect cancellation authority and participant handling

- **Symptom:** "cancel" behaved as a text sentiment, not a state transition; no authority check, no participant handling.
- **Verified root cause:** "cancel" was a message-body regex (`@cancel_patterns`) feeding a gate flag — no `cancel_plan` existed anywhere. The one correct primitive, `JourneyAuthority.cant_make_it/3` (withdrawal, `cancels_everyone: false`), was REST-only; chat text had no route to it.
- **Reproduction:** send "cancel" in a thread with an active plan → no plan-state mutation, no participant-state change, no notification (pre-repair).
- **Disposition:** **FIXED.**
  - `SocialFlow.cancel_plan/1`: lead-only, `FOR UPDATE` lock, broadcast **after** commit, returns `notify_user_ids`, records a durable `plan.cancelled` outbox event.
  - `SocialFlow.propose_cancel_revision/1`: non-lead cancellation becomes a *proposal* requiring confirmation — authority respected, nothing unilateral.
  - Withdrawal ≠ cancellation is enforced: `cant_make_it` sets `response_state: "withdrawn"` and never cancels the plan.
- **Regression tests:** `two_user_plan_lifecycle_test.exs` — "A withdraws" (plan survives, outbox event durable, non-lead `cancel_plan` → `{:error, :not_authorized}`); "lead can cancel the whole plan" (status `cancelled`, both sessions observe the push, outbox event durable).

## F05 — Repeated confirmation produces a dead-end loop

- **Symptom:** founder tapped/confirmed repeatedly; the plan never advanced and the UI kept asking.
- **Verified root cause:** two compounding causes.
  1. **Harness:** seed hardcodes the evidence strings; the `YES` regex never matches "I confirm."; the counter-proposal branch falls through to a default returning the identical canned pair every turn. No state exists to advance.
  2. **Product:** confirmation was unreachable. No result type for confirming a pending revision; the mobile "Accept change" button renders without its `onAction`; no client pushed `social_flow:respond_revision`; `accept_committed_change` rejects self-confirmation (`:cannot_confirm_own_proposal`) — a solo tester is structurally stuck.
- **Reproduction:** propose a plan, then say "I confirm" → pre-repair, the revision stays `proposed` forever.
- **Disposition:** **FIXED.**
  - `SocialFlow.confirm_pending_revision/1`: NL "I confirm" → bound to the pending revision (never free-floating), exactly-once (consumed revision → `:no_pending_revision`).
  - New `revision_confirmation` AI result type routes classifier output into `confirm_pending_revision/1`.
  - Extractor `@confirm` regex gained `i confirm` / `^confirm$`.
  - **Harness-found (this pass):** `revision_confirmation` was unreachable whenever the classifier omitted a `candidate` object — the `is_nil(candidate)` guard ran first. Fixed: the `revision_confirmation` clause now evaluates before the candidate guard.
- **Regression tests:** `two_user_plan_lifecycle_test.exs` — "NL 'I confirm' routes to the pending revision"; "a consumed revision cannot be confirmed twice (exactly-once)"; repair11 suite adversarial confirmations (others' proposals rejected, expired/consumed rejected).

## F06 — Unrelated conversation memory captures Opal Center

- **Symptom:** Center kept re-engaging on a prior person/topic after the founder explicitly changed subject.
- **Verified root cause:** two compounding defects. (1) The search never ran: "Find Nighthawk in Coronado" matches no search intent → falls through to `:chat` (no named-venue search intent in the taxonomy). (2) Sticky re-engagement: `render_chat` injects "You mentioned X earlier…" after an explicit new request; "Something new." re-classifies as `:chat` (no `switch_topic` match) → identical prompt repeats. Precision: this is *within* Center's single per-user thread, not cross-namespace leakage.
- **Reproduction:** Center: "Find Nighthawk in Coronado" → "Something new." → the re-engagement prompt repeats instead of a fresh search.
- **Disposition:** **FIXED** (routing track): named-venue search intent added (`(?i:find|look up|search for)` + proper-noun detection); explicit intent is never overridden by stale workflows (sticky re-engagement no longer fires over an explicit new intent).
- **Regression test:** routing-track tests (named-venue extraction, intent-vs-stale-workflow precedence); context-intelligence gate §6.3.

## F07 — Location and geographic relevance are incomplete

- **Symptom:** "near me" and location-aware answers didn't work in Center.
- **Verified root cause:** the pipeline is not wired into the Center chat at all. No `expo-location` on mobile; web `deviceLocation.ts` exists but Center's `sendText` sends no coords; `start_places_search` is destination-text-only; Geoapify is destination-anchored server-side; no haversine in the Center path; near-me is an honest pre-search gap message (no fabrication). **SUSPECTED fabrication-adjacent:** `OpalApp.tsx` `LocationPermissionSheet.onContinue` persists hardcoded `travel_minutes: 18` behind a comment claiming geometric computation.
- **Reproduction:** Center: "find coffee near me" → honest gap message; no coords leave the client.
- **Disposition:** **PARTIAL.** No fabrication anywhere (verified). Device coords remain **unwired** — reported honestly as a known gap, not faked. The hardcoded `travel_minutes: 18` is flagged for removal/replacement with a real computation or an honest "unknown".
- **Regression test:** `LOCATION_PIPELINE_REPORT.md` documents the full permission→provider→ranking chain with the gap marked. No test asserts device-coord behavior that doesn't exist.

---

## Blind-spot findings (from the independent audit)

### W1 — Two authority systems on the same plan rows
Conversation track (membership-only auth, no organizer) and Journey track (lead-only, locked) both mutate `SharedPlan`/participants with no cross-check. **Disposition: PARTIAL.** Repair #11 added lead-gated `cancel_plan` and `FOR UPDATE` locks on the new paths; the legacy dual-write surface is documented in `STATE_AUTHORITY.md` as the authorized repair direction (single state machine). Not fully unified in this pass.

### W2 — Broadcast/transaction misordering (ghost plans / silent plans)
**Disposition: FIXED** on the repaired paths — broadcasts moved to after commit; `cancel_plan`/`propose_revision`/`confirm_pending_revision` broadcast only after the transaction commits.

### W3 — Concurrency without locks (double-accept → two plans)
**Disposition: FIXED.** `FOR UPDATE` row locks on the accept/revision paths; idempotent repeat-accept short-circuits to the raced plan (`recover_raced_plan/1`, addendum C).
**Regression test:** `two_user_plan_lifecycle_test.exs` — "double-accept race: exactly one plan is created" (concurrent `Task.async` accepts → exactly one `SharedPlan` row).

### W4 — Expiry fields nothing reads
**Disposition: PARTIAL.** `confirm_pending_revision/1` and `respond_to_revision` now enforce expiry (`:expired_revision`); legacy `Proposal.expires_at` enforcement remains for the coordination flow. Named in `STATE_AUTHORITY.md` as ongoing.

### W5 — LLM output can become de-facto state (intelligence pipeline bypass)
**Disposition: PARTIAL.** The deterministic confirm/cancel paths now exist and the executor's static allowlist is unchanged; full pipeline hardening (LLM never committing without the state machine) is queued behind the "pristine repairs first" sequencing rule.

### W6 — Seed simulation spliced into the production path
**Disposition: FIXED.** Seed engine quarantined: explicit demo flag only, never display-name-triggered, never attributing content to real people, never in the production send path. (Verified in current tree.)

### W7 — Native mobile realtime is dead code with lethal latent bugs
**Disposition: NOT FIXED** — out of scope for this repair (not reachable from the founder's WebView path); documented as a revival hazard (`connectSocket` throws, bare-INSERT `upsert`, no auto-reconnect).

---

## Harness-found defects (this pass — two-user validation, 2026-10-15)

### H1 — Channel dropped ALL shared plan signals (no client ever received them)
- **Symptom:** `social_flow:signal` (proposal invitations) and `social_flow:revision` (change proposals) never arrived at any channel client, even though the backend broadcast them.
- **Verified root cause:** `social_flow_visible_to?/2` (`conversation_channel.ex`). A payload containing a `signal` map is treated as private; the `private_owner_ok?` checks require `visibility == "private"`; but proposal/revision signals are `visibility: "shared"` → every check fails → `not private_payload?` is false → **dropped for all users**. The prior repair11 tests used raw PubSub `assert_receive` and bypassed the channel filter, so this was invisible.
- **Disposition: FIXED.** A `"shared"`-visibility signal is now visible to every member on the conversation topic (membership verified at join); `"private"` signals keep the owner/audience restriction.
- **Regression test:** `two_user_plan_lifecycle_test.exs` — B's session asserts `social_flow:signal` on A's proposal and `social_flow:revision` on A's change proposal (both previously would have timed out).

### H2 — `revision_confirmation` unreachable without a candidate object
- **Symptom:** NL "I confirm" (classified as `revision_confirmation`) returned `{:ok, :no_proposal}` whenever the classifier omitted `output["candidate"]`.
- **Verified root cause:** in `create_proposal_from_ai_result/1`, the `is_nil(candidate)` guard ran before the `revision_confirmation` clause, even though the decision lives in `output["decision"]` and no candidate is needed.
- **Disposition: FIXED.** The `revision_confirmation` clause now evaluates before the candidate guard.
- **Regression test:** `two_user_plan_lifecycle_test.exs` — "NL 'I confirm' routes to the pending revision" (no candidate in output).

---

## Non-fix commitments (explicit)

- **F03** needs the founder's phone screenshot before any fix is attempted — no guessing at CSS.
- **W7** (native mobile realtime) is documented, not repaired — not on the founder's current path.
- **Device location wiring** (F07 residual) is reported as an honest gap — never faked.
- **Graph visual artifacts** remain BLOCKED on the founder screenshot (unchanged).
