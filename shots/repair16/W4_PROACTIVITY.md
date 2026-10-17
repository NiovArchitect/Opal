# Repair #16 — Track W4: Proactivity P1–P5

Implements the five deferred proactivity proposals from Repair #15
(`shots/repair15/PROACTIVITY.md`), each only as far as existing consent
lawfully allows. Invariants held: no new notification categories, no
push/email/SMS sends, AttentionAuthority remains the only interruption
decider, gyroscope (no second plan state — every producer reads/writes
the authoritative plan row and its existing projection tables).

## Outcomes

| # | Outcome | Consent basis |
|---|---|---|
| P2 | **Implemented.** Chat plan-lock endpoints drive PlanCompletion post-sync. | The plan is the participants' own confirmed plan (same basis as R15 H1/H2). No new audience or contact. |
| P3 | **Implemented, complete.** Recent-changes producer hooked at every material mutation. | Owner-scoped shell projection of the plan's own people (same basis as H2). |
| P4 | **Implemented for all three kinds**, each from an explicit structured action only. | The user's own explicit in-product commitment actions (below). Weak/chat-text signals register nothing — refusal paths are tested. |
| P5 | **Implemented, pull-side only.** Deterministic preparation inside the celebration curation read path. | User created the celebration; preparation surfaces only when the owner reads it. No push variant (the unanswered consent question) — nothing is written anywhere by a read. |
| P1 | **Caller built and wired, gated OFF by default.** No existing consent setting covers proactive thread initiation (see investigation), so the temporal-anchor caller sits behind an additive opt-in defaulting to false. Remaining: a user/founder enabling `users.proactive_threads_enabled` (via `ProactiveConversation.set_threads_enabled/2`). | Additive setting `proactive_threads_enabled` (migration `20261025010001`), default FALSE = no behavior change for anyone. `proactive_opt_out` still wins when both are set. |

## P1 consent investigation (why no existing setting sufficed)

- Act-on-behalf capabilities (`Consent.act_on_behalf_capabilities/0` =
  `calls_outbound`, `bookings_reserve`, `messaging_business`) govern
  Opal acting on businesses/providers on the user's behalf. None of
  them is consent for Opal to START a personal thread in Opal Center.
- `users.proactive_opt_out` is an opt-OUT layered on initiation law —
  absence of an opt-out is not an opt-in.
- Repair #13's settings audit wired notification/assist/consent
  toggles; none covers proactive initiation.
- Conclusion: additive opt-in, default off. The wired trigger is the
  safest one (`temporal_anchor_3d` for a plan the owner already
  made/confirmed), fired from `PlanCompletion.drive/3` step (g) for
  the plan OWNER only, at most once per plan ever (per-plan dedup
  checked before the 1/day cap), with `maybe_initiate/5`'s closed
  trigger list, cap, quiet hours, 7-day activity gate, opt-out and
  AttentionBudget all still enforced inside.
- `maybe_initiate/5` gained one additive seam: a caller may pass
  `local_hour` (the owner's already-resolved local hour) for its
  quiet-hours check; production callers omit it and the previous
  server-local behavior is unchanged.
- **Latent defect found + fixed:** `ProactiveConversation.set_opt_out/2`
  wrote via a schemaless `"users"` update_all whose binary_id column
  could not bind — the update silently matched zero rows (its blanket
  rescue hid this), so a recorded opt-out never landed. The read side
  (`opted_out?/1`, raw query) was always correct. Both setters now
  write through the `User` schema.

## P2 — chat-born plans run PlanCompletion

`ConversationController.confirm_alignment/2` (exact-time lock) and
`confirm_alignment_place/2` (place confirm) now call
`PlanCompletion.drive/3` for the conversation's active plan AFTER the
alignment result is built — i.e. after the lock's sync transaction
committed. Never inside `sync_conversation`'s fold/sync transaction or
a replayed projection: sync stays a pure read-model fold (a re-sync
drives nothing; asserted in tests). Duplicate lock taps error honestly
(place already locked) and never reach the hook; a second, different
lock re-drives idempotently (calendar per-version upsert, TFT
per plan+version+start key, coming-up per owner+plan key, one live
places search per plan).

Note: drive's participant set is the plan's `PlanParticipant` rows +
creator (R15 semantics, unchanged). A purely fold-born plan without
participant rows projects to its creator; plans created through the
conversation plan path carry participant rows for all members.

## P3 — recent-changes producer (`PlanRecentChanges`)

Repair #13's `PlanTransition` gate is a pure predicate/changeset
guard — it owns no execution context (no actor, no post-change values,
no commit boundary), so it cannot write truthful per-owner copy. The
producer therefore hooks the mutation functions themselves, post-commit,
at every material plan mutation:

- revision accepted & applied (`SocialFlow.respond_to_revision/1`
  applied branch) — schedule copy from the post-apply row, or a
  cancellation for a cancel-kind revision;
- lead direct schedule edit (`SocialFlow.change_plan_schedule/1`);
- journey material change (`JourneyAuthority.material_change/3`,
  material only — copy built from the accepted revision's own
  proposed_changes);
- direct cancel (`SocialFlow.cancel_plan/1`);
- cancel via revision (the applied branch above).

Rejects, partial approvals, non-material journey writes, and refused
mutations record NOTHING (truth law: copy never claims a change that
did not happen). Recipients: PlanParticipant rows + creator, falling
back to conversation members for chat plans without participant rows.
Idempotency: one entry per owner per mutation, keyed by the mutation's
revision id (direct cancel: the terminal-once literal "cancel") —
change→change→cancel sequences record exactly three entries in order.

## P4 — TFT kinds from explicit signals (`FollowThroughProducers`)

- **waiting_on** ← `SocialFlow.confirm_commitment/1`: the user tapped
  "Add as my commitment". Deadline = the commitment's own `due_at`,
  else the plan's canonical start (the commitment is fulfilled BY the
  plan; recorded as `deadline_source` in loop metadata). Completed by
  `FollowThrough.complete_commitment/1`. No deadline anywhere →
  `{:skipped, :no_deadline}`, no loop.
