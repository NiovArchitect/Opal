# Repair #24 - Cluster G: WS-7 reduced-motion hardening + V2Dock dead rule + WS-8 place-energy D-P triage

Branch: muse/r24-motionplaces (base c74adfe3, the muse/repair-23 tip).
Worktree: wt-r24-motionplaces. No merge, no deploy, no Pass 2,
heat_map_ui untouched (still false), tier qualitative everywhere,
no numerals added to any wire, no polling added, no migrations.
node_modules was absent in apps/opal_web: npm install --no-audit
--no-fund was run there (150 packages) - noted per the brief.

Commits:
- e88b5f0d WS-7 reduced-motion hardening + cascade pin
- b2d06559 V2Dock dead rule + dead export removal + pin
- db9501a5 D-P1 identity-first grouping + D-P4 place seed (web)
- bcb5f727 D-P1 backend pin (home feed place_id)

## WS-7 - reduced-motion hardening

The R22 fragility, restated from the code at the R23 tip:
c2shell.css assigned the per-state orbit animations in plain
rules - .c2s-stone[data-state="happening"] .c2s-stone-orbit
{ animation: c2s-stone-orbit 7s linear infinite } and its new /
loved / nearby siblings, specificity 0-3-0 each - while the
reduced rule inside @media (prefers-reduced-motion: reduce)
was .c2s-stone-orbit { animation: none }, specificity 0-1-0.
The reduced rule lost the animation-name cascade; the spec was
met only because styles.css:3495 carries the global collapse
(* { animation-duration: 0.01ms !important; ... }).

The fix, by construction: ALL four per-state orbit animation
rules moved into ONE @media (prefers-reduced-motion:
no-preference) block in c2shell.css. Under reduce, no animation
is ever assigned to .c2s-stone-orbit, so there is nothing for a
cascade to lose and the global !important rule is no longer
load-bearing for this surface. The reduced rule stays, now
explicitly defense in depth. The motion design under
no-preference is byte-identical: the same four declarations,
verbatim - happening 7s, new 26s, loved 44s, nearby 34s, same
keyframes (c2s-stone-orbit), same selectors.

The pin: src/c2/shell/r24ReducedMotion.test.ts (4 tests) - a
media-aware CSS parser plus a specificity audit over the shipped
c2shell.css (the r22StreamRhythm CSS-text precedent). It fails
if ANY rule assigns a non-none animation (or the orbit
animation-name / a real animation-duration longhand) to
.c2s-stone-orbit outside the no-preference gate, at any
specificity; it pins the four durations byte-exact; and it
states the historical losing fight as an assertion (reduced
rule computes to 0-1-0, every gated state rule to 0-3-0), so a
future un-gating is caught structurally, not by a cascade the
sheet already proves the reduced rule would lose.

DISPOSITION: WS-7 FIXED + evidence (r24ReducedMotion 4/4;
r22Stories 8/8 unamended in the same runs).

## V2Dock - dead rule

Claim verified at the R23 tip before touching anything:
- grep V2Dock across src returned ONLY its definition at
  opalUi/v2Primitives.tsx:311 - no import, no render, no test.
  OpalApp.tsx imports eight other symbols from v2Primitives;
  V2Dock is not among them. OpalResolution.tsx imports only
  SharedRealityPlate from that file.
- The bar rule's selectors require .tabbar WITHOUT
  .tabbar-option-b and a .tab.active / .tab.on descendant.
  The live legacy dock renders className "tabbar
  tabbar-option-b" with .dock-tab children (OpalApp.tsx:7546,
  11488) - excluded by the rule's own :not() and by class. The
  C2 pad is .c2s-dock. V2Dock was the only component in src
  that ever produced .tab / .tab.active markup.

