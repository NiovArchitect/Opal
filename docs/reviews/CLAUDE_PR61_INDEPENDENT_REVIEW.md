# Claude — Independent Review, PR #61 (Real People and First Alignment)

**Author:** Claude (independent), remote controller mode
**Reviewed against head:** `623cadb9f578f2228a02a135aa023188a6621706`
**Method:** Direct source/diff/migration/test reading in Grok's worktree (`opal-grok-real-people`) and the PR diff, not evidence-doc summaries. CI confirmed green (all 6 checks) at this head.
**Last updated:** 2026-08-07

---

## EXECUTIVE VERDICT

**Do not merge.** Most of this PR is solid — invitation continuation, phone-verify provider gating, and the client-side token handling are all well-built and match their stated requirements. But the feature this PR exists to prove — **mutual Set** — has a real authority gap: the rigorous, fully-tested Set gate function is never called by the code path that actually produces the "Set" label users see, and a user's private "not this time" answer has zero effect on that live path. This is exactly the class of defect the assignment asked me to hunt for, and it's real, not hypothetical.

---

## VERIFIED ISSUES

Only defects confirmed by reading the actual source, not inferred from docs.

### V1 — P0 — `AlignmentState.set_gate_satisfied?/1` is never called in production
`apps/opal_core/lib/opal_core/social_flow/alignment_state.ex` defines a correct, well-tested gate: requires ≥2 distinct members, plan evidence, no cancellation, no block, no private invalidation, and ≥2 distinct affirmatives drawn from current members. I grepped the entire PR diff and the live `lib/` tree for every call site of `set_gate_satisfied?` — the only occurrences outside its own definition are in test files (`alignment_negative_matrix_test.exs`, `alignment_state_and_private_test.exs`, `real_people_two_user_set_journey_test.exs`). **Zero production callers.** The actual "Set" label a user sees comes from `ProductSignals.classify_stage/1`, a separate, simpler function.

### V2 — P0 — The live Set path ignores private invalidation entirely
`PrivateParticipation.invalidates_set?/2` exists specifically to check whether anyone privately answered `not_this_time` or `need_another_time` for a proposal. I grepped the full `lib/` tree — it is called nowhere except its own module. `ProductSignals.classify_stage/1` (the function that actually decides `:set`) never queries it. **A private "not this time" currently has no effect on whether the group sees "Set."**

### V3 — P0 (same root cause as V1/V2) — Live Set path doesn't check membership or blocks
`ProductSignals.classify_stage/1` computes `mutual_affirmatives?/1` by scanning the last 40 messages in the conversation for ready-language regex matches and counting distinct `sender_user_id`s — it does not check current `ConversationMember` status or `TrustSafety.blocked?/2`. A message from a user later removed from the conversation, or later blocked, still counts as one of the two required affirmatives. `set_gate_satisfied?/1` (the unused gate) would have caught this — it takes `member_user_ids` and requires every affirmative to be a current member.

**Net effect of V1–V3:** the correct, defensive Set logic exists side-by-side with the actual, looser logic that ships. This reads like the gate was built first, then `ProductSignals` was extended with its own inline `:set` branch without being wired to it — a classic integration gap, not a design disagreement.

---

## POSSIBLE ISSUES

Reasoned from source, not yet proven with a concurrency test.

### P1 — Rate-limit bucket has a plausible race-condition bypass
`Onboarding.check_rate_limit/3` (pre-existing function, newly load-bearing for OTP start/verify, invite creation, and continuation resume in this PR) does read-then-write against `RateLimitBucket` without a transaction or atomic upsert: `Repo.get_by` → compute `count + 1` in Elixir → `Repo.update`. Two concurrent requests against the same `bucket_key` can both read the same stale `count` and both write `count + 1`, undercounting by up to N−1 for N concurrent requests in the same instant — enough to slip past `@rate_max` before `blocked_until` trips. The table does have `unique_index(:rate_limit_buckets, [:bucket_key, :action])` (confirmed in `20260809000001_create_social_flow_9.exs`), which protects the *first-insert* race but not the *read-modify-write* race on an existing row. Not proven with a load test here — flagging as reasoned-from-source, worth a real concurrency check before this gates OTP verification at scale.

---

## AGREEMENTS

What Grok got right, confirmed by direct reading, not assumed:

