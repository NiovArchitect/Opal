# Repair #19 — Wave W7: Graphs as Futures + The Living Graph Detail

- **Branch / worktree:** `muse/r19-graphs` at `~/workspace/opal-graph/wt-r19-graphs`, based on `f2981dbf` (R18 tip; the task's `muse/repair-19` base resolves to this commit). **Not pushed.**
- **Commits:** `80d99746` backend · `72bd8f52` web · `97885b77` tests (see git log for full messages).
- **FOUNDER_ACCEPTED stays NO** — machine evidence only, as always.

## What the founder asked for, and what now exists

The Graphs surface was "just not quite there": a plain list, no sense of a
future being graphed, no completed view, no private space, and a plan
detail that did not show who's coming or where anyone is. All four are
now built, in the shipped code, against real records.

### 1. Graphs as futures — the future thread

Each group on Graphs now renders as **one thread running forward**: a
quiet rail (sequence) with **a node per plan, filled with that plan's
state token** — forming violet, action red, ready gold, happening cyan
(the shipped token values; in light mode the ready/happening tokens are
the darker ink-safe variants the design system already defines), past
grey. Cards keep their state pill + FireLine, so state reads twice, in
two registers, never only by color (glyph + label remain on the pill).

- **Ambient register (founder rule):** the rail carries *sequence*
  (which plan comes after which, in the projection's own order); each
  node carries *state* (its fill IS the plan's state token). Both are
  information. Nothing else was added: no new hues, no glow, no
  decoration. QUIET holds — the thread is a 2px hairline at `--line-1`.
- **Nothing that worked was lost:** New (plan/trip/idea), completion
  actions on forming cards ("Pick a day"), Drop it with its one-ask
  confirm, the intentions section, the Working-toward goals with the
  harmony2 link/unlink picker, and the Someday shelf all render and
  behave exactly as before (full web suite delta: zero — see Results).
- The grouped-list projection is still the client adapter stand-in
  named in R18 (W-GAP-29): `graphListFromPlans` groups finished card
  fields; it still never invents a plan's state. This wave changed
  *presentation and separation* (private split, terminal-status
  mapping), not that standing gap, which remains named.

### 2. Past / completed view

The **Past** lens is now a deliberate, obviously named view: selecting
it heads the surface **"Completed and past plans"** with the line
"Everything that already happened, in the order it settled," an honest
"Nothing completed yet." when empty, and only past-family cards.

Truth fix found while building it: the adapter's status→family map had
no rows for the backend's own terminal statuses **`completed`** and
**`expired`** (`SharedPlan.@statuses`), so a completed plan fell
through to **forming** and could never appear in Past. Both now map to
`past`. The folded Past group on the All lens is unchanged.

### 3. Private graphs

- **Model (additive migration `20261030010001`):** `shared_plans.is_private`
  (boolean, default false) + nullable `place_lat`/`place_lon`; new tables
  `plan_location_shares` and `graph_locks`. Nothing renamed, nothing
  tightened, no data deleted.
- **Server-side exclusion (the real privacy):** `list_plans_for_user/2`
  never returns a private plan to anyone but its creator — other
  participants' lists simply do not contain it. The creator's list
  carries it flagged `is_private`. Setting the flag is **creator-only**
  (`SocialFlow.set_plan_private/3`, `POST /opal/plans/:id/private`); a
  participant attempting it gets 403 and the flag does not move (tested).
- **Client separation:** the one adapter (`graphListFromPlans`) splits
  private plans out of groups, lens counts, the Center deck, and the
  Home feed. Their only list home is the Private area.
- **The gate:** a "Private graphs" section at the foot of Graphs. Locked,
  it shows only the count — never a title. Unlock verifies the passcode
  **server-side** (`POST /opal/graph-lock/verify`); a wrong code returns
  403 and the area stays shut (tested at both layers). First use sets the
  passcode through the same form (`POST /opal/graph-lock`). Relock: the
  Lock button, leaving the surface (unmount), or the app going to the
  background (`visibilitychange`). The code is never stored or checked
  client-side; unlock state lives only in component memory.
- **Make private / Make visible:** quiet text buttons on every list card
  (when wired), on private cards (Make visible), and on the plan detail.

#### The gate's real security scope — stated plainly, no theater

`GraphLock` stores only a salted PBKDF2-HMAC-SHA256 hash (120k
iterations, per-user random salt); verify is constant-time and returns a
boolean — it mints no token and unlocks no server data. This is a
**viewing lock on the owner's own signed-in device**, the iPhone Hidden
Photos threat model: it stops a person holding the owner's unlocked
phone from casually opening the Private area. It is **not** encryption,
**not** account security, and **not** a barrier against anyone who holds
the account session (the owner's own list payload contains their private
plans, flagged — that is how the area can render them after unlock).
The protection that does not depend on the lock is the server-side one
above: no other account ever receives the plan. **Biometric unlock is
HONESTLY ABSENT:** this web codebase has no biometric/native-auth bridge
(the native host bridge exposes media/push, no local-authentication
API), so no biometric affordance is painted. If the native shell gains
local auth, it can front the same verify call later.

One nuance, named: an existing participant who already knows a plan's id
can still read that plan's history endpoint (`get_plan_for_user` access
is unchanged) — privacy here governs *discovery and listing*, which is
where "other people seeing your graphs" happens. Tightening direct-id
reads for participants is a one-line follow-up if the founder wants the
stronger form.

### 4. Graph detail = the living plan

**Location backbone — what existed, what was missing.** R12 wired
*device* location end to end (`Center.DeviceLocation`: coarse, granted
coords stored per user for venue ranking / near-me). Its own moduledoc
states the privacy law: those coords are **not** travel sharing and must
never be conflated with it. The travel controller deliberately rejects
GPS. There was **no per-plan sharing consent, no joiner position store,
and no venue coordinates anywhere** — `GraphConvoyPanel` /
`journeyPresence` are client-only types with no backend behind them, and
`SharedPlan.location` is a label string. So the founder's backbone —
"everyone who's joining gives permission to share where they're
currently at" — **did not exist**. It is now built, additively:

- **`PlanLocationShare`** (`plan_location_shares`): one row per
  (plan, joiner), written only by that joiner's explicit opt-in for
  **this** plan (`POST /opal/plans/:id/location-share`, participant-only;
  `DELETE` stops). Coords pass through `DeviceLocation.validate_coords/1`
  — the same 3-decimal (~110 m) coarsening as the Center ingest; raw
  precision is never stored. A share **expires after 4 hours**; an
  expired row reads exactly as never shared.
- **Distance, honestly:** the detail's Who rows come from the ONE
  projection (`PlanHistory.for_plan`), which now finishes each row's
  location line server-side:
  - no fresh share → `location_state: "not_sharing"`, label
    **"Not sharing location"**, distance `nil` — never a fabricated
    position, distance, or "not left yet" guess;
  - fresh share + the plan place's own coordinates (`place_lat/place_lon`,
    new nullable columns — populated only when a real place record
    carries them) → a **measured** coarse distance via the one distance
    function (`DeviceLocation.distance_label`), labelled in the finished
    string as measured from the location they shared for this plan, with
    `distance_basis: "measured"` (F-11 discipline: the basis travels
    with the figure);
  - fresh share + no place coordinates on the plan → "Sharing location —
    distance unavailable: this plan's place has no coordinates yet."
    Sharing is true; the distance is honestly absent, with its reason.
- **The gap that remains, named:** no existing writer populates
  `place_lat/place_lon` (places are label-only today; there is no venue
  geocode step in the plan flow). Until a place-resolution step writes
  them, real plans will show sharing-without-distance rather than
  measured distances. The projection, the math, and both honest states
  are in place and tested with real coordinates; inventing venue coords
  from label strings was refused.
- **UI:** the detail's Who section is titled **"Who is coming, and
  where they are"**; each row shows the answer (Going / Waiting /
  Cannot make it) plus the finished location line. Under it, the
  viewer's own per-plan share controls ("Share my location for this
  plan" / "Stop sharing") with the consent stated in plain words (per
  plan, 4 hours, only this plan's people), wired through the existing
  device-coords grant (`getDeviceCoords`) to the new endpoints, with the
  detail re-read from the server after every change. No handler wired →
  no control renders.

