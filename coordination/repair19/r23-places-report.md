# REPAIR #23 - WS-23-5 PLACE SIGNAL, FELT - cluster report

Branch: muse/r23-places, based on muse/repair-23 at 79980a5f
(the membership merge - Wave 1 integrated: voice, audience,
membership). Commits: 66675d81 (backend) + the web/report
commit carrying this file. Gates held: no merge, no
production, muse/repair-17 untouched, plain hyphens only.
No migration was added (migration count unchanged at 120,
verified by file count on disk; the test DB opal_test_r23plc
was migrated from empty to 120 for this run).

Closes audit R-7 and R-8 (place energy / proximity absent at
the glass), building on the R22 WS-5 slice exactly as
re-pinned in repair23-wiring-plans.md Section 11 row 6.

## 1) THE READ PATH - shape and hang-point defense

NEW: POST /api/v1/product/places/signals
  request:  {"places" => [names the client's home feed holds]}
  response: {"signals" => [{"place", "tier", "nearby"}],
             "nearby_user_ids" => [user ids],
             "heat_map_ui" => false}

Backend: OpalCore.SocialFlow.Ambient.PlaceSignal (new) behind
OpalCoreWeb.PlaceSignalController (new); one route line.

HANG-POINT DEFENSE (dedicated read, chosen over riding the
home/feed payload):
- The places Flows names do not live in the home feed payload:
  the R22 stones are composed client-side from THREE reads
  (plans list, home feed moments, visible lives). A per-place
  field on the feed payload alone could not cover plan-only or
  live-only places - exactly the cold/warm contrasts this
  signal exists to carry.
- A dedicated read lets the client name precisely the places
  its own permitted reads already surfaced (the stones'
  names), and lets the server recompute from ITS side of the
  same gates, never trusting client counts. The request is a
  list, so the read is a POST; it writes nothing.
- The payload is computed per (place, viewer) from
  Heat.compute's contextual_trending inputs gathered ONLY
  from viewer-permitted facts: the viewer's own plans
  (creator-or-participant gate, private and virtual excluded -
  the R22 builder's input law mirrored), visibility-gated
  moments (SocialMomentPublishing.list_for_viewer), and
  friend-visibility-gated lives (Lives.list_visible_lives).
  Friends/proximity weighting (plan 5.5): distinct other
  people at the place (authors, hosts, participants) feed
  friends_nearby_count; the viewer's own plans there feed
  overlapping windows and group coordination; their moments
  feed shared interest; world heat's local_activity is scaled
  from the viewer's OWN visible activity only. No global count
  is read anywhere.

## 2) TIER VOCABULARY + CANON CHECK

quiet / stirring / warm / alive - the plan's working set,
kept. Thresholds on contextual_trending: alive >= 0.60,
warm >= 0.48, stirring >= 0.36, else quiet.
Canon check: the tier never takes a color of its own. On the
glass it is glow INTENSITY within the place's existing
state-canon fire color (happening cyan / action red / ready
gold / forming violet / past gray, from data-energy-family).
Warmth vocabulary (cold / ember / lit / radiant) is a
light-level scale, not a state: it borrows no state name and
implies no state. The one new colored element, the nearby
story ring, wears the ready canon gold (--state-ready /
--orb-indicator-ready) - proximity as "ready to happen",
which is the canon's own meaning for that light.

## 3) SERIALIZATION PURITY - proof

Backend suite r23_place_signal_test.exs, test 1: the full
response body is key-scanned - top-level keys are exactly
{signals, nearby_user_ids, heat_map_ui}; each signal's keys
are exactly {place, tier, nearby}; the encoded body contains
no "contextual_trending", "world", "network", "relationship"
or "heat_contribution" keys, and heat_map_ui is false. Raw
Heat floats are computed in PlaceSignal and die there; the
only numbers in the payload are none at all (tiers are
strings, nearby is boolean, nearby_user_ids are id strings).

## 4) THE STONE'S WARMTH + RECONCILIATION WITH R22

- shellData.placeWarmthLevel(place): the stone's rendered
  warmth is the WARMER of (tier warmth: quiet->cold,
  stirring->ember, warm->lit, alive->radiant) and (the R22
  energy level). The tier is a warmth FLOOR in light; it can
  lift a stone whose own records are modest, and a quiet tier
  can never dim a plan state that is really happening.
- The fire COLOR is untouched: data-energy-family still
  carries the plan states exactly as R22 (the R22 pulse on a
  radiant happening stone now also fires on warmth-radiant).
  Plan states keep speaking as they do; the tier changes
  intensity only, never hue.
- CSS: --place-glow steps cold 8% / ember 18% / lit 34% /
  radiant 52% (ember/lit/radiant are the R22 strengths; cold
  is the new resting floor). The tier is legible as STATIC
  intensity - the pulse is an addition on the warmest
  happening stones, never the carrier - so reduced motion
  loses nothing.
- Zero numerals, zero "trending" labels, zero leaderboard,
  zero tier words in visible text (pinned in PS-3/PS-4).
- r22Places (16 tests): GREEN, assertions unamended. The
  suite header carries a recorded amendment note: stones and
  the view now also stamp data-signal-tier / data-warmth /
  data-nearby (defaults "none" / R22 warmth / "false") and the
  view renders a warmth halo. New pins live in
  r23PlaceSignal.test.tsx.

## 5) THE PLACE SURFACE - legs shipped / declared

The R22 place view already carries, from its own projection:
lives there now, moments anchored there, upcoming graphs
there, memory graphs - each with real doors (graph detail
per plan; start-a-plan-here where a lawful seed exists).
This workstream adds the tier's FELT STATE to that view:
data-signal-tier / data-warmth / data-nearby stamps + a
warmth halo (light only, in the place's canon fire; nearby
blends ready gold into it). No word about heat is added.
Leg-by-leg against the plan:
- lives there now: ALREADY SHIPPED in R22 (from the
  visible-lives read). A scoped GET /lives/visible?place=
  variant adds nothing - the view's rows are the stone's
  own records, already place-scoped by construction.
  DECLARED unnecessary, not missing.
- moments anchored there: ALREADY SHIPPED in R22.
- upcoming graphs there: ALREADY SHIPPED in R22.
- lives-at-place via a NEW scoped read: NOT ADDED - same
  reason: no read closes more truthfully than the records
  the stone already carries. D-P5 (place page depth: hours,
  place-record imagery, energy history) stands declared -
  no place-record read is wired into Home yet.

## 6) NEARBY TIER - verdict: SHIPPED, with its proof

- Server: nearby per place = another participant of one of
  the viewer's own plans at that place holds a FRESH
  PlanLocationShare for that plan (expires_at > now) whose
  shared position is within 1.0 km of the plan's own place
  coordinates (DeviceLocation.haversine_km, the one distance
  function). No plan coordinates = no signal. Check-in sweep
  responses were evaluated and REJECTED as an input: their
  location is stated text / a tapped area in a private
  organizer summary, not a position consented for proximity
  - the plan's own per-plan share is the lawful backbone,
  exactly as PlanHistory already rules.
- Per-person: nearby_people/1 returns the same derivation as
  a user-id set; it rides the signals response as
  nearby_user_ids (ids only, no position).
- Glass: (a) the place stone and place view stamp
  data-nearby; nearby on the stone reads as a ready-gold
  border edge (kept inside the stream glow room - WS-4's
  containment law; see the CSS note), on the view as ready
  gold blended into the warmth halo. (b) story stoneState
  admits "nearby" (projections union, the W-9 comment
  updated), ordered happening > nearby > loved > new > seen,
  assigned by the one adapter from nearby_user_ids, with the
  rail's one-word caption "Nearby" in the same grammar.
- PROOF (backend, two-account legs in
  r23_place_signal_test.exs): sharing pair - A reads B nearby
  at Market Hall and B is in A's nearby_user_ids (1 test,
  incl. the reverse direction: B reads nearby false because A
  never shared; and the expired-share leg: after B's share is
  moved into the past, A reads nearby false again);
  non-sharing pair - A at Solo Ridge (D on the plan, nobody
  shares) reads nearby false, D reads nearby false everywhere
  and sees nobody in nearby_user_ids; plus the no-share-row
  plan test (nearby false, nearby_user_ids empty). Web PS-3/
  PS-5 pin the stamps and the rail state render.

## 7) FILES CHANGED

Backend (commit 66675d81):
- apps/opal_core/lib/opal_core/social_flow/ambient/place_signal.ex (new)
- apps/opal_core/lib/opal_core_web/controllers/place_signal_controller.ex (new)
- apps/opal_core/lib/opal_core_web/router.ex (one route)
- apps/opal_core/test/opal_core_web/r23_place_signal_test.exs (new, 5 tests)

Web (this commit):
- apps/opal_web/src/api/productClient.ts (getPlaceSignals +
  PlaceSignal / PlaceSignalTier types)
- apps/opal_web/src/c2/shell/shellData.ts (getPlaceSignals
  import; placeWarmthLevel / withPlaceSignals; the signal
  read + merge + nearby stone ordering in homeFromSession)
- apps/opal_web/src/c2/shell/projections.ts (PlaceStone
  Projection signalTier / signalNearby; stoneState "nearby"
  + its comment)
- apps/opal_web/src/c2/shell/C2Home.tsx (stone stamps:
  data-signal-tier / data-warmth / data-nearby; the "Nearby"
  caption word)
- apps/opal_web/src/c2/shell/PlaceStone.tsx (view stamps +
  warmth halo)
- apps/opal_web/src/c2/shell/c2shell.css (warmth scale, view
  warmth + halo, nearby stone edge, nearby story ring)
- apps/opal_web/src/c2/shell/r23PlaceSignal.test.tsx (new,
  7 tests, PS-1..PS-5)
- apps/opal_web/src/c2/shell/r22Places.test.tsx (header
  amendment note only; no assertion changed)

## 8) TEST COMMANDS + COUNTS

Backend (MIX_ENV=test, MIX_BUILD_PATH=r23plc-scratch/
build-test, DATABASE_URL on opal_test_r23plc, migrated from
empty: 120 migrations):
- mix test test/opal_core_web/r23_place_signal_test.exs
  -> 5 tests, 0 failures.
- Affected families: mix test r23_place_signal +
  r23_audience_invisibility + social_moment_engagement_api +
  paste_k_lives + social_moment_publishing +
  social_moment_engagement -> 50 tests, 0 failures.
- Sharing backbone families: leave_by +
  place_coordinates_writer + place_coordinates_writer_api
  -> 39 tests, 0 failures.

Web (apps/opal_web, ./node_modules/.bin/vitest run):
- r23PlaceSignal + r22Places -> 23 tests, 0 failures
  (7 new + 16 R22).
- Full c2 shell folder set (src/c2/shell/) -> 500 tests:
  499 passed, 1 failed. The one failure is
  r20Connect.test.tsx's R20 F-10 PIN test - IF-1, present
  name-for-name in the standing baseline
  (r23int-scratch/baseline-web-failed-names.txt); it is the
  rail cluster's item and this workstream changed neither
  side of it. (During the run my first nearby-stone
  box-shadow tripped r22StreamRhythm's glow-containment pin;
  the treatment was changed to a border edge and the suite
  re-ran green - recorded here, not absorbed.)
- Typecheck (tsc --noEmit): exactly 9 errors, the standing
  baseline set (OpalApp.tsx x3, productClient.ts x5,
  YouSettingsDestination.tsx x1); none in this workstream's
  files.

## 9) CAPTURE SPEC (for the coordinator's signature-gated set)

Badge: the served R23 integrated tip after this branch lands.
LIGHT first, phone size, both modes where noted.
1. Warm vs cold (Flows, light + dark): seed a place with a
   live + two moments from the viewer's people (Harbor Pier
   shape) and a place with a single past plan only (Still
   Cove shape). Frame both stones in one scroll position:
   the warm stone's glow reads visibly stronger (radiant
   warmth, happening fire) against the cold stone's resting
   glow - and a full-frame text audit finds ZERO numerals,
   zero "trending", zero tier words.
