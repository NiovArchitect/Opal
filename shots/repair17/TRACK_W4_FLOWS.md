# Repair #17 - Track W4: Backend Conversation Coherence

Branch: muse/repair-17-w4 (from R16 tip 2c1bdcd2). Backend only: apps/opal_core.
All fixes are on the real backend path (channels, contexts, HTTP API). Tests
drive Messages.accept_message (which runs the production intelligence
pipeline), OpalConversations.create_user_message, SocialFlow, and the HTTP
API directly, with fresh randomized accounts.

Proving tests:
- apps/opal_core/test/opal_core/repair17_w4_flows_test.exs (12 tests)
- apps/opal_core/test/opal_core_web/repair17_w4_api_test.exs (2 tests)

## Item 1 - Change-time two-party flow (Chanelle thread)

Diagnosis (three compounding defects):
- lib/opal_core/intelligence/extractor.ex (@change_time_re): the pattern
  required the clock immediately after the change verb plus an optional
  (it | the time | dinner | plans). The founder's "Let's change the time
  for Juniper and Ivy at 8pm" has "for Juniper and Ivy" intervening, so
  nothing matched; the turn fell through to plan.propose and produced an
  AI-flavored reply with no revision created.
- lib/opal_core/intelligence/extractor.ex (@confirm): only "i confirm" or
  a bare "^confirm$" matched. The founder's "confirm 8 PM" classified as
  chitchat, so the confirm landed on no handler and nothing mutated.
- lib/opal_core/intelligence/extractor.ex (normalize_time_label/1): a
  non-participating minute capture returns "" (not nil), so "8pm"
  normalized to "8: PM" instead of "8:00 PM". Any revision or direct
  change created from an "8pm"-style utterance carried the mangled label.
- lib/opal_core/intelligence/executor.ex: private active_plan/1 ordered by
  inserted_at desc only, diverging from
  ConversationAlignment.active_plan_for_conversation/1 (updated_at desc),
  so change and confirm could land on different plan rows. And
  execute_schedule_change called change_plan_time directly for everyone:
  a non-lead got :not_authorized and a dead-end "Nothing was changed",
  with no revision-proposal fallback (SocialFlow.apply_nl_schedule_change
  already had the lead / non-lead split; the executor did not).
- Pending revisions were invisible to projections:
  ConversationAlignment.sync_locked/1 folds messages and explicit actions
  only, and freeze_plan_set_event/2 keeps the first committed summary
  ("The first committed summary stays put"), so surfaces kept rendering
  "Juniper & Ivy - Sat 7:30 PM is locked" while an 8 PM proposal existed.
  SocialFlow.sync_for_user/2 returned revisions but no pending set.
  Why Maya's case worked and Chanelle's did not: Maya's plan was led by
  the founder and the phrasing matched the old narrow patterns, so the
  direct-edit path ran; Chanelle's thread hit all of the above at once.

Fix:
- @change_time_re gained a "change the time for <phrase> to/at <clock>"
  alternative; @confirm now matches "^confirm\b" (so "confirm 8 PM" is a
  confirm, "confirmation" is not); normalize_time_label treats "" minutes
  as "00".
- Executor.active_plan/1 delegates to
  ConversationAlignment.active_plan_for_conversation/1 (single ordering).
- Executor.execute_schedule_change: on :not_authorized for a time change,
  falls back to propose_time_revision/6, which calls
  SocialFlow.propose_revision and replies with truthful copy: "Proposing
  8:00 PM - I've sent that change to the other person on this plan. It
  stays at <current> until they confirm." Date-kind changes deliberately
  keep the honest refusal (the revision applier only applies time_label;
  accepting a date revision would claim an effect that cannot happen).
- plan.confirm success copy reads the mutated plan row: "Confirmed -
  <title> is now at <time_label>."
- ConversationAlignment.sync_locked/1 ends with surface_pending_revision/2:
  the newest proposed PlanRevision for the active plan is surfaced as
  state["pending_revision"] (proposed_time_label, status
  "awaiting_confirmation", required approvals), and plan_set_event gains
  pending_revision_id plus superseded_by_pending_revision: true, so no
  surface can present the old time as locked current truth while a
  proposal is outstanding.
- SocialFlow.sync_for_user/2 payload gains "pending_revisions" (status
  "proposed" only).

Proving tests (repair17_w4_flows_test.exs, item 1): extractor unit asserts
for both founder phrasings; a two-user flow where the lead is the other
party: founder's exact change message creates a PlanRevision row
(time_label "8:00 PM", required_approvals contains the other party, plan
still "Sat 7:30 PM"), executor copy asserts "Proposing" / "until they
confirm" and never "Done"; sync_for_user and ConversationAlignment both
surface the pending revision; the other party's "confirm 8 PM" message
mutates the same plan row to "8:00 PM", the revision is accepted, and
list_plans_for_user / sync_for_user / alignment all read 8:00 PM with no
pending revision left. A lead direct-change regression test covers the
Maya-style flow that already worked.

## Item 2 - Center continuity: outstanding-question answer consumption