- **open_question** ← `SocialFlow.propose_revision/1` /
  `propose_cancel_revision/1`: the revision names `required_approvals`
  — one blocking loop per approver, completed per-answer (partial
  approval) and on settle (accept-applied / reject). No required
  approvers → `{:skipped, :no_required_approvers}`.
- **execution** ← `ReservationExecution` status writes (provider
  result applied, timeout, cancel): the durable execution row's status
  IS the execution state, mapped into TFT's vocabulary
  (requested/held/reconciling → submitted; confirmed → registered then
  completed; failed / authorization_required carried verbatim;
  cancelled/expired → loop cancelled, even if it had already resolved
  as confirmed — the record must not keep claiming a booking that no
  longer exists). Pre-execution states (checking / available /
  selected / authorized) register NOTHING — availability and
  authorization are not execution (ReservationExecution's own truth
  separation): `{:skipped, :not_execution_status}`.

Chat text never registers any of these: a sync over "I'll know
Friday"-style messages creates zero loops (asserted).

## P5 — celebration preparation

`CelebrationCuration.curate_for/2` (the celebration surface's existing
read path) now returns a `preparation` in both modes, and
`to_contract/1` carries it:

- lead-time band + actions are a pure function of days-until
  (today / tomorrow / this_week ≤7 / soon ≤21 / plenty);
- full mode grounds one action in real shared history (a past plan
  title with that person) and reports `based_on.past_plans_together`;
- basic mode holds no taste/history, so its preparation is honestly
  limited to the band — no invented personalization;
- boundary: suggestions beyond this (generative gift/plan content)
  would require data the curation does not hold; the existing
  template-based gift/plan ideas remain the full mode's ideas, and
  preparation deliberately stays at lead-time + history facts.

Reading writes nothing: no Attention Center item, no TFT loop, no
shell row, no proactive log (asserted as zero-delta on all four).
Non-owners get `{:error, :not_found}` from `curate_for/2` as before —
preparation never leaks.

## Full-suite evidence (2026-10-17)

New tests: 33 (29 in `repair16_proactivity_test.exs`, 4 in
`repair16_chat_lock_drive_test.exs`) — all pass.

Full backend suite on this branch (`mix test --seed 0`, run twice):
2,746 tests (2,713 base + 33 new). The only failures in both runs are
the same three pre-existing wall-clock-sensitive tests, proven
identical on the unmodified base `0abf24a4` under the same clock:

- `ColdStartTest` "new maturity blocks routine_break; time_critical allowed"
- `Phase23FoundationTest` "2.2 Inbox fanout enqueues DeliverPushWorker"
- `CelebrationReminderWorkerTest` "7-day and 1-day milestones → urgent"

Root cause (verified in code, not a W4 regression): `AttentionBudget`
converts UTC to US Pacific local time and applies the founder-default
22:00–08:00 quiet window; both suite runs executed at ~00:40–01:10
Pacific, inside the window, so the budget correctly returns
`{:denied, :quiet_hours}` / defers delivery. These tests pass only
when the suite runs 08:00–22:00 Pacific (as Repair #15's 2,713/0 run
did). A fourth one-off failure in the first run (Postgrex deadlock
inside `FixturesHelper.seed!/0` setup, under heavy multi-worker load)
passed on isolated re-run and did not recur in the second full run.
Net: W4 introduces zero new failures; the branch's failure set equals
the base's failure set under identical conditions.