2. The place view's felt state: open the warm place - the
   warmth halo behind the head at full intensity, the live
   row and moment rows as R22; open the cold place - halo at
   its resting floor. Same frame pair discipline as (1).
3. Nearby, two-account frame pair: with the sharing seed
   (B shares fresh location near the shared plan's place),
   account A's Flows shows Maya's stone in the "Nearby"
   state (ready-gold ring, "Nearby" caption) and the place
   stone with its ready-gold edge; account D's Flows (no
   share anywhere) shows NEITHER - same world, same scroll
   position, the difference is the sharing backbone only.

## DECLARATIONS

- D-P2 stands, untouched and founder-gated: the tier derives
  ONLY from the viewer's own graph. Strangers' energy at a
  place contributes nothing and is never approximated; the
  stone still says "your people", never "everyone".
- D-P1 stands (grouping key is still the display string -
  server normalization now mirrors the client's exactly, but
  no place-record id joins the reads in this wave).
- D-P3 is SUPERSEDED IN PART: check-in presence as a
  place-level read still does not exist, but per-plan
  location sharing (the W7 backbone) now lawfully feeds the
  nearby tier - that is the input R22 declared absent, found
  truthful here and wired.
- D-P6 stands, widened honestly: the server tier reads the
  viewer's plans in full and moments via list_for_viewer at
  limit 100 (vs the feed's first page of 20) - a place whose
  only facts are moments beyond the viewer's first 100
  visible moments is still under-read.
- D-P7 is CLOSED by this workstream: the place-energy signal
  now has a backend projection (PlaceSignal) that every
  client renders the same way; the R22 client builder remains
  the stone's composition (records, lines, doors) while the
  warmth input is server-derived.
- The 1.0 km near-place threshold is this workstream's
  coarse grain choice, named here: roughly a ten-minute walk,
  at the backbone's own ~110 m coarsening it cannot be read
  as a position. No finer grain ships.
- "venues_open" is passed true to Heat (a place named by a
  live record, a plan or a moment is not a closed-venue
  signal); no weather input is passed - no lawful weather
  fact per place exists in the viewer's permitted set, so
  none is invented.
- The signal read is one extra POST per Home load; a failed
  read degrades to the exact R22 surface (no tier, no
  nearby) and is never retried in a loop - no polling was
  introduced anywhere in this workstream.