Removed together: (1) the 18x3 cyan bar rule in
theme/technicolorProduction.css (both ::after selectors, the
whole rule); (2) its reduced-motion companion
(.tab.active::after { box-shadow: none } inside the sheet's
reduce block - it styled only that bar's shadow); (3) the
V2Dock export in v2Primitives.tsx. Left deliberately: the
generic [data-technicolor] .tab.active { color } rule - it is
not the named bar rule (no ::after, no dimensions) and belongs
to the legacy .tab family styles.css also carries; the pin
asserts it survives as an over-deletion guard.

Pin: src/theme/r24DeadDockRule.test.ts (3 tests) - comments
stripped (rules, not prose): no .tab.(active|on)::after
selector, no 18px-by-3px block, no V2Dock export in
v2Primitives, live docks intact in OpalApp.

DISPOSITION: V2Dock FIXED + evidence (r24DeadDockRule 3/3;
technicolorProduction 8/8 and signalGrammar 7/7 unamended).

## WS-8 - D-P triage (each item, code evidence at the R23 tip)

### D-P1 place identity

Evidence per record family:
- LIVES honestly carry a stable id: LiveRoom.to_contract emits
  venue_id, and its nested venue contract (Venue
  .to_public_contract) emits the venue record's id AND its
  provider place_id. The client extractor
  (livePlaceInputsFromRooms) was DISCARDING all of it.
- MOMENTS honestly carry one underneath: publishing normalizes
  place_ref with provider_place_id (SocialMomentPublishing
  .normalize_place), but HomeFeed.to_feed_card projected only
  place_label - the id died at the feed card.
- PLANS honestly carry NONE: SharedPlan has location (string)
  and place_lat/place_lon and no venue/place column at all;
  to_contract / plan_payload emit no place identity. Nothing
  truthful exists to project, and coordinates are not an id.

Fix (identity-first grouping in placeStonesFromGraph):
- livePlaceInputsFromRooms now carries placeId (venue_id, else
  venue.id, else venue.place_id). HomeFeed.to_feed_card additively
  projects "place_id" from the moment's own place_ref
  provider_place_id (nil when the record carries none - never
  derived). The home adapter and PlaceMomentInput carry it
  through. OpalPlanContract gains an optional place_id, read
  only if a future contract honestly carries it; today plans
  bridge by name.
- Join law: a record WITH an id groups on the id - different
  ids never merge (two same-name venues stay two places),
  same id merges across variant display strings; a record
  WITHOUT an id bridges by normalized name into the one stone
  its name identifies; if the name is ambiguous between two
  id-distinguished stones, the id-less record forms/joins the
  name-only stone rather than being silently attributed; an id
  record ADOPTS a single pre-existing name-only stone of its
  name. Stone keys stay unique: "id:<id>" / "name:<normalized>".
- withPlaceSignals now joins by the stone's NAME (normalized),
  not its key - the signals endpoint's contract is names
  (PlaceSignalController), and an id key could never match one.
  Residual, named: the server tier itself is still computed
  per requested NAME inside PlaceSignal (its API takes names
  by design); making the tier id-keyed needs a contract change
  to that endpoint, not a client fix.

Pins: r24Places.test.tsx (D-P1 half: extractor precedence,
same-name/different-id = 2 stones, same-id/variant-name = 1,
name bridge preserving the R22 live+plan+moment composition,
adoption, ambiguous-name non-attribution, no-id grouping
unchanged, signal-by-name join onto an id-keyed stone) and
backend r24_place_feed_id_test.exs (feed card place_id present
from the record, nil when none).

DISPOSITION: D-P1 FIXED + evidence (scope stated exactly:
grouping/join on the client builder for every record family
that honestly carries an id today - lives and moments; plans
remain name-bridged because no plan-side identity exists in
the schema or the contract - named residual, not a silent
skip; server tier name-contract residual as above).

### D-P2 public / stranger layer

DISPOSITION: D-P2 design-standing (one line, per the brief):
the no-stranger-layer law stands; not built, not approximated.

### D-P3 check-in presence

Evidence: what R23 already closed - the per-plan location
share lawfully feeds PlaceSignal's nearby (fresh
PlanLocationShare, 1.0 km coarse, per plan). What remains is
check-in-circle presence, and no lawful place-level read for
it exists at the tip: check-in sweeps are per-source /
per-sweep endpoints (router: POST /checkins, GET
/checkins/for-source, GET /checkins/:id - plan-scoped, never
place-scoped); CheckinResponse rows hold a member's STATED
words (where_text / shared_area) inside a private sweep -
R23 already evaluated check-in responses as an input and
rejected them (stated text in a private summary, not a
consented position). VenuePresenceScan is Lives venue
VERIFICATION machinery (Verification.ex), with no
viewer-facing read and no route. Building check-in presence
needs a new consent contract (what a plan's circle may show
at place level, to whom) before any read could be lawful.

