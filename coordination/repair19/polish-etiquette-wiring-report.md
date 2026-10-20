# Founder Polish Wave — Cluster I2: Etiquette Wiring — Report

Status: COMPLETE on branch `muse/r19-polish-etiquette-wiring`
(base `a4e168a7`). No merges, no pushes. `muse/repair-17` untouched.
FOUNDER_ACCEPTED = NO.

The P13/P14 etiquette machinery (finisher wave) was complete and
tested but unreachable from live traffic: no production caller
opened the lifecycle, no endpoint exposed the window/respond/fork
surface, the plan contract carried no etiquette projection,
shellData never fed `PlanCardC2Input.limbo`, and no creator UI could
set a window. This wave closes all six links of that chain through
the real paths, and pins the whole chain at API level (1:1 and
group) and at the web card-model level.

## The chain, link by link

### 1. Backend exposure — window-set + per-viewer projection on the contract

- `SocialFlow.plan_payload/2` (the viewer-scoped contract builder
  behind GET /opal/plans and every plan write response) now carries
  `"etiquette"` from `NonResponseEtiquette.viewer_projection/3`.
- `viewer_projection/3` is registered in `PlanProjection.read_functions/0`
  (gyroscope law: the read goes through the registry; no shadow
  derivation anywhere). It returns the machinery's own
  `projection_for/3` when a lifecycle is open, and a window-only
  fallback built from the pending participant row when none is open
  yet — so the creator control can render the window's availability
  truth from the moment a plan exists.
- The projection now also carries `fork: {state, available}`
  (upcoming / presented / awaiting_requester / none), plus
  `requester_user_id`, `recipient_user_id`, `lifecycle_open`.
- Party-scoping fix found by the chain pin: the machinery's
  `projection_for/3` will judge a loop for ANY viewer id handed to
  it (its group_member leg). `viewer_projection/3` gates on plan
  membership first — a plan's etiquette fact never rides a contract
  to someone who is not on the plan (pinned: outsider payload
  carries `etiquette: nil`).
- New finished copy in the machinery (all inside the P13 copy
  discipline, inside `all_copy/0`, machine-pinned against the
  banned-word list): refusal lines for window-set and respond
  (`window_not_creator_copy/0` "Only the person who made this plan
  can ask for an answer by a set time.", `window_not_pending_copy/0`,
  `window_invalid_copy/0`, `respond_not_yours_copy/0`,
  `respond_nothing_waiting_copy/0`, `window_not_found_copy/0`), and
  `window_refusal_line/4` mapping every gate reason to its line.
- `SocialFlow.set_plan_response_window/1` and
  `SocialFlow.respond_to_plan_etiquette/1` are thin delegations:
  UUID-shape guard, plan-access check (failure reads as not-found —
  existence is never revealed), then the machinery's OWN gates run
  (`set_response_window/2`'s creator/pending/circle/mode/bounds
  gates are exposed, not re-implemented).

Endpoints (router, authenticated product scope):

- `POST /api/v1/product/opal/plans/:id/response-window`
  `{recipient_id, window_seconds}` → 200 `{ok, plan}` (the same
  viewer payload the listing serves); 404 unknown/foreign plan;
  403 non-creator with the machinery's plain line; 422 gate
  refusals with the gate's own finished `message` — never a silent
  drop.
- `POST /api/v1/product/opal/plans/:id/etiquette/respond`
  `{action}` → decline / ask_another_time (recipient fork answers),
  nudge_again / extend / let_it_go (requester escalation answers);
  200 `{ok, plan, outcome}`; refusals carry plain lines.

### 2. Production caller — a state-change hook, never a scanner

`SocialFlow.open_etiquette_requests/3` runs post-commit inside the
three real creation doors — `create_tentative_plan_from_conversation/3`,
`create_tentative_plan_from_center/2` (via its success branch), and
the graph-create insert (`create_plan_from_graph_create/3`) — for
every participant the insert placed in awaiting-response state
(`PlanParticipant.pending_state?/1`), excluding the requester. It
calls the machinery's `open_request/1` per recipient and is
rescue-safe by the FollowThroughProducers discipline (an etiquette
failure can never fail a plan creation). There is no polling, no
sweeper, no periodic job: creation is the event; the timed stages
continue to ride the machinery's existing Oban stage jobs
(`EtiquetteStageWorker`, unchanged). Pinned by test: graph create,
center create (with and without subject), and conversation create
each open exactly the pending invitees' lifecycles; a source-scan
pin keeps the hook a creation hook.

### 3. Notices — both parties, through the existing inbox machinery

Unchanged machinery, now reachable: the graceful fork and the
closure emit the machinery's private `AttentionSignal`s
(`non_response_nudge` / `non_response_fork` / `non_response_closure`),
read back through `FollowThrough.needs_you/1` — the same needs-you
path the shell serves. Chain-pinned: the fork reaches the recipient
with both honorable actions (decline / ask_another_time); at
closure the requester reads the kind requester closure, the
non-responder reads the kind recipient closure, and in the group
variant every other member reads the group closure. Pinned at the
family seam: `ProductShell.signal_family("non_response_closure") ==
"quiet_information"` (closure is quiet information in the unified
inbox, never an action demand); `needs_answer` still maps to
needs_action. No copy shames anyone (the machinery's all-copy audit
covers the new lines too).

