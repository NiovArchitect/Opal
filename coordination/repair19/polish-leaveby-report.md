# Founder Polish - Cluster G: Leave-By Intelligence (P10c) - Report

Branch: `muse/r19-polish-leaveby` (base `95319bd7`, Repair #19 final tip)
Commit: `2b68c872` - one commit, not pushed, not merged. FOUNDER_ACCEPTED remains NO.
Scope kept: no merges, no pushes, no other worktrees/branches touched, no
migrations (none needed - no schema change), PlanTransition gate untouched,
no ledger edits, no pack captures.

## Provider truth, as found (not assumed)

The wired provider is Geoapify (places gateway primary; Google Places is
billing-deferred in the gateway registry). Before this wave the Geoapify
adapter exposed geocode + places search ONLY - no routing call existed
anywhere in the repo (verified by grep: no routing code in `places/`).

Geoapify Routing API (documentation checked 2026-10-19; no external API
was called from the VM - its DNS is synthetic):

- `GET /v1/routing?waypoints=lat,lon|lat,lon&mode=drive` returns
  `features[0].properties.distance` (meters) and `time` (seconds).
- The ONLY traffic models are `free_flow` (default - optimistic, no
  traffic influence) and `approximated` (a model that lowers speeds on
  potentially heavy-loaded roads). **There is no live traffic feed in
  this API on any tier.**

Consequence, implemented as law: we request `traffic=approximated` and
the traffic honesty class of a successful route is **"estimate"**,
never "live". `TravelTime` additionally caps any provider-claimed
"live" at "estimate" (pinned by test). The UI label says it plainly:
"Estimate - typical traffic, not live". Provider failure / no key /
no route -> class "unavailable" and NO numbers, ever.

In tests, provider behavior comes only from stubbed responses at the
new `:geoapify_http_fun` transport seam on the Geoapify adapter (the
repo's existing mock-provider pattern - cf. `:deepgram_http_fun`).

## Derivation spec

- **Origin**: the viewer's OWN fresh `PlanLocationShare` row for this
  plan (the per-plan opt-in share from R19 W7 - coarse 3-decimal
  coords, 4-hour expiry; expired = not sharing). Nothing else is ever
  an origin: not another party's share (pinned - the provider is not
  even called when only the other party shares), not Center device
  coords (that store's privacy law forbids repurposing).
- **Destination**: `shared_plans.place_lat` / `place_lon`.
- **Route**: `Geoapify.route/1` -> `Places.Gateway.route/1` ->
  `Places.TravelTime.route/3` (normalizes meters/seconds, stamps
  `computed_at`, applies the traffic-class cap).
- **Leave-by** (pure, `TravelTime.leave_by_at/3`):
  `start_at - (duration_seconds + buffer)`, buffer = **600 s (10 min)**,
  a named constant projected verbatim as `buffer_seconds` on every
  contract so no surface guesses what was added.
- **Urgency** (derived state truth, `TravelTime.urgency/3`):
  "on_track" (leave-by ahead) | "leave_now" (leave-by reached, plan
  not started) | "started" (start passed). The flip is exact at the
  leave-by instant (pinned at the boundary).
- **Freshness**: read-time derivation, NO cache. Every projection
  read recomputes from the current share row plus a fresh provider
  route and stamps `computed_at`. Cadence is therefore exactly the
  surfaces' existing re-read cadence: plan detail re-reads on open
  and after actions (share/stop share re-reads), the thread re-reads
  its alignment/messages payload on open and on realtime-triggered
  refreshes. No new polling was added (the C2 shell has a no-polling
  discipline), and the client never extrapolates a countdown from a
  stale stamp.

## Contract fields (additive)

One projection object, `leave_by`, from `OpalCore.SocialFlow.LeaveBy`
(the ONE derivation; registered in `PlanProjection.read_functions/0`):

```
state:                  "ok" | "needs_location_share" | "no_place_coordinates"
                        | "no_start_time" | "not_applicable" | "unavailable"
label:                  finished spoken-style line (or the honest absent line)
urgency:                "on_track" | "leave_now" | "started" | null
leave_by_at:            ISO instant | null
leave_by_label:         "6:40 PM" (plan timezone) | null
travel_duration_seconds / travel_duration_label   ("25 min")
travel_distance_m       / travel_distance_label   ("7.5 mi")
traffic_class:          "estimate" | "unavailable" | null   (never "live")
traffic_label:          "Estimate - typical traffic, not live" | null
buffer_seconds:         600 (always present - the stated buffer)
provider:               "geoapify" | null
computed_at:            ISO stamp of the derivation
```

Carried on:

1. **Plan detail projection** - `PlanHistory.for_plan/2` gains
   `"leave_by"` (the history endpoint the detail already reads;
   `PlanHistoryContract.leave_by`, folded verbatim by
   `shellData.detailWithHistory` into `GraphDetailProjection.leaveBy`).
2. **Thread plan strip** - `NextPlan.for_conversation/3` gains the
   key ONLY when the caller passes `leave_by: true`; the two thread
   paths in `ConversationController` (alignment read, messages read)
   opt in. The chats-list fan-out (`Messages`) and the call log
   (`for_peer`) do NOT opt in - their facts are byte-identical to
   before, and no provider call is made per list row.

## Novelty mandate - TIME DISPLAY pattern (leave-by)

Alternatives genuinely considered for how a leave-by should appear:

1. **Static time chip** ("Leave by 6:40 PM" as a small pill beside
   the plan time). Quiet and clear, but inert: the moment that
   matters most - the threshold crossing - looks exactly like every
   other moment. The founder would have to notice a clock fact, not
   a state change. Floor, not ceiling.
2. **Warming treatment** (border/glow that gradually intensifies as
   the threshold approaches). The most "ambient-native" idea, and
   the loser on the judging criteria: a gradient implies continuous
   knowledge we do not have (the route is an estimate recomputed per
   read, so mid-gradient states would be decoration wearing the
   clothes of data); it spends color continuously, against the
   scarce-fire doctrine; and a warmth gradient is a color-alone cue
   until it is nearly at the threshold - the ambient accessibility
   law forbids meaning that rides on color alone.
3. **Countdown chip** ("Leave in 20 min"). Feels alive, but it is a
   derived number that goes stale the second it renders and quietly
   asserts a precision the estimate class does not have. A stale
   countdown is a distance/duration lie in time form.
4. **Spoken-style finished line + discrete threshold escalation
   (PICKED)**. The backend finishes a sentence a person would say:
   "Leave by 6:40 PM to arrive calm - 25 min drive, 7.5 mi
   (estimate, includes a 10 min buffer)". At the leave-now
   threshold the sentence itself changes - "Leave now to arrive on
   time - the drive is about 25 min (estimate)" - AND the treatment
   escalates ready gold -> action (existing token + solid-bold
   pattern) at the same moment. Words and color move together, so
   the cue survives reduced motion and color blindness; the
   escalation is a discrete state truth the backend derives, not a
   gradient the client paints; and between reads the line stays
   exactly as true as the `computed_at` stamp says it is. Clarity
   is the senior partner; the spoken line is the clearest of the
   four, and the escalation gives it the one ambient beat it needs
   without noise.

**Rulebook implication (for the integrator to file)**: a named
ambient beat - "leave-now escalation": when a surface's projection
carries `leave_by.urgency == "leave_now"`, the surface's plan
treatment escalates to the action family (color + solid-bold
pattern) and the spoken line flips to its leave-now wording. The
beat is state-truth only; no surface may pre-escalate, animate
toward it, or reproduce it from a local clock.

## Files changed (commit 2b68c872, 16 files)

Backend:
- `apps/opal_core/lib/opal_core/places/providers/geoapify.ex` -
  `route/1` (Routing API leg, `traffic=approximated`, provider-shaped
  normalization, `:geoapify_http_fun` test seam); capabilities gain
  `routing: true`, `live_traffic: false`, `traffic_model: "approximated"`.
- `apps/opal_core/lib/opal_core/places/gateway.ex` - `route/1`
  delegation to the primary provider.
- `apps/opal_core/lib/opal_core/places/travel_time.ex` - NEW.
  Route normalization + traffic-class cap + pure leave-by math +
  urgency truth + the stated buffer constant.
- `apps/opal_core/lib/opal_core/social_flow/leave_by.ex` - NEW.
  The ONE per-viewer leave-by derivation and its honest absent states.
- `apps/opal_core/lib/opal_core/social_flow/plan_history.ex` -
  detail projection gains `"leave_by"`.
- `apps/opal_core/lib/opal_core/social_flow/next_plan.ex` -
  opt-in `leave_by: true` threading through the pick to the fact.
- `apps/opal_core/lib/opal_core/social_flow/plan_projection.ex` -
  registry entry for the new derivation.
- `apps/opal_core/lib/opal_core_web/controllers/conversation_controller.ex` -
  the two thread reads opt in.
- `apps/opal_core/test/opal_core/social_flow/leave_by_test.exs` - NEW, 15 tests.

Web (render-only; finished strings and urgency come from the backend):
- `apps/opal_web/src/api/productClient.ts` - `LeaveByProjection`
  type; `PlanHistoryContract.leave_by`; `NextPlanFact.leave_by`.
- `apps/opal_web/src/c2/shell/projections.ts` -
  `GraphDetailProjection.leaveBy`.
- `apps/opal_web/src/c2/shell/shellData.ts` - `detailWithHistory`
  folds `leave_by` verbatim.
- `apps/opal_web/src/c2/shell/C2Graphs.tsx` - detail "When to
  leave" section: finished line (action color at leave_now) +
  honesty meta (duration - distance - traffic label). Absent states
  render their finished line; "not_applicable" (virtual) renders
  nothing; no projection renders nothing.
- `apps/opal_web/src/opalUi/c1/PlanAwareness.tsx` + `.css` - strip
  variant only: the leave-by segment (state "ok" only - absent
  states stay quiet in the strip; their honest line lives on the
  detail). At `leave_now`, `--pa-state` escalates to
  `PLAN_STATE_HEX.action` and the pattern to solid-bold, with
  `data-leave-now="1"`. No new colors, no client derivation.
- `apps/opal_web/src/opalUi/c1/leaveBy.test.tsx` - NEW, 8 pins.

## Tests - exact results

Backend (env: OTP 27.3.4.2 / Elixir via `~/workspace/otp` +
`~/workspace/elixir`, Postgres 16 at 127.0.0.1:5433, per-wave test
DB `opal_test_r19leaveby` via `DATABASE_URL`, scratch deps under
`~/workspace/opal-graph/polish-scratch-leaveby`):

- `leave_by_test.exs` (new): **15 tests, 0 failures** - provider
  math + request shape (waypoints, mode=drive, traffic=approximated),
  "live"-claim capped to "estimate", no-route error, leave-by math,
  urgency boundary (one second before = on_track, at the instant =
  leave_now), full ok derivation with finished labels, escalation
  line, no-share honesty (provider never called), per-viewer
  isolation (guest's share never routes the owner; guest routes from
  their own coarsened share), no-coordinates, provider failure,
  missing key, virtual + undated absent states, and both projection
  wirings (PlanHistory carries it; NextPlan only on opt-in).
- Regression set: `leave_by + r19_graphs` = **35 tests, 0 failures**;
  wider set (coherence registry, DIR-1 NextPlan, JA-02 private
  projections, opalchat scope, conversation create-plan, places) =
  **140 tests, 0 failures**.
  (Note: an early r19_graphs run showed 1 failure while the test DB
  migration was still interrupted mid-flight from environment
  setup; the clean re-run is 20/20 and the file passes inside both
  sets above.)
- Not completed: a supplementary settings-connections / conversation
  channel run was abandoned under extreme VM contention (load
  average ~27-34 from parallel wave suites; a single ConnCase file
  exceeded 10 minutes without finishing). Relevance check by code
  read: `Settings.Connections` reads only the registry's
  `google_places` entry and builds its own geoapify row - the
  capabilities additions do not flow into any asserted field. The
  integrator's rerun can include
  `test/opal_core_web/settings_connections_test.exs` for completeness.

Web (`npm ci` first, vitest):
- New pins `leaveBy.test.tsx`: **8 tests, 0 failures**.
- Affected areas (`src/opalUi/c1` + `src/c2`): **41 files, 355
  tests, all passing** - includes DIR-1 awareness, r19 graphs,
  chats/thread, hunt-fix detail suites.
- Typecheck: **exactly 9 errors** - the standing floor, unchanged
  (none in touched files).
- Full suite: **23 failed tests / 16 failed files - exactly the
  standing floor (23/16), not grown**; 1758 passed / 1781 total
  (the 8 new pins included in the pass count). The run took 42
  minutes of wall time under the same contention.

## Honest absences

- **No seed/writer stamps place coordinates yet.** Verified by grep:
  outside the schema/changeset, nothing in the repo writes
  `place_lat/place_lon` (plan creation from place candidates does
  not copy candidate coords onto the plan row). Until a writer
  exists, real plans read `no_place_coordinates` - truthfully, with
  no leave-by. Wiring candidate coords at plan creation is the
  natural follow-up (outside this cluster's scope; flagged, not
  silently absorbed).
- **No live traffic exists to show.** The class "live" is in the
  contract vocabulary but this provider can never produce it; if a
  future provider supplies real live traffic, `TravelTime`'s cap is
  the one line to revisit (it is deliberate and commented).
- **Mobile**: out of scope per the brief (web surfaces named); the
  contract is additive, so mobile ignores it safely.
- The origin is a per-plan snapshot share (up to 4 h old), so a
  leave-by is only as fresh as the viewer's last share - the
  projection says so via `computed_at` and the share's own expiry
  discipline; it never pretends to track.

## FRAME LIST for the integrator (no captures taken by this wave)

Seeded app = the founder review seed; the plan is "Dinner at
Juniper & Ivy". Precondition for frames 1-2 (see honest absences):
set that plan row's `place_lat = 32.7231`, `place_lon = -117.1683`
(Juniper & Ivy, San Diego) - the seeded row carries no coordinates
yet. All frames in BOTH modes (dark night + light).

1. **Plan detail, leave-by in estimate class.** Sign in as the
   seeded plan's owner -> Graphs -> open "Dinner at Juniper & Ivy"
   -> in "Who is coming" tap "Share my location for this plan"
   (grants the device position) -> reopen the detail. Frame the
   "When to leave" section: spoken line "Leave by ... to arrive
   calm - ... drive, ... mi (estimate, includes a 10 min buffer)"
   with the meta line "... drive - ... mi - Estimate - typical
   traffic, not live" (`data-testid="c2-detail-leaveby"`,
   `data-leave-by-state="ok"`, `data-urgency="on_track"`).
2. **Escalated leave-now state.** Same plan, with its start edited
   to ~30 minutes from now (inside drive + buffer for any real
   origin in the metro) and location shared as in frame 1. Frame
   (a) the detail's "When to leave" section - line reads "Leave now
   to arrive on time..." in the action color,
   `data-urgency="leave_now"`; and (b) the plan's chat thread -
   the plan strip carries the same leave-now line with the strip
   treatment escalated to action + solid-bold
   (`data-leave-now="1"` on `[data-testid="plan-awareness"]`).
3. **No-location honest state.** Same plan WITHOUT sharing (fresh
   sign-in, or tap "Stop sharing" first): open the detail. Frame
   the "When to leave" section: the single line "Share your
   location to see when to leave" and NO numbers anywhere in the
   section (`data-leave-by-state="needs_location_share"`, no
   meta line).