DISPOSITION: D-P3 NOT-FIXED + named reason: missing contract
(no lawful place-level check-in read exists; the only
check-in records are private stated text, already rejected
as a position input in R23; a place-level consent contract
is a founder/design decision before any build).

### D-P4 live-only start door

Evidence: the flows2 seed machinery composed seeds only from
a plan or a moment; a live-only place's startSeed was null
and PlaceStoneView rendered no door (pinned as absence in
R22 PE-4). The design record's own full-build alternative -
"carries the place directly, as the place view's own prefill
contract" - is exactly the create flow's prefill shape
(C2Shell createPrefill takes location with an empty party).

Fix: flows2 gains a third SeedSource kind, "place"
(PlaceSeed: placeLabel + builder-internal placeId).
doorsForSource(place) = ["my-people"] only - no original
party exists to join or repeat, and no author to go solo
from. seedCreateFor(place, "my-people") returns a prefill
carrying ONLY the place as location: empty title (the user's
to write - nothing is borrowed from the live room), empty
starting party with the Who picker open, close_circle
audience, and NO lineage fields (no sourcePlanId, no
inspiredByMomentId - a live room is still not a seed source
and claims no provenance; its placeId never rides into the
form, whose contract has no place-id field). The builder
composes it only when a place has a live room and no plan /
moment seed (plan and moment seeds still outrank it). The
two R22 pins that asserted the old absence were amended with
a recorded R24 amendment header in r22Places.test.tsx
(PE-4 seed shape + the live-only surface test, which now
asserts the door renders and hands over the place seed) -
never silently.

Pins: r24Places.test.tsx (D-P4 half: doors law, exact
prefill shape, builder precedence) + amended r22Places pins.

DISPOSITION: D-P4 FIXED + evidence (r24Places 11/11 total;
r22Places 16/16 as amended).

### D-P5 place page depth