## Apple Design Brain — how this surface answers the standard

- **Journey first:** the surface is organized as one journey through
  time — upcoming threads at the top in the order they will happen, the
  completed past behind one deliberate lens, and the private graphs in
  their own gated room at the end. Every step of every journey (make a
  plan → finish what's missing → see who's coming and where they are →
  it happens → it settles into Past) has exactly one home.
- **Restraint / nothing decorative without a job:** the only new visual
  element is the thread; its two parts each carry a fact (sequence,
  state) and are recorded above. No new colors — state meaning rides
  the existing state tokens and only those. The Private area adds no
  chrome beyond a lock affordance; its quietness IS the privacy signal.
- **Hierarchy & typography as voice:** group titles and the Past view's
  name do the explaining ("Completed and past plans", "Who is coming,
  and where they are"); finished human sentences carry every state,
  including the uncomfortable ones ("distance unavailable: this plan's
  place has no coordinates yet") — no icons pretending to be answers.
- **Every transition earned:** the gate's unlock is the one moment of
  ceremony, and it is a real server verification, not an animation;
  relock is silent and automatic. No transition was added anywhere else.
- **Design-to-code:** everything above is shipped code on
  `muse/r19-graphs`, exercised by the suites below — no mockup-only
  claims, and every absent thing (biometrics, venue coordinates) is
  named absent in this report rather than painted.

## Files changed

Backend (`apps/opal_core`):
- `priv/repo/migrations/20261030010001_r19_graphs_private_location_lock.exs` (new)
- `lib/opal_core/social_flow/plan_location_share.ex` (new)
- `lib/opal_core/social_flow/graph_lock.ex` (new)
- `lib/opal_core/social_flow/shared_plan.ex` — fields, cast, contract keys
- `lib/opal_core/social_flow.ex` — `set_plan_private/3`, list exclusion
- `lib/opal_core/social_flow/plan_history.ex` — who-row location projection
- `lib/opal_core_web/controllers/graph_people_controller.ex` — 6 actions
- `lib/opal_core_web/router.ex` — 6 routes
- `test/opal_core_web/r19_graphs_test.exs` (new, 11 tests)

Web (`apps/opal_web`):
- `src/api/productClient.ts` — contract fields + 6 client functions
- `src/c2/shell/projections.ts` — `privateCards`, detail who location fields
- `src/c2/shell/shellData.ts` — private separation, terminal-status map fix, history location mapping, Home feed exclusion
- `src/c2/shell/C2Graphs.tsx` — thread, Past view, Private gate, detail Who + share controls + private toggle
- `src/c2/shell/C2Shell.tsx` — lock state, r19 event wiring, Center deck exclusion
- `src/c2/shell/C2ShellReview.tsx` — projection fixture gains `privateCards: []`
- `src/c2/shell/c2shell.css` — thread styles (tokens only, no raw hex)
- `src/c2/shell/r19Graphs.test.tsx` (new, 11 tests)

## Results (verbatim)

RESULTS_PLACEHOLDER

## Pack capture list (owed — rendered proof at phone size, both modes)

This wave's evidence is the suites above (jsdom + API-level). The
rendered pack for the founder walk must capture, from the served
integrated build: (1) Graphs All lens — future thread with forming /
ready / happening nodes, light + dark; (2) Past lens — "Completed and
past plans" with past-state cards; (3) Private area locked (count only,
no titles); (4) Private gate — wrong code error state; (5) Private area
unlocked with a private card + Make visible; (6) plan detail — Who rows
with a sharing joiner (measured distance line) and a not-sharing joiner
("Not sharing location", no distance); (7) plan detail — share controls
+ the sharing-without-place-coordinates line; (8) a card's Make private
quiet action. No capture was taken by this wave (no live-browser access
from the build worker); the list is the exact shot spec for the parent
pack pass, and nothing here claims rendered proof it does not have.
