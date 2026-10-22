# Repair #22 - Cluster R22-D (WS-5 PLACE ENERGY) report

Branch: muse/r22-places (base fd1d34d3, the Repair #21 tip).
Design record: coordination/repair19/r22-place-energy-design.md
No merge, no production, muse/repair-17 untouched. All frames
390x844, both modes, opal_dev=1 badge.

## What was built

PLACE ENERGY, first slice: place stones in the Flows stream whose
light is the place's REAL activity, computed by one pure builder
(placeStonesFromGraph, apps/opal_web/src/c2/shell/shellData.ts)
from the three reads the Home adapter already makes - the plans
list contract, the visibility-gated home feed, the visible-lives
read. No per-place value is hardcoded anywhere; a place with no
qualifying record renders no stone. One tap opens the place view
(apps/opal_web/src/c2/shell/PlaceStone.tsx, the BondStone sheet
pattern) carrying the same projection: happening here (live rooms
+ plans in their live window), forming and coming (action / ready
/ forming plans, each a door to its graph detail), memory here
(settled plans as doors + moments posted from the place), and the
door out - "Start a plan here", pre-composed through the flows2
seed machinery, rendered only when a lawful seed source exists at
the place.

## The energy computation (signals + sources)

Full spec: design record section 4. Summary:

- S1 live room at the place - GET /lives/visible LiveRoom
  place_label / venue display_name / venue name, status exactly
  "live" (livePlaceInputsFromRooms, the liveFeedFromRooms gate).
  Weight 3. Host rides for the who-is-here lights.
- S2-S5 plans at the place - the plans list contract (SharedPlan
  via SocialFlow.plan_payload), field location. The plan's family
  mirrors the backend's ONE indicator derivation
  (NextPlan.indicator_state) over the contract's own fields:
  live window (active status, start_at <= now, end_at >= now or
  started within 180 minutes when no end_at) = happening,
  weight 2; viewer_state canonically "pending" = action,
  weight 1; status agreed = ready, weight 1; other active =
  forming, weight 1. (placePlanFamily)
- S6 a moment posted from the place - HomeFeed feed card
  place_label (the moment record's place_ref display_name),
  eligibility is the feed's own SocialMomentVisibility. Weight 1,
  memory.
- S7 a settled plan at the place - familyOfStatus past leg
  (completed / expired). Weight 1, memory.
- MEMORY CANNOT IGNITE: S6 + S7 combined contribution caps at 3.
  Levels: 1-2 ember, 3-5 lit, 6+ radiant. Family: strongest
  current signal in indicator precedence; past only when nothing
  current exists.
- Exclusions before counting: the viewer's private plans and
  viewer-settled plans (the adapter's existing filters), virtual
  plans (their location is not a place), location-less plans.
- The stone's fire is the family color from the state canon
  (--state-* tokens); --place-fire / --place-glow defaults were
  added to theme/c2Tokens.css (resting past / ember) to satisfy
  the A1 token audit.

## Declared (by name, from the design record section 8)

- D-P1 place identity: grouping is by the records' normalized
  display string - no stable place id reaches these reads.
- D-P2 public / stranger energy layer: needs a place-level
  visibility and consent contract that does not exist; the stone
  shows the viewer's graph only and its lines say "your people".
- D-P3 check-in presence: no lawful place-level who's-here read
  exists today; presence is stated only for a live room's host.
- D-P4 the live-only start door: a place whose only signal is a
  live room carries no "Start a plan here" (a live room is not a
  flows2 seed source) - proven in tests as absence, not a dead
  control.
- D-P5 place page depth (place-record facts, energy history):
  needs a place-record read wired into Home; not approximated.
- D-P6 feed window: the moment signal reads the feed's first page
  (the adapter's existing limit 20).
- D-P7 backend projection: the computation is the one client
  derivation over finished backend contracts (the Division A
  pattern); the full build promotes it server-side with the
  section 4 definitions unchanged.

## Files changed

- coordination/repair19/r22-place-energy-design.md (new)
- coordination/repair19/r22-places-report.md (new, this file)
- apps/opal_web/src/c2/shell/projections.ts - PlaceStoneProjection
  + HomeProjection.places
- apps/opal_web/src/c2/shell/shellData.ts - placeStonesFromGraph,
  placePlanFamily, livePlaceInputsFromRooms, PlaceMomentInput /
  PlaceLiveInput, homeFromSession wiring (no new read)
- apps/opal_web/src/c2/shell/PlaceStone.tsx (new) - the place view
- apps/opal_web/src/c2/shell/C2Home.tsx - the place stone in the
  stream, the openPlace event, one HOME_AMBIENT_ELEMENTS entry
- apps/opal_web/src/c2/shell/C2Shell.tsx - openPlace wiring,
  PlaceStoneView mount, start-door into the real seedDoor path
- apps/opal_web/src/c2/shell/c2shell.css - place stone + place
  view styles (canon tokens only)
- apps/opal_web/src/theme/c2Tokens.css - --place-fire / --place-glow
  resting defaults, both modes
- apps/opal_web/src/c2/shell/r22Places.test.tsx (new) - 16 pins

## Tests

- New: r22Places.test.tsx, 16 tests, all passing (builder truth,
  memory cap, exclusions, seed law, lives gate, stone render +
  tap wiring, place view groups + doors + D-P4 absence).
- Targeted affected suites: r21Flows2, r21Openings, homeSocial,
  familyOfStatus, huntFixShellData, r20Actions, density - all
  passing (147 tests). c2ShellSurfaces: 9/9 after the token fix
  (the A1 audit charged --place-fire as undefined; the tokens now
  live in c2Tokens.css - this was a NEW failure introduced by
  this slice and fixed in-slice).
- Typecheck: 9 errors, identical to the base count (all
  pre-existing, none in touched files).
- Full web suite: three complete runs on this branch each
  finished 3370 passed / 24 failed (the base commit itself
  records 3370/26 in single-process mode; totals vary by
  execution mode on this shared VM). Name analysis of those
  runs: exactly ONE of the 24 was introduced by this slice -
  the A1 token audit above - and it is fixed (fb2c96b5) and
  re-verified standalone at 9/9. A post-fix union re-run of
  every test file that failed in any full run (13 files, 126
  tests) gives 12 failures, every one name-identical to the
  pre-fix full-run failures and every one in an area this
  slice does not touch (activation x3, availability, R20 card
  menu, authority geometry, grammar CTA, graph detail
  navigation, Paste W4, Paste W5, Wave B Graphs, Wave B Home);
  c2ShellSurfaces passes, and three files that failed
  intermittently in the full runs (ja05ErrorBoundary,
  planCardAtfix, r19ListenRail) passed in the union run -
  load flake on a VM running at load 20+, not signal. A final
  full JSON-reporter run was attempted for a machine-readable
  name list and was starved past 30 minutes by sibling suites;
  the union re-run above stands as the name-for-name check.
  Verdict: no new failures vs baseline attributable to this
  slice; the one it introduced is fixed and pinned green.

## Frames (shots/repair22/places/)

Served from this worktree's own stack (Phoenix :4022 against
opal_dev_r22places, vite preview :5322 of this branch's dist;
the dev chip in the stream frames reads the branch tip). World:
the founder seed plus four moments and one live staged through
the real API (no fixtures injected into the projection). The
capture script asserted the computed energy BEFORE any frame:
Pier radiant/happening, Market lit/happening, at least three
distinct levels present; place-view frames carry additional DOM
assertions (the new surface's gate, per the design record).

- places-stream-dark.png / places-stream-light.png - the Flows
  stream: the live card, then the Pier stone (radiant, happening
  cyan, pulsing glow) reading "Live here now. / Maya Torres is
  live here. / Saturday ride to Oceanside happened here.", the
  Market stone (lit) below it, five ember stones beneath in
  ready / ready / forming / action / past.
- places-view-pier-dark.png / places-view-pier-light.png - the
  place view for the Pier: the live row, the settled ride as a
  door, three moments in memory, "Start a plan here".
- places-view-market-dark.png / places-view-market-light.png -
  the place view for the Market: "Farmers market run" happening
  in the now group, the Saturday plan carrying "Action needed -
  2 of 6 going" in coming, the market moment in memory, the
  start door.

Environment note: this shared VM was CPU-starved throughout
(per-request latency 5-25s, load above 24, two cell reboots);
the capture waited on the stones themselves rather than fixed
sleeps. The energy shown is identical across both modes and
matches the builder's arithmetic on the staged records exactly:
Pier 3 (live) + 3 (memory capped from 4) = 6 radiant; Market
2 (happening) + 1 (action) + 1 (moment) = 4 lit.
