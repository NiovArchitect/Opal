# FAILURE_LEDGER — Repair #12

**Branch:** `muse/repair-12` (R4 evidence pass) · **Date:** 2026-10-16
**Method:** every entry below was verified by direct code read and has a
regression test. Items are the F12 series from the founder's phone pass
(Repair #11 walk); the ledger is reconstructed from the R1/R2/R3 commits,
their test moduledocs, and `F12-*` code comments, because no coordination
doc was present in the worktree.

Reproduction → root cause → fix → regression test, per entry.

---

## F12-01 — forming cards with no day/time show blank
**Repro:** a plan with an empty `when_label` rendered a blank time line.
**Root cause:** the Center strip read `when_label` directly with no fallback.
**Fix (R3):** fall back to `canonical_start_at`; never render blank
(OpalApp.tsx).
**Test:** `OpalCenterChat.planSurface.test.tsx` (R3-touched area).

## F12-02 — NL change-time ("change plans with Chanelle to 8 PM") never mutated the plan
**Repro:** typing a time change in chat produced copy but the plan row never moved.
**Root cause:** no execution contract for the `plan.change_time` intent; the
extractor/reasoner had nowhere to route.
**Fix (R1+R2):** `SocialFlow.apply_nl_schedule_change/1` — owner-scoped
current-plan resolution, lead → direct edit (`change_plan_time/1`: FOR UPDATE,
revision row, audit, broadcast, calendar projection), non-lead → proposal
flow, uninterpretable time → `{:error, :no_time_found}` (no fake edit).
Extractor/reasoner/llm_extract taxonomy + `plan.change_date` wired (R2).
**Gyroscope (F12-02c):** the accepted change is projected into the fold's
explicit action log (`schedule_change`), so `sync_conversation` never reverts
it — revision chain is the sole schedule authority.
**Tests:** `repair12_plan_coherence_test.exs` (8 tests), `repair12_r2_test.exs`
(extractor intents), R4 multirun battery (6 paraphrases x runs).

## F12-03 — venue answers gave no address confirmation
**Repro:** "Find Nighthawk in Coronado" answered without ever confirming an address.
**Root cause:** exact-entity resolve never wrote the venue onto the plan.
**Fix (R2):** exact-entity resolve auto-attaches the venue to
`plan.alignment.venue` (name + address + coords — single source of truth);
paint describes the performed write; provider-failure copy names the attempted
venue instead of a generic line.
**Tests:** R4 multirun Flow 3 (4 varied runs: resolve → attach → address shown).

## F12-04a — "where is The Henry in Coronado" → "tell me more" incoherence
**Repro:** a venue-location question fell through to `:chat` and the sticky
`recent_who` re-engagement ("you mentioned X earlier").
**Root cause:** no venue-question shape in the intent layer.
**Fix (R2):** `PlanContextPatch.extract_venue_question/1` → `:named_venue`
intent; the sticky recent_who branch cannot fire for venue questions
(`opal_intent` + `new_direction_this_turn?` guard).
**Tests:** `repair12_r2_test.exs` (6 tests), R4 multirun Flow 4 (3 runs).

## F12-05 — "schedule date night" never drove to completion
**Repro:** scheduling stalled after plan creation — no restaurant proposal,
no ride/directions offer, no calendar entry.
**Root cause:** no completion pipeline.
**Fix (R1):** `SocialFlow.PlanCompletion.drive/3` — calendar projection
(idempotent per plan version), restaurant discovery via the real Geoapify
path when no venue is set (deduped, never invented), ride/directions
next-steps as honest suggestions; `share_plan_to_conversation/1` as the
explicit share-to-chat authority path.
**F12-05d:** calendar commitments allow null `conversation_id`
(conversation-less Center plans).
**Tests:** `repair12_plan_coherence_test.exs`; R4 asserts calendar projection
after NL change.

## F12-06 / F12-07 — Center-created plans invisible in Graphs/Timeline
**Repro:** plans created in Center never appeared in Graphs/Timeline/peer chat.
**Root cause:** no owner-scoped listing; broadcasts only went to conversation topics.
**Fix (R1):** `GET /api/v1/product/opal/plans` (owner-scoped, incl.
conversation-less Center plans) backed by `SocialFlow.list_plans_for_user/2`;
`broadcast_plan/4` fans out on the conversation topic for chat plans and the
owner user topic (`social_flow:user:<uid>`) for Center plans; degenerate
`broadcast_plan(nil)` is a no-op.
**Tests:** R4 multirun Flow 6 (listing, cancelled exclusion, status:all);
R4 N-account property 2 (user-topic broadcast receive).

## F12-08 — NEXT TOGETHER strip stale + visual overlap after change
**Repro:** the strip showed 7:30 after the plan moved to 8:00.
**Root cause:** the strip read a per-surface shadow, not the plan.
**Fix (R1+R3):** schedule edits publish `social_flow:alignment_updated`
(alignment snapshot event); the strip reads the single source of truth
(`chats[].planProjection`), keyed by plan+revision (F12-32: one render per
generation), with an opaque strip treatment.
**Tests:** R1 coherence tests; web `centerNowStrip.test.ts`.

## F12-09 — provenance claim in non-test env
**Repro:** provenance labeling could render outside the test env.
**Fix (R3):** provenance labeling is test-env-only.

## F12-10 — "Saturday after 10" with no AM/PM
**Repro:** clock labels rendered without meridiem.
**Root cause:** strip/shell clocks omitted AM/PM.
**Fix (R3):** `formatClockAmPm` canonical clock; every strip/shell time carries
AM/PM. Grammar fix: "What is taking shape" → "What's taking shape"
(founder screenshot item).
**Tests:** web `waveBGraphsExact.test.ts` updated to the approved copy.

## F12-11 — device location pipeline unwired (422 on GPS)
**Repro:** "near me" degraded to an honest gate; GPS coords 422'd.
**Root cause:** no device→socket→server path; no origin concept.
**Fix (R2):**
- F12-11 foundation: `Center.DeviceLocation` (single `origin_source`
  invariant: device/manual/named_destination; server-side 3-decimal coarsening;
  haversine; 24h staleness); `POST /opal/location` (F12-11c).
- F12-11b: `message:send` accepts optional coarse coords (best-effort,
  never fails the send); travel pipeline 422 law untouched.
- F12-11d: "near me" opens a real device-anchored search when coords exist,
  honest gate when absent.
- F12-11e: real haversine distances in device-anchored discovery;
  non-device origins never fabricate.
- F12-11f: `origin_source` threaded through job request, action_state, message metadata.
- F12-41: web geolocation callback no longer fabricates `travel_minutes: 18`;
  POSTs coarse coords and calls `activateJourney` without the claim.
- F12-11a (mobile): `deviceLocation.ts` — explicit permission surface, cached
  coarse fix, honest nulls; `ConversationScreen` attaches best-effort.
**Tests:** `repair12_r2_test.exs` (DeviceLocation invariants); R4 multirun
Flow 7 (3 cities + garbage + denied).

## F12-12 — asset honesty (fixtures, silent links, error states)
**Repro:** hardcoded fixture lines ("Sadeil + 3 are here", "Maya is on the way ·
8 min"), silent non-navigating links, hollow error states.
**Fix (R3):** fixtures derive-or-label (TripCanvasView, SearchDestination,
GraphLivePanel, OpalApp Juniper/Waiting lines, group members from peers,
sample ideas labeled, Center week chips compute a real 7-day window);
silent links wired (ChatsHome signal link-role only when navigable; plan pill
falls through; sign-in-again pill is a real button); honest error states with
retry on ChatsHome/GraphsHome/HomePane (F12-44 humanErrorCopy).
**Tests:** web `emptyStateQuality.test.ts`, `waveBFullLiveExact.test.ts`
updated to the honest contract.

## F12-13 — handle_when_correction / sticky plan_id hijack
**Repro:** a days-old or cancelled `plan_id` in context hijacked unrelated utterances.
**Root cause:** bare `is_binary` check on the sticky plan_id.
**Fix (R1):** `handle_when_correction` delegates to the schedule authority
(FOR UPDATE, transaction, revision row, audit, broadcast);
`PlanningContext.plan_id_active?/1` — 15-min TTL + plan still active.
**Tests:** R1; R4 multirun Flow 6 run 3 (stale vs fresh).

## F12-15 — word-boundary wrapping
**Fix (R3):** word-boundary-respecting wrapping in the affected surface.

## F12-22 — em-dashes in rendered copy (standing rule)
**Fix (R3):** sweep replaced em-dashes with hyphens in rendered strings/JSX
(comments untouched); web test titles updated.

## F12-30 — who-extraction parroted venue/locality/clock tokens
**Repro:** "The Henry in Coronado on Sunday at 10 AM" surfaced "Henry",
"Coronado", "AM" as people.
**Root cause:** who-extraction was venue-blind.
**Fix (R2):** venue-aware extraction — resolved venue/locality/clock tokens
never become people; explicit "with <Name>" still wins.
**Tests:** `repair12_r2_test.exs` (3 tests).

## F12-31 — birthday copy claimed a private-planning thread
**Fix (R2):** copy states the real behavior (owner thread; honoree not looped
in without say-so).

## F12-32 — duplicate plan-generation renders
**Fix (R3):** NEXT TOGETHER strip keyed by plan+revision; in-thread "Plan set"
marker deduped.

## F12-40 — locality capture truncated multi-word cities
**Repro:** "Find Nighthawk in Los Angeles" captured locality "Los".
**Root cause (two):** (a) a metro allowlist; (b) a pre-existing nested-group
regex bug — `((...))` produced 3 captures where the code matched 2, so
locality extraction NEVER worked (Repair #11 included) and every query fell
back to name-only.
**Fix (R2):** general multi-word proper-noun phrase capture; day-tails
stripped by `sanitize_locality/1`.
**Tests:** `repair12_r2_test.exs` (6 tests); R4 N-account property 3.

## F12-42 — divergent named-venue in-flight copy
**Fix (R2):** `PlanContextPatch.venue_lookup_copy/2` — one copy source;
nil-locality handled ("Looking up Nighthawk…").
**Tests:** `repair12_r2_test.exs` (3 tests).

## F12-43 — duplicate provider jobs on case/whitespace variants
**Fix (R2):** exact-job dedupe is case/whitespace-insensitive.

## F12-44 — raw error text in conversation load failure
**Fix (R3):** `humanErrorCopy` — human copy, never `err.message` verbatim.

## F12-45 — time fallbacks (with F12-01)
**Fix (R3):** fallback chain for missing time labels.

## F12-46 — missing graph rendered a hollow sheet
**Fix (R3):** honest not-found.

## F12-47 — dateless plans bucketed to next_week
**Fix (R3):** dateless plans bucket to "someday".

## F12-48 — seed-leak message detection
**Fix (R3):** `isSeedLeakMessage` allowlist-based on sender identity.

## F12-49 — parseWhenParts invented defaults
**Fix (R3):** `inventDefaults` opt-in, default false.

## F12-51 / F12-52 — cross-account localStorage leakage
**Repro:** plan/travel storage keyed globally; switching accounts leaked state.
**Fix (R3):** `STORAGE_PLANS`/`STORAGE_TRAVEL` namespaced by `user_id` with
legacy migration; re-read on account switch.
**Tests:** R4 N-account property 3 (server-side analogue: PlanningContext +
DeviceLocation strictly per-user keyed).

## F12-53 — plan_id expiry (see F12-13)
**Fix (R1):** 15-min TTL + active-status check.

## F12-54 — garbage schedule labels persisted verbatim
**Fix (R1):** `validate_schedule_label/1` — a label must carry a time signal
(digit, meridiem, day/month name, relative-time word); content-free tokens
rejected, never normalized into a fake schedule.
**Tests:** R1; R4 multirun Flow 6 run 4; R4 adversarial (SQL-ish/emoji/empty).

## F12-56 — peer name lookup crossed accounts
**Repro:** a global `ilike` over ALL users could attach a plan to a
same-named stranger on another account.
**Root cause:** `lookup_user_by_name/1` — global user-table fallback.
**Fix (R1):** deleted. Resolution is scoped to the account's own
relationships/contacts; unknown → `:need_who` (honest), never a stranger.
**Tests:** R1 ("same-name contacts on two accounts never cross"); R4 N-account
property 3 (randomized Chanelle collision both directions).

## F12-57 — seed banner missing on early-return shells
**Fix (R3):** `SeedSimulatedBanner` on all 7 early-return shells + main shell.

## F12-58 — change_proposal never expired
**Repro:** a Center change proposal could sit at "Waiting on one response." forever.
**Fix (R1):** 24h TTL (`@change_proposal_ttl_seconds`); `expire_stale_change_proposal/1`
retires past-due proposals to `proposal_history` with status "expired" and
clears the live slot (runs at fold presentation time — invariant layer).
**Tests:** R4 adversarial (stale → retired+expired; fresh untouched; none → no-op).

## F12-59 — two orderings for the conversation's current plan
**Fix (R1):** `latest_plan/1` delegates to `active_plan_for_conversation/1`
(one owner-scoped ordering).

---

## New bugs found by R4 (filed as F12-61+)

### F12-61 — nil plan_id/revision_id crashed instead of an honest error
**Repro (R4 adversarial):** `SocialFlow.cancel_plan(%{plan_id: nil, ...})`
raised `Ecto.Query.Builder` ArgumentError (`p.id == ^nil` inside the
transaction) instead of returning `{:error, _}`.
**Root cause:** public entry points built queries from unvalidated ids.
**Fix (R4):** guard clauses — `cancel_plan/1`, `change_plan_time/1`,
`change_plan_date/1`, `respond_to_revision/1` return `{:error, :invalid}` for
nil/non-binary ids; catch-all `cancel_plan(_)` for shape-wrong input.
**Tests:** R4 adversarial "non-map / wrong-type args are :invalid".

### F12-62 — accepting a proposal on a cancelled plan resurrected it
**Repro (R4 adversarial):** propose → cancel → accept: `respond_to_revision`
applied the change and flipped status to "changed". A stale proposal could
resurrect a terminal plan.
**Root cause:** no plan-status check in the accept path.
**Fix (R4):** `true <- plan.status not in ~w(cancelled completed)` in the
transaction — cancelled/completed plans are terminal; the accept is refused
(`:forbidden`), never applied.
**Tests:** R4 adversarial "cancel-then-confirm ordering".

### F12-63 — DeviceLocation.put_for_user silently dropped coords
**Repro (R4 multirun):** `put_for_user` returned `:ok` but `get_for_user`
returned `:none` — coords vanished.
**Root cause:** `PlanningContext.merge/3` runs entities through an NL-entity
allowlist (`entities_to_ctx`) that only knows who/when/destination/venue/...;
`"device_coords"` was silently rejected while the function returned `:ok`.
The entire R2 location write path was a no-op.
**Fix (R4):** pass coords as merge EXTRAS (`merge(user_id, %{}, %{"device_coords" => coords})`),
which bypass the NL allowlist and persist verbatim.
**Tests:** R4 multirun Flow 7 (validate → coarsen → store → read-back);
R4 N-account property 3 (per-user keying).

---

## F12 numbers with no repair in the codebase
F12-07 (covered under F12-06/07), F12-14, F12-16–F12-21, F12-23–F12-29,
F12-33–F12-39, F12-50, F12-55, F12-60
(noted in R1 as "noted for R2" — the `render_plan_modify` copy; no code
change found). No coordination doc was present in the worktree, so this
ledger claims repairs only where commits, tests, or `F12-*` code comments
attest them. Unlisted numbers are NOT claimed as fixed.

## Merge-integration fix (R4)
The R1+R2+R3 merge left **duplicated route blocks** in
`apps/opal_core/lib/opal_core_web/router.ex` (`POST /opal/location` twice,
`GET /opal/plans` twice) — the compiler warned the second `GET /opal/plans`
was unreachable. Removed the duplicate block; single route each. No behavior
change (the first clause served), but the dead duplicate was a merge artifact.