- **Invitation continuation is well-built.** Raw share tokens are never persisted — only a SHA-256 digest (`InvitationContinuation.continuation_digest`). Client strips the raw token from the URL immediately via `history.replaceState` and stores only the opaque `continuation_id` in `sessionStorage` (not `localStorage`). Sign-out explicitly clears it (`OpalApp.tsx`, commented "Continuation is ephemeral; never survive sign-out"). Server-side resume checks, in order: rate limit, not-found, already-consumed, expired, wrong-user binding, invitation status (revoked/declined/expired/blocked), blocked relationship both directions, intended-recipient mismatch. Replay after accept/decline is blocked via `consumed_at`. This is genuinely solid.
- **Phone verification defaults are conservative.** `runtime.exs`: production compiled release (`config_env() == :prod`) defaults to **`:disabled`**, not synthetic and not production SMS, unless `OPAL_PHONE_VERIFY_MODE` is explicitly set. Twilio adapter requires explicit env configuration and real credentials neither of which are present in this PR. Twilio is genuinely off, not just documented as off.
- **`PrivateParticipation.assert_shared_safe!/1` is correctly wired at the one place it needs to be** — the HTTP response and the Phoenix broadcast in `ConversationController.private_participation/2` both call it before anything leaves the server, and the broadcast payload only ever contains the pre-stripped `shared_safe` projection plus fixed booleans, never `response_key` or `user_id`.
- **No logging leak found.** Grepped every `Logger.*` call introduced in this PR — all four are in the Twilio adapter (status/error codes only, no phone numbers or codes). Nothing near `private_participation.ex` or the participation controller action logs anything.
- **No Foundation/Kafka/outbox path touched.** This PR doesn't add any new domain event types or touch the outbox — private participation data has no route into the Foundation bridge as it stands.

---

## SET AUTHORITY REVIEW

See V1–V3 above. Restating the mechanism gap plainly: two people typing "works for me" and "I'm in" anywhere in the last 40 messages of a conversation is sufficient for the group to see "Set," even if one of them was later removed or blocked, and even if either of them privately said "not this time" through the dedicated private-participation UI built in this same PR. The private-participation feature and the public Set-signal feature were both built correctly in isolation but were never connected to each other.

## PRIVATE PARTICIPATION REVIEW

Leak surfaces checked directly: HTTP response body (clean — only `shared_safe` + fixed flags), Phoenix broadcast payload (clean, same guard), logs (clean, grepped), migrations/schema (no plaintext reason stored beyond `response_key`, which is itself only one of five fixed enum values, not free text). Not checked / not applicable at this PR's current scope: telemetry events (none introduced by this PR — no `:telemetry.execute` calls added) and outbox/Foundation events (none added, see Agreements). Reconnect-state and conversation-preview leak paths: the private participation store is never read by `signals_for_user_home` or `signals_for_conversation` at all (confirmed — those functions only touch `Message`, not `PrivateParticipation`), so there's no path for a private answer to appear in a conversation preview or reconnect payload today. This is good for privacy but is the same underlying disconnect as V1–V2 — the private store is effectively write-only right now.

## INVITATION CONTINUATION REVIEW

See Agreements. No verified issues. One low-severity note: in `OpalApp.tsx`'s accept-invite handler, `sessionStorage.removeItem("opal_invite_continuation")` runs only after a successful `acceptInvitation` call, not in a `finally` — if `acceptInvitation` throws, the stale continuation id remains in `sessionStorage` until sign-out or tab close. Low severity: the continuation is still single-consumption server-side regardless of what the client caches, and it's tab-scoped. Worth a small cleanup, not a security gap.

## RATE LIMIT REVIEW

See P1 above. Structurally, the same `check_rate_limit/3` bucket mechanism now gates OTP start, OTP verify (implied — not directly re-confirmed line-by-line here, but same `Onboarding` module pattern), invite creation, and continuation resume, keyed as `"sf10:#{action}:#{actor_id}:#{target_id}"`. Per-action, per-actor, per-target keying is the right shape and does prevent simple enumeration (a different target resets the bucket key, so no single global counter to exhaust) — the concern is purely the concurrency race in P1, not the keying design.

## MIGRATION REVIEW

Both new migrations (`20260816000001_create_invitation_continuations`, `20260816000002_create_alignment_private_participations`) are clean: `binary_id` primary keys consistent with the rest of the schema, appropriate `null: false` constraints, correct unique indexes (`continuation_digest` alone; `[conversation_id, user_id, proposal_key]` composite, which correctly enables the upsert-by-lookup pattern in `PrivateParticipation.persist_response/4`), supporting non-unique indexes on `invitation_id`/`expires_at`/`conversation_id` for the actual query patterns used. Both are additive `create table` migrations — no destructive changes, no rewrites of existing tables, trivially reversible.