Evidence: PlaceStoneView renders only what
PlaceStoneProjection carries (name, energy, the three signal
groups, the seed door) and makes no read by design. No
place-record read is wired into Home at the tip:
homeFromSession reads plans, the feed, visible lives, and
(signals) tiers - no place details call exists in
productClient for a stone (the place candidates read in
GoLiveFlow / creation is a search-for-a-new-plan read, not a
read of THIS stone's record). The records themselves are
short of the depth asked: Lives.Venue carries name /
formatted_address / types - no hours, no imagery fields; a
plan-formed stone may be name-only (D-P1 residual) with no
record to read at all; and energy HISTORY exists nowhere -
the signal is computed at read time (Heat / PlaceSignal)
with no stored snapshots to braid over time.

DISPOSITION: D-P5 NOT-FIXED + named reason: missing
contract (no place-record read for a stone exists, the
venue record carries no hours/imagery to project, roughly
half of stones are name-only with no record identity, and
no energy history is stored anywhere - each needs its own
contract/design before depth can be honest, not painted).

### D-P6 feed window

Evidence, split by what R23 already changed: the TIER no
longer under-reads at 20 - PlaceSignal computes server-side
and its moments leg reads SocialMomentPublishing
.list_for_viewer at limit 100. What still under-reads is the
CLIENT builder: homeFromSession calls fetchHomeFeed
{ limit: 20 } and never follows the feed's cursor/has_more,
so S6 moment energy, momentsHere captions in the place
view, and moment-seed eligibility still see only the first
feed page; a place whose moments sit beyond it is invisible
to the stone's memory leg even when its tier is warm. The
clean fix the design record names - a place-scoped backend
projection of moments - does not exist: the only
place-scoped endpoint is POST /places/signals, whose
serialization law is tier-only (no moment rows may ride it),
and widening the feed page silently is the one move the
design record explicitly refuses.

DISPOSITION: D-P6 NOT-FIXED + named reason: missing
contract (no place-scoped moment read exists, and none
falls out of the signals path - that path is tier-only by
its own serialization law; the tier half is already cured
server-side by R23, the client moment leg awaits the
place-scoped projection contract).

### D-P7 backend projection

Confirmed closed by R23 at this tip, no new work needed:
OpalCore.SocialFlow.Ambient.PlaceSignal + PlaceSignal
Controller (POST /api/v1/product/places/signals) compute the
tier server-side from viewer-permitted facts only, tier-only
on the wire (the backend suite key-scans the payload);
81a6993c registered PlaceSignal in the plan-projection read
registry (the gyroscope registry law for plan-table reads);
the client folds it in via withPlaceSignals. This cluster
re-ran that suite green (below) rather than taking the
handoff's word for it.

DISPOSITION: D-P7 FIXED + evidence (closed by R23;
confirmed at the R24 tip by code read + the re-run backend
suite, 5/5 place-signal tests inside the 6-test run below).

## Laws held

Gyroscope registry: no new backend plan-table read was added
(the only backend change is HomeFeed's additive place_id
projection over the moment the feed already carries).
heat_map_ui stays false (untouched); the tier stays
qualitative - place_id is an identity string on an existing
card, no numeral was added to any wire; counts-free surfaces
unchanged; no fake data (every id projected comes from the
record itself; nil/absent stays name-grouped); no polling;
plain hyphens in new prose; additive-only (one new optional
feed field, one new optional client field, no migration).

## Test accounting (counts read from the run output)

Web (vitest, node_modules installed fresh per the brief):
- Battery 1 (17 files): r24ReducedMotion 4, r24Places 11,
  r22Places 16, r23PlaceSignal 7, r22Stories 8, r22DockContract
  9, r22StreamRhythm 10, r21Flows2, c2ShellSurfaces,
  homeSocial, r24DeadDockRule 3, technicolorProduction 8,
  signalGrammar 7, unifyDrift, repair18Layering,
  f1StoryViewerLayout, r20Connect -
  "Test Files 17 passed (17), Tests 185 passed (185)".
- Battery 2 (6 files): huntFixShellData, ja09LocationShare
  Honesty, r23LiveWatch, r21Creation, harmony2, c1ShellWiring -
  "Test Files 6 passed (6), Tests 66 passed (66)".
- Typecheck: npx tsc -p tsconfig.json --noEmit - exit 0, no
  output.

Backend (MIX_ENV=test, MIX_BUILD_PATH=r24int-scratch
/build-motionplaces, DATABASE_URL opal_test_r24motion on
127.0.0.1:5433, DB created for this cluster):
- mix test test/opal_core/social_flow/r24_place_feed_id
  _test.exs test/opal_core_web/r23_place_signal_test.exs -
  "6 tests, 0 failures" (1 new D-P1 feed pin + R23's 5
  place-signal tests).
- mix format --check-formatted on the new test file: clean.
  home_feed.ex FAILS the check at the BASE commit too
  (verified against c74adfe3's copy) - pre-existing
  formatting drift in that file, left untouched rather than
  reformatting an unrelated file into this diff; the full
  mix precommit alias would surface that pre-existing state
  and was not run for that reason (its compile+test legs are
  covered above for everything this cluster touched).

No rendered/glass proof is claimed: this cluster's surfaces
are a CSS media-gate (proven by the cascade audit pin), a
dead-code removal (proven by grep + pins), and builder/seed
logic (proven by the builder suites). The place view's new
live-only door renders through the already-proven
PlaceStoneView start-door path, now fed a seed where R22
fed none.
