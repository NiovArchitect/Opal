# TEST_REPORT_W1  -  Repair #13 worker W1: complex normal-user journey tests

**Branch:** `muse/repair-13-w1` · **Date:** 2026-10-16
**File:** `apps/opal_core/test/opal_core/repair13_w1_journeys_test.exs` (44 tests)
**Status:** machine-proven, pending founder phone walk

## Method

44 multi-step journey runs, each on FRESH randomized accounts (generated
display names + UUID handles, never fixtures, never hardcoded personas),
with paraphrased NL inputs and reordered steps. Every assertion checks a
REAL effect: DB row state, the other session receiving the PubSub push, the
projection actually updating. `async: false` (PubSub + inline Oban).

## Per-journey results

| Journey | Runs | Paraphrases / variants | Result |
|---|---|---|---|
| J1 1:1 plan→confirm→change→cancel→re-plan | 3 | "let's do 8 PM" / "push it to 1:30 PM" / "actually let's do 10:30 AM"; propose+confirm, direct change, reject-then-change | 3/3 green |
| J2 3-person group, decline mid-flow | 3 | decline after full consensus / decline first / peer rejects proposal | 3/3 green |
| J3 overlapping plans, same person | 3 | NL targets newest / direct edit of older by id / cancel newest, third takes over | 3/3 green |
| J4 time phrasings | 16 | 7 explicit-meridiem apply; 7 meridiem-less refuse honestly; "next Friday evening" date-only; "Saturday after 10 AM" explicit | 16/16 green |
| J5 location | 4 | near-me with coords / near-me without coords / "Nighthawk in Coronado" / "somewhere in Oceanside" | 4/4 green |
| J6 knowledge questions (who/where/when) | 3 | chat plan + venue / Center plan / group after decline+change | 3/3 green |
| J7 mid-flow settings change | 3 | message_notifications off/on / read_receipts off / peer disables then cancel | 3/3 green |
| J8 interrupted flows + cross-surface edits | 3 | abandon/return no-dupe / chat→direct→listing+push / Center→share→edit | 3/3 green |
| J9 cross-surface, same time everywhere | 3 | Center plan in listing / user-topic broadcast + listing agree / 2 changes + cancel history | 3/3 green |
| J10 timezone edge | 3 | LA vs NY / plan-tz does not move instant / UTC viewed LA vs London | 3/3 green |

## Bugs found (root cause → fix → test)

### W1-01  -  open-chat NL invented AM/PM for meridiem-less phrasings
**Found by:** J4 honest-refusal battery.
**Root cause:** `SocialFlow.nl_schedule_label/1` (the open-chat NL → schedule
authority path) passed `DateTimeChange.interpret/3` summaries straight to
`change_plan_time`. The interpreter defaults a missing meridiem to PM
(`meridiem/2`), so "Saturday after 10" became "after 10 PM", "around 8" became
"about 8:00 PM", and "make it 8" became "8:00 PM"  -  the plan mutated with an
invented half-day. Only the bare-hour sentence ("actually let's do 8") was
protected, by accident of the `clock?/1` regex, not by a rule.
**Fix (invariant layer):** `nl_schedule_label/1` now refuses
`{:error, :no_time_found}` when the utterance carries no meridiem signal but
the interpretation pins AM/PM  -  extending the pinned R2 bare-hour law
("AM/PM never invented") to the whole invention family. The signal reader
(`user_meridiem_signal?/1`) mirrors `DateTimeChange.meridiem/2` itself
(substring "am"/"pm" on downcased text plus a.m./p.m. collapsing), so the
guard agrees with the parser about what counts as said: "8pm" and "8 pm"
both read as PM to the parser and both count (an early word-boundary-only
version regressed "move it to 8pm" / "Saturday at 7pm" and was corrected
before commit). The scoped fold/editor path calls `interpret/3` directly and
is untouched.
**Tests:** J4 meridiem-less battery (7 refusals, no mutation, no revision
row); 7 explicit-meridiem phrasings still apply; R4's 6-phrasing battery and
the R12 coherence battery still green (111/111 across the three files).

### W1-02 (test-harness corrections, NOT product bugs)
While writing the journeys, the tests initially asserted wrong shapes and the
product corrected them; each was verified end-to-end before fixing the test:
- `respond_to_revision` accept path broadcasts `"social_flow:plan"` (with the
  accepted revision), not `"social_flow:alignment_updated"` (direct-edit only).
- `confirm_pending_revision` returns `%{revision_id:, status:}` with the live
  status; in a 3-person group one accept leaves `"proposed"` until all required
  approvals land  -  real consensus, asserted honestly in J2.
- `respond_to_revision` reject returns the `%PlanRevision{}` struct directly.
- `JourneyAuthority.cant_make_it` returns string-keyed maps.
- `active_plan_for_conversation` orders by `updated_at` (F12-59 single
  ordering): directly editing the older overlapping plan makes it the active
  one by recency; the other plan is never touched.
- Oban runs `:inline` in test: the near-me provider leg executes and records
  an honest `"no_provider"` failure (no Geoapify key in this environment)  - 
  no fabricated venues.

## Discovered edge (flagged, NOT changed)

**Withdrawn participants still block proposal consensus.** In J2 run 2, after C
withdraws via `cant_make_it`, B's proposal still lists C in
`required_approvals` (computed from conversation members, no withdrawal
filter), so the revision sits honestly `"proposed"` until C decides  -  the plan
does not move. No crash, no silent majority override. Whether a withdrawn
participant should keep veto power is a product decision; the test pins the
current real behavior. The lead's direct-edit path still serves the remaining
participants.

## Full suite

- Pristine R12 tip on this VM (`--seed 0`): **2456 tests, 15 failures**.
  (The R12 report's "26 pre-existing" does not reproduce here; the delta is
  seed/environment, not code  -  this clean-tree run is the ground truth for
  this machine.)
- This branch (final confirmation, `--seed 0`): **2500 tests, 15 failures** -
  byte-identical to the pristine baseline list. Zero new failures. All 44 new
  journey tests green; R4 multirun (29) + R12 coherence (38) batteries green
  with the fix. (An intermediate run showed a 16th failure, "WHO preserved
  across destination extraction" in `PlanningContextTest`; that test touches
  only `PlanningContext.merge`, a module this work does not modify, and it
  passes in isolation across seeds - order-dependent flake, absent from the
  final confirmation run.)

## Working-tree incident (2026-10-16, during verification)

A cross-worker `git stash` race on the shared repo: this worker stashed to
run a clean-tree baseline; worker W4 popped this worker's stash into
`wt-r13-w4`, and this worker popped W4's stash into `wt-r13-w1`. Recovered
fully: W4's stashed work was saved untouched to `/tmp/w4_recovery.patch`
(616 lines: YouScreen.tsx, AppShell.tsx, OpalApp.tsx, settingsWireClass.*,
EXTRACTION_VERIFY.json, perf_ms.txt) before the tree was restored; this
worker's files were copied back from `wt-r13-w4` (test file, report) and the
`social_flow.ex` hunk re-applied via patch; journey tests re-verified green
after restore. Lesson: coordinate stash usage across workers sharing one
repo, or avoid `git stash` for baseline runs (use a pristine worktree
instead).

## Non-claims

Phone pass NOT_CLAIMED. Live Geoapify results untested (no key in this
environment; the `"no_provider"` honest-failure path is what is proven).