## COPY REVIEW

Nothing flagged as unclear-speaker or jargon in what this PR changes. Error messages were deliberately flattened to generic phrasing for several distinct failure states (`expired`/`used`/`forbidden`/`blocked`/`not_found` on continuation resume all render as "This invitation is no longer available") — that's a correct security tradeoff (no enumeration oracle), not a copy defect, and it's still plain language a young user could follow. Rate-limit and provider-error copy ("We couldn't send a code right now. Try again in a little while.") is calm and clear, doesn't expose technical cause. `AlignmentParticipation.public_action_labels/0` strings ("I'm in", "Maybe", "Need another time", "Not this time", "Keep my answer private") are plain and unambiguous about what action they represent. No changes needed here.

## HOSTED ADVERSARIAL CHECKLIST

For Grok to execute after CI, before founder review:

1. **Set-authority specific (new, given V1–V3):** two users exchange plan-forming + affirmative messages → confirm Set appears → have one user answer "Not this time" via private participation → **confirm Set is either revoked or never should have appeared** (expected to fail today — this is the point of the check).
2. Same as above, but the second affirmative message comes from a user who was removed from the conversation before the check → confirm Set does not appear (expected to fail today).
3. Same as above, with a blocked relationship between the two speakers → confirm Set does not appear (expected to fail today).
4. Activation → invite → continuation resume → accept → relationship → realtime message exchange → Becoming a plan → Still open → Set, full happy path, as User A and User B in separate browser contexts.
5. User C (not a member) attempts to view the conversation, resume the continuation, or read private-participation state for A/B's conversation — all should be denied.
6. Refresh mid-flow at each stage (post-invite, post-accept, post-Set) — confirm state rehydrates correctly, no stuck spinners, no duplicate conversations.
7. Reconnect after socket drop — confirm no private participation data appears in the reconnect/history-sync payload.
8. Sign out mid-flow — confirm `opal_invite_continuation` is gone from `sessionStorage` and session is fully revoked.
9. Block the other user after Set — confirm Set is no longer shown to either party (or confirm current expected behavior if this is out of scope for this slice — either way, record what actually happens rather than assume).
10. Revoke an invitation after the recipient has minted a continuation but before they resume — confirm resume fails cleanly.
11. Duplicate acceptance: call accept twice in a row (double-click / retry) — confirm idempotent, no duplicate relationship/conversation.
12. Rapid-fire concurrent OTP verify attempts (5–10 in a tight burst) against the same challenge — check whether the rate limiter actually trips at the expected count, given P1.
13. Network tab: confirm no `response_key`, private reason text, or raw continuation token ever appears in a network request/response body visible to a party who shouldn't see it.
14. Browser storage inspection (`localStorage`, `sessionStorage`, cookies) at each stage — confirm no raw phone number, raw continuation token, or private participation answer is ever persisted client-side.
15. URL bar at every stage — confirm the raw `?invite=` token is stripped immediately and never reappears (e.g., on back-navigation).

---

## GROK ACTIONS

### P0
- Wire `AlignmentState.set_gate_satisfied?/1` into `ProductSignals.classify_stage/1` (or replace the inline `:set` branch's logic with a call to it) so the tested gate is actually the live gate.
- Wire `PrivateParticipation.invalidates_set?/2` into that same path so a private "not this time" / "need another time" answer actually suppresses Set.
- Ensure the Set-eligible affirmative check filters to current `ConversationMember`s and checks `TrustSafety.blocked?/2`, matching what `set_gate_satisfied?/1` already requires.
- Re-run adversarial checklist items 1–3 above after the fix — those are the actual proof this is closed, not just that the gate function's own unit tests still pass (they will, since nothing about the gate function itself is broken — it's just unreachable).

### P1
- Harden `check_rate_limit/3` against the read-modify-write race — either an atomic upsert (`Repo.insert` with `on_conflict: [inc: [count: 1]]` targeting the existing unique index) or a `Repo.transaction` with row locking. Confirm with a real concurrent-request test (checklist item 12), not just a sequential one.

### P2
- Wrap `sessionStorage.removeItem("opal_invite_continuation")` in a `finally` (or equivalent) around the `acceptInvitation` call in `OpalApp.tsx` so a failed accept doesn't leave a stale continuation id cached client-side.

If P0 is not fixable quickly, at minimum the ledger and any founder-facing status report should not describe Set as gated/proven until it is — the current evidence docs' framing (mutual, two-distinct-affirmative Set) is accurate about *intent* but not about what's actually enforced end-to-end.