Diagnosis: no component tracked that Opal had asked a question.
OpalResponse's sticky re-engagement branch fires whenever intent is :chat
and history mentions a known name, and ActionOrchestrator's near-me gate
asked "food, outdoors, or nightlife?" without recording it. The user's
"Food" was then classified fresh, hit the sticky guard, and produced
"You mentioned Maya earlier - want to keep going on that, or something
new?" while Opal's own question was outstanding.

Fix (state layer):
- lib/opal_core/center/planning_context.ex: outstanding_question/1,
  set_outstanding_question/2, clear_outstanding_question/1,
  answer_to_outstanding?/2. The question lives in the persisted planning
  context of the user's active Opal conversation. Answer detection is
  conservative: short, no question mark, no command verbs; category
  questions only accept category-shaped answers (food / outdoors /
  nightlife / dinner / drinks / yes ...).
- lib/opal_core/center/action_orchestrator.ex: the near-me category gate
  and the QuestionEconomy ask branch now record the question they ask. A
  new cond branch in after_classify, ahead of the sticky-plan correction,
  provider search, and template paths, routes an answer turn to
  handle_outstanding_answer/5: the outstanding question is cleared, the
  answer lands on the same planning context (category, wants_restaurant),
  and the reply continues the same flow ("Food it is - keeping going on
  Maya's birthday plan."). The sticky re-engagement template can never
  render for an answer turn because this override owns the turn.

Proving test: the founder's exact sequence (birthday planning for Maya in
Center, "Find something near me" elicits the category question, "Food")
asserts no re-engagement line, category "food" persisted, outstanding
question cleared, and copy that continues Maya's birthday flow.

## Item 3 - No stale resurrection

Diagnosis: OpalIntent.pending_plan_create/1 walked ALL conversation
history newest-first, skipping unrelated opal turns, so a bare "Yes"
could bind to a plan_create ask from an earlier, derailed flow (the
nighthawk case) and create a plan the user was not looking at.

Fix: lib/opal_core/opal_intent.ex pending_plan_create/1: an intervening
opal turn that is not itself a failed plan_confirm now ends the walk -
the ask is no longer outstanding and a bare "yes" cannot resurrect it.
The existing W4-1b / W4-1c laws are preserved: a successful confirm makes
a second "yes" a no-op, and a yes after a FAILED confirm still retries
(the failed-confirm opal turn carries the plan_confirm intent snapshot
and does not close the ask).

Proving tests: the derailment sequence (plan ask, unrelated "What can
you help with?", bare "Yes") creates no SharedPlan and no "is set up"
copy; a direct OpalIntent history test pins the superseded-ask rule.

## Item 4 - Date-night completion (new request, not "Updated - same plan")

Diagnosis: ActionOrchestrator.after_classify's when-correction branch
ran for any turn carrying when / when_time while a sticky plan_id was
fresh (15-minute TTL), including a fresh :plan_create like "Schedule a
date night with Chanelle tonight at 5 PM and Oceanside for Italian
food", producing "Updated - tonight - 5 PM. Same plan, same people."
for a brand-new request. A pinned Repair #12 test requires a bare
"tonight 8 PM" (no verb) with a fresh sticky plan to still route to the
correction path, so the gate keys on the new-plan verb, not intent
alone.

Fix: the when-correction branch now also requires
not new_plan_request?(intent, raw_text): intent :plan_create AND a
create verb (schedule / set up / create / arrange / book / plan) AND no
change verb. New requests fall through to the normal plan_create ask,
confirm creates a new SharedPlan, and PlanCompletion.drive persists the
completion steps on the new plan row.

Proving test: with an existing confirmed plan and fresh sticky plan_id,
the founder's exact date-night text is not answered as an update, the
old plan row is unchanged, and "yes" creates a NEW plan (different id)
whose alignment completion steps include the calendar projection step.

## Item 5 - Fuzzy named-venue search ("Dave & Busters near me")

Diagnosis (three layers):
- PlanContextPatch.extract_exact_venue/1 patterns all required "in
  <Locality>" or find / look-up verbs; "Let's do X near me" matched
  nothing.
- OpalIntent.try_plan_create runs before try_named_venue and "let's do"
  is a plan-create trigger, so the turn classified :plan_create, was
  parked by skip_provider_search, and hit the near-me location gate,
  which asked the category question.
- PlanningContext.ready_for_restaurant_search?/1 required a destination
  for exact-entity search, even though ProviderAction.start_places_search
  already permits exact-entity search without one.

Fix:
- extract_exact_venue/1 tries extract_lets_do_venue/1 first: "let's do /
  let's go to / go to <Proper Name> near me" (locality nil, near_me flag
  set) and "... near / in <Place>". Names allow apostrophes and "&";
  stop words, day words, cuisine words, and meal words are rejected.
- OpalIntent.try_plan_create defers to named-venue when the turn is a
  let's-do / go-to shape with an exact-venue hit.