### 4. Web feed — shellData carries limbo onto real cards

- `productClient.ts`: `PlanEtiquetteContract` (the wire projection,
  snake_case verbatim) on `OpalPlanContract.etiquette`, plus
  `setPlanResponseWindow/3`, `respondPlanEtiquette/2`, and
  `etiquetteWriteError/1` (the server's own refusal line, verbatim).
- `shellData.ts`: `limboFromPlan/1` translates the contract's
  etiquette limbo into `PlanCardLimboC2` (camelCase adapter only —
  state, treatment, pattern channel, remaining fraction and the
  viewer's finished copy all arrive finished from the backend);
  `cardFromPlan/1` now sets `limbo` on every card it builds, so the
  merged PlanCardC2 cooling treatment renders on real cards in Home,
  Graphs and detail. Sender (waiting) and recipient (window
  closing) views carry their distinct backend copy — pinned at the
  card-model level from contract-shaped payloads for both roles.

### 5. Creator UI — opt-in window control in the plan edit flow

`ResponseWindowControl` (in `PlanEditControls.tsx`, rendered by the
plan detail/edit surface via GraphDetailSheet; OpalApp's descriptor
now carries `plan.etiquette` from the durable payload):

- Renders ONLY where the machinery supports it, judged entirely
  from the contract projection: only for the requester (the window
  gate is creator-only), only with a recipient + an available
  window. Plain words: "Ask for an answer by" + Tomorrow / In 2
  days / In 3 days / In a week.
- A set window reads back as a finished line ("You asked for an
  answer by <weekday, time>.").
- Where the machinery declares a window unavailable, its own
  finished reason renders as a plain line instead of a control.
- A gate refusal at set time surfaces as the server's plain line
  inline (`response-window-error`), the control stays — never a
  silent drop. Success re-renders from the RETURNED plan payload
  through the existing `onEdited` merge; no second fetch, no local
  recompute.

### 6. Chain pins

Backend (`apps/opal_core/test/`):

- `opal_core_web/etiquette_wiring_api_test.exs` (3 tests) — the
  full HTTP chain: activate two accounts → graph-create over HTTP
  (loop open, asserted in the DB) → POST response-window via the
  real endpoint → GET /opal/plans carries window facts for BOTH
  viewers → advance (the worker's own entry, pinned clock derived
  from the loop's own `window_closes_at`) past grace → limbo reads
  back on the contract for both viewers with distinct copy → one
  minute before close: `:not_due`; at close: fork fires → fork
  notice in the recipient's needs-you with both actions → past the
  fork window: closure with `hold_released: true` → replay is
  `:stale_job` and the closure-signal count stays exactly 2 (fork
  fires EXACTLY ONCE) → both parties' closure notices read back
  through needs_you → participant row plainly `declined` → the 1:1
  plan reads back `cancelled` via `?status=all` (hold released
  through the transition gate) → etiquette fact gone from the
  closed contract. Plus: gate refusals over HTTP (422 circle line
  with nothing written; 403 non-creator line; 404 unknown plan) and
  the recipient's own decline through the respond endpoint
  (creator's attempt first: 404, nothing written).
- `opal_core/social_flow/non_response_etiquette_wiring_test.exs`
  (7 tests) — the production caller on all three creation doors,
  the contract carriage for both viewers (window, limbo at fraction
  0.25, fork upcoming → presented), outsider scoping, and the GROUP
  chain through the real create path: one member's silence closes
  kindly, the plan stays tentative (group proceeds), the other
  member is still pending, and creator + other member + the
  non-responder each read their closure through needs_you.
- The finisher's 19 machinery tests pass unchanged.

Web (`apps/opal_web/src/c2/shell/etiquetteWiring.test.tsx`, 9 tests):
card model carries limbo from contract-shaped payloads for both
viewer roles (distinct copy, cooling facts, fraction), null when no
limbo fact; the window control's presence rules (requester only,
unavailable line, set line), the real endpoint call shape, re-render
from the returned payload, and refusal-as-plain-line.

## Test evidence (exact, as run)

- Backend targeted (etiquette machinery + wiring + API + pattern
  enforcement + projection coherence): 41 + 29 tests green in
  waves; the two new files + machinery suite together: "29 tests,
  0 failures".
- FULL backend suite: "3267 tests, 0 failures" (this wave adds 10
  tests; the count only grows against the stated 3,243/0 floor).
  First full run showed 8 failures — all in the two R16 suites
  corrected below; the corrected re-run is the 3,267/0 quoted here.
- Web targeted: etiquetteWiring (9) + limboTreatment (5) +
  familyOfStatus (8) + planEditControls (4) = "26 passed".
- FULL web suite: "Test Files 16 failed | 225 passed (241)",
  "Tests 23 failed | 1872 passed (1895)" — the failing set is
  EXACTLY the 23/16 floor; all 23 are pre-existing failures in
  files this wave did not touch (activation, availability, design
  tokens, wave-B exact-authority, graph calendaring/scroll, etc.);
  the new etiquetteWiring suite passes inside the full run.
- Typecheck: exactly 9 errors, all pre-existing families (OpalApp
  tab union ×3, duplicate plan_type/online in the base
  OpalPlanContract body, YouSettingsDestination handle) — none in
  code this wave added.
- `mix precommit` (per apps/opal_core/AGENTS.md): its
  compile --warnings-as-errors step is red AT BASE (~70 warning
  sites across ~40 untouched modules — accounts, intelligence,
  trips, voice, ...). Verified by site: the warnings in the two
  files this wave edited (social_flow.ex, the conversation
  controller) are all at pre-existing lines; non_response_etiquette.ex
  and the new files compile warning-free. Fixing the base warning
  debt is not this cluster's scope; format on all touched files is
  clean (`mix format --check-formatted`).

## Existing-test corrections (behavior-change fallout, claim-preserving)

Opening invitation lifecycles in production changed what "the loops
for a plan" contains, and two R16 suites asserted unscoped loop
counts. Their claims were about THEIR kinds; the assertions are now
scoped by kind, with the reason written at each site, and every
original claim (counts, statuses, participants, no-loop cases)
preserved verbatim:

- `repair16_proactivity_test.exs`: five `loops(plan_id:)` assertions
  in the P4 waiting_on describe → `waiting_on_loops/1` (kind-scoped
  helper); the "chat text never registers loops" aggregate →
  waiting_on-kind count (the claim is about commitment loops; chat
  text still registers none).
- `repair16_chat_lock_drive_test.exs`: `assert_driven`'s single-loop
  assertion, `effect_counts`' loop count, and the open-loop count →
  scoped to the drive's `plan_approach` kind.
Both suites re-run green (33 tests, 0 failures).

## Pre-existing defect at base — INTEGRATOR ACTION NEEDED

Two migrations share version `20261030020001`
(`..._add_response_window_to_plan_participants.exs` and
`..._create_plan_privacy_marks.exs`). In the shared test DB only one
of them is recorded as applied and the `plan_privacy_marks` TABLE
DID NOT EXIST, which made every viewer-scoped `plan_payload/2` call
crash (`Postgrex.Error 42P01`) — including, at base, the
PlanProjectionReadCoherenceTest. Verified pre-existing: the
coherence suite fails identically on the clean base (git stash).
This wave did NOT renumber a migration (a merge-level decision;
renumbering changes applied-version history on other machines).
For THIS wave's runs, the missing table was created in the shared
test DB only, directly from the migration's own DDL (environment
repair; no repo change). Before merge, the integrator should give
one of the two migrations a fresh version so fresh databases get
both tables.

## Remaining honest absences (by name)

1. **Lifecycle opens at request birth only.** The hook fires on the
   three creation doors' fresh inserts. A dedupe-survivor return
   opens nothing new (correct: that plan's participants received
   their lifecycle at the original creation). There is no
   add-participant-after-creation path in the product today; if one
   is built, it must call `open_request/1` the same way.
2. **In-process post-commit hook.** The caller runs synchronously
   after commit (by the no-polling law there is deliberately no
   scanner to catch a miss). A process death in the commit→hook
   instant would leave that one participant without a lifecycle;
   named, not papered over.
3. **No window control in the quick-create flow.** GraphCreateFlow's
   draft carries no participant ids, so a window cannot be offered
   before the plan exists. The window is set from the created plan's
   detail/edit surface (this wave's control) — one tap after
   creation, through the same endpoint.
4. **Escalation answers are exposed, not separately HTTP-pinned.**
   `respond` dispatches nudge_again / extend / let_it_go to the
   machinery (whose own suite pins `respond_as_requester/3`), and
   the recipient decline IS pinned over HTTP; a dedicated HTTP
   escalation chain pin is future work, named here.
5. **Mobile renders no limbo yet.** The contract carries the
   etiquette projection to any client; `apps/opal_mobile` was
   outside this cluster's scope and has no limbo/window surface.
6. **No screenshots in this report.** This wave's proof is
   test-level through the real paths; the rendered captures are the
   integrator's step, framed below.

## Frame list for the integrator's captures (both modes each)

1. **Graceful-fork moment** — recipient's view at fork: plan card /
   detail showing the fork state, plus the NeedsYou fork notice with
   "Say it plainly" / "Ask for another time" actions (dark + light).
2. **Closure notice** — requester's NeedsYou quiet-information
   closure card after auto-decline, and the non-responder's kind
   closure card (dark + light).
3. **Mid-limbo cards** — Home/Graphs plan card in the cooling
   treatment mid-window: SENDER variant (waiting copy) and
   RECIPIENT variant (window-closing copy), each dark + light.
4. **Window-setting control** — plan detail edit surface: the
   "Ask for an answer by" control (unset state), the set read-back
   line, and the circle-refusal plain line on a non-circle plan
   (dark + light).