- ready_for_restaurant_search?/1 accepts exact + near_me with no
  locality; a bare named find with NO locality signal still asks for the
  city (pinned by the Repair #11 test).
- Fuzzy matching: PlanContextPatch.venue_names_match?/2 with
  normalize_venue_name/1 (case, curly apostrophes, "&" vs "and",
  trailing-s singularization) makes "Dave & Busters" match
  "Dave & Buster's"; ActionOrchestrator.resolve_selected_venue tries the
  fuzzy match before exact / contains.
- Honest limitation copy: a named search started with no locality and no
  device coords appends "Searching by name - without your location I
  can't rank by distance."

Proving tests: extraction unit assert; fuzzy match / non-match units; an
end-to-end Center turn (no coords) asserts a places_search
ProviderActionJob with search_mode "exact_entity" and the requested venue
name, by-name honesty copy, and no category question or location gate.

## Item 6 - Center header strip data (live plans, not fixtures)

Diagnosis: the strip's backend source is
OpalCoreWeb.CalendarController.today/2 (GET
/api/v1/product/calendar/today). It returned only linked-external-
calendar events, and {"connected": false, "source": "none", "events":
[]} when no calendar was linked; the web layer then fell back to
hardcoded sample data (Appointment 15:30, Dinner 19:30 - the founder's
"3:30 / 7:30"). The live plan source of truth is the OpalCalendar
Commitment projection: every SharedPlan projects there through
PlanCompletion and the revision chain.

Fix:
- New lib/opal_core/center/now_strip.ex: NowStrip.plan_events/3 joins
  active commitments (status "active", not superseded, not cancelled)
  to live SharedPlans for the owner, within the window, ascending,
  returning plan title, start / end, time label, source "plan".
  Registered in PlanProjection.read_files/0 and read_functions/0 (it
  reads the single store).
- CalendarController.today/2 always merges NowStrip events: unlinked
  users get source "plans" (or honest "none" with empty events); linked
  users get merged, time-sorted events with source "calendar" or
  "calendar+plans". The fixture fallback has no data left to stand on:
  the API now always answers from live plan state.

Proving tests: NowStrip returns the projected plan event in-window with
the plan's real title and start instant, another user's strip is empty,
an empty user gets []; the HTTP test asserts /calendar/today returns
source "plans" and the real plan event with no linked calendar, and an
honest empty state before any plan exists.

## Item 7 - Opal chat sessions (backend)

Diagnosis: OpalConversations was one-conversation-per-user:
opal_conversations had a unique index on user_id and start_new_chat/1
just deleted the messages on the same row. There was no session list,
no switch, and no way to retain prior chats.

Fix:
- Additive migration 20261026010001_add_archived_at_to_opal_conversations:
  adds archived_at (utc_datetime_usec), drops the plain unique index on
  user_id, adds a partial unique index (user_id where archived_at IS
  NULL) enforcing exactly one active session per user.
- OpalConversation schema: archived_at field, active_query/1 (the one
  active session), sessions_query/1 (active first, then recent),
  to_contract gains "archived" / "archived_at". Every former
  Repo.get_by(OpalConversation, user_id:) call site (OpalConversations,
  PlanningContext, OpalContext) now goes through active_query/1, so
  multiple sessions per user cannot raise MultipleResultsError anywhere.
- OpalConversations: list_sessions/1 (owner-scoped, with message
  counts), start_new_chat/1 archives the current session (messages
  intact, inflight provider jobs cancelled, transient planning cleared)
  and creates a fresh active session, switch_conversation/2 (owner-only;
  archives current, reactivates target), clear_conversation_by_id/2
  (owner-only; that session's messages really deleted). Foreign or
  unknown ids return :not_found everywhere - existence is never revealed
  across accounts. create_user_message accepts a conversation_id opt:
  posting to an owned archived session switches to it first.
- HTTP: GET /api/v1/product/opal/conversations (list own sessions),
  POST /api/v1/product/opal/conversations/:id/switch, POST
  /api/v1/product/opal/conversation/clear with optional conversation_id
  (foreign id - 404). Existing show / new / clear contracts unchanged in
  shape.

Proving tests: context-level (new chat archives and retains, list order
and counts, switch back restores messages, clear deletes only that
session's messages, cross-account list / switch / clear all fail with
:not_found and the victim's messages intact) and HTTP-level (full
list / new / switch / clear flow for one account; the second account
lists only its own sessions and gets 404 on switch and clear of the
first account's session).

## Suite result

Full backend suite on this branch: 2813 tests. Failures: the 13
clock-sensitive failures in the AttentionBudget / Coordinator /
Relationships / proactive families (quiet hours, weekly briefing,
weekend visibility). Verified pre-existing: the identical 13 tests fail
on the pristine R16 tip (git archive of 2c1bdcd2) run at the same time
of day; the R16 commit message itself records clock-sensitive failures
at its own run time. The one failure my changes initially added
(PlanProjection read-path registry) is fixed by registering NowStrip.
No other new failures; no assertions weakened anywhere.

Environment note: the VM restarted mid-session and lost its system
Erlang / Postgres. The toolchain was restored from the local apt package
cache (Erlang OTP 25 extracted under ~/workspace/erlang-otp with a
relocated erl launcher; Postgres 16 run from an extracted tree as user
nobody). Bootstrap is scripted at ~/workspace/r17-bootstrap.sh so a
restart costs one command.
