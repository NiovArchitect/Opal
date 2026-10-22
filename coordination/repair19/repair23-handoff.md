# REPAIR #23 HANDOFF - Flows wiring (voice, audience, live, follow,
# place signal), the rail founder items, and the proof-debt close

Branch: muse/repair-23, based on the verified R22 close
(muse/repair-22 local tip 5eda86fe, tree b85f5f82).
Integrated code tip: a78bc948 (the served/captured badge).
Records tip: the commit carrying this file.
Worktree: ~/workspace/opal-graph/wt-repair23, clean at records
commit. Coordinator-executed: every cluster was audited against
its committed artifacts with the coordinator's own re-runs
before merging; no cluster was taken on its handoff's word.

GATES HELD: FOUNDER_ACCEPTED = NO. No merge (the founder
merges), no production deployment, no Pass 2 unlock,
muse/repair-17 untouched, additive-only (zero migrations
added; the count from empty is unchanged at 120).

## 1) WHAT THE WAVE WAS

The 2026-10-21 full audit found Flows rich but mute: complete
backends with no C2 wiring. R23 wired them, closed the
membership duplicate the audit charged as F-1, resolved the
integration finding IF-1 under a founder-delegated parent
decision, answered two further founder charges on the story
rail (typography parity, caption taxonomy), and burned the
standing proof debt (the -44px discrepancy and the 25-name
web/typecheck baseline) down to zero unexplained failures.

## 2) RECONCILIATION - every owned item

WS-23-1 FLOWS VOICE (audit F-3, R-1, R-2, R-3) - CLOSED.
Branch muse/r23-voice, code d661aac0, report 556433f3.
The speech-bubble glyph was lying (it opened a private DM);
it now opens the comments sheet (openComments event;
C2CommentsSheet.tsx; server round-trip only, no optimistic
paint). The person glyph keeps the thread door (its testid
unchanged). Repost/save sit in the card action row with state
from the feed payload's own engagement_summary (the backend's
viewer_reposted / repost_count / viewer_saved now mapped by
the adapter). Review also found saved moments read back
NOWHERE; MomentsArchive gained the Saved section fed by
listSaved. Coordinator audit: the cluster suites + adjacent
set re-run 77/77; merged-tree re-run green.
Declarations carried: comment counts are projected but never
rendered (counts-free law); a server-refused repost (private
or specific-people moment) is silent at the glass, same light
treatment as a refused light; comments are not wired on story
cards (story engagement is absent upstream, audit D-M);
live cards carry no comments/repost/save (WS-23-3's scope).

WS-23-2 AUDIENCE MADE REAL (audit R-1's composer half) -
CLOSED. Branch muse/r23-audience, commit 52ef0262.
The server's moment vocabulary is private | specific_people |
group | friends (close_circle is story/live-only); the
composer segment is Friends / Specific people / Only me,
decided by the wiring plan's fallback rule. Both hard-coded
"Audience: Friends" texts are dead (grep zero, test-pinned).
Publish sends visibility + audience_user_ids; the preview
line renders the server's own answer via the new
previewSocialMomentAudience wrapper (endpoint existed,
unwrapped at base); on failure the line is absent, never
fabricated. The specific-people picker rides
listPeopleProjection, account-backed people only, and Share
stays blocked until at least one person is picked. The
MomentsArchive edit carries the same control via a shared
control-value module (its edit excludes specific_people -
the archive contract does not deserialize stored
audience_user_ids; declared). Read-path hole check: NONE
FOUND (SocialMomentVisibility.can_view?/3 specific-people
branch; list, show, and home feed all route through it).
MANDATORY PROOF: ExUnit r23_audience_invisibility_test.exs -
B cannot read A's specific-people post on any of three read
surfaces while C (named) and A can, with A's Friends post as
B's positive control; coordinator re-ran it standalone on a
fresh database: 3/0. Web: r23Audience 6/6, r21Creation 15/15
(one expectation updated - the old pin asserted the defective
visibility-less publish), adopt3 15/15, all coordinator-run.
Glass leg: DECLARED (see section 4).

F-1 / W-5b MEMBERSHIP (added ownership) - CLOSED.
Branch muse/r23-membership, code 345d0519, report 7014e7c3.
Root cause, proven: two key spaces. The manage panel keyed
candidate exclusion, candidate identity, and the add call on
the people projection's assembled identity key, while
membership speaks the account user id; in the rig world a
current member's people row carried a different identity key,
so she was offered as a candidate and listed twice (and the
orbit header's parties line, composed with no dedupe, printed
her twice). The backend write path was always idempotent.
Fix at the candidate-list layer as commissioned, plus the
contract repair it required: people.ex to_contract now emits
account_user_id distinctly (stamped from the accounts store;
nil when the identity has no account row - never a fallback);
the panel keys exclusion, dedupe, and the add call on it;
rows with no account are not offered (they cannot be added);
the members list, the membership projection, the orbit
projection, and OrbitScreen's parties line all dedupe by user
id at composition. Failing-first pin r23MembershipCandidates
(4 tests): red before (member offered under her other key,
add sent identity keys), green after (add sends the account
id, once). Coordinator audit: web 12/12, backend 29/29 on a
fresh DB. Glass proof: membership-panel-light.png and
membership-panel-dark.png - members You / Maya Torres /
Jordan Ellis / Marcus Lee each exactly once; Add people
offers five genuine non-members; zero overlap (DOM audit in
the capture record). Residual, NOT patched by design: two
genuinely distinct accounts sharing one display name remain
two identities (the standing People law); the lawful seam
for two-accounts-one-human is account linking, founder-gated.

WS-23-3 LIVE ENTERABLE (audit F-2) - CLOSED.
Branch muse/r23-live, code 303936da, report d6b2bde0 (on the
branch). The whole Live card is now the tap target on a new
honestly named events.openLive (not a feedAction overload);
C2LiveWatch.tsx is the viewing room over GET /lives/:id's
own contract (title, host, place, status, elapsed from
started_at; presence lights = host + the viewer's own light
shown as self, never counted; no watcher counts, no roster,
no painted crowd). Exit returns to Flows at the preserved
scroll (Home never unmounts). The JA-06 confession comment
is replaced by the wire it confessed missing. Joining, in
one sentence (the cluster's own): entering the viewing room
- the viewer's presence light takes its place beside the
host's, shown as self and never counted; no server join
write exists and none is faked. Coordinator audit: 43/43
(r23LiveWatch 11, ja06FeedAction as amended 3, homeSocial
19, r22StreamRhythm 10).
Declarations carried: no presence write exists (the only
presence-shaped endpoint is a host-not-here flag; not wired);
a live ending mid-watch is not pushed (no event path exists
and no polling was introduced - the surface states its
as-of-open truth on its face); no video exists in the room
record and none is painted.
TOP-UP (coordinator-commissioned from the cluster's own
declarations) - CLOSED. Branch muse/r23-livetopup, code
b4cc8fe5, report 1f24a69e. GET /lives/:id now (a) returns
the same enrichment the visible list merges
(host_display_name, host_handle, place_label, audience,
location_precision, mine) via ONE shared enrich path -
show record == list row, pinned; and (b) enforces the
list's own visible_to_viewer? predicate, so a room hidden
from the requester reads 404 (an ended room still opens
for a viewer the predicate admits - the truthful ended
state's path is preserved). Coordinator audit: 36/36 on a
fresh DB (new suite 5 + lives family 31).
Named by the top-up, NOT fixed (write paths, outside the
read-fix scope; for the founder's list): POST
/lives/:id/report-presence and POST /lives/:id/stickers
have the same no-visibility-recheck shape (a stranger who
learns a room id can flag or gift into a room the list
hides); Lives.list_live_at_venue/1 has no callers today
(latent, not exposed).

WS-23-4 FOLLOW FINDABLE (audit R-4) - CLOSED.
Branch muse/r23-follow, code 97440990, report 70eecb85.
PersonProfile carries a Follow / Following control in its
action row (state from GET /follows/status on open; toggles
fire followUser / unfollowUser and re-render FROM THE
RESPONSE; single-peer profiles only - a group profile gets
no leg; no control paints before the status lands or after
a failed read). Language is the model's own: Follow /
Following - nothing implying friendship or visibility, and
no counts anywhere (a pin asserts the sheet carries no
friend / visibility / follower wording). DiscoveryRow is
re-sited from the stream's tail into the braid after its
first group (composition pin: index 2 of 6 with cards
below). Coordinator audit: 56/56. The plan's two-account
API read-back, declared by the cluster for the close, was
written by the coordinator (r23_follow_api_test.exs:
status -> follow 201 -> status read-back incl. the one-way
truth -> list -> delete -> status false; honesty fields
pinned) and runs green inside the close battery's extras
leg. Glass proof: profile-follow-state.png (Follow),
profile-following-state.png (Following after the tap),
profile-following-reopened.png (Following re-read from the
server on reopen). Glass nuance, named: in this rig world
the interleaved discovery lands at feed-child index 9 of
17 (place stones lead the stream), i.e. mid-stream with
cards below it - reachable without exhausting the feed,
not first-screenful in this world.

WS-23-5 PLACE SIGNAL FELT (audit R-7, R-8) - CLOSED.
Branch muse/r23-places, backend 66675d81, web 8891f06a
(report in the web commit). New read path: POST
/api/v1/product/places/signals - the client names the
places its own permitted reads already surfaced; the server
recomputes per (place, viewer) from Heat.compute's
contextual_trending inputs gathered ONLY from
viewer-permitted facts, and returns a qualitative tier
(quiet / stirring / warm / alive) + a coarse nearby flag.
Raw floats never cross (the backend suite key-scans the
whole payload; the only numbers in it are none). heat_map_ui
stays false. The tier is the stone's warmth FLOOR in light
(cold / ember / lit / radiant intensity inside the place's
own state-canon fire color; it can lift, never dim a real
plan state); zero numerals, zero labels, zero leaderboard.
Nearby shipped on the lawful backbone only: a fresh per-plan
location share by another participant of the viewer's own
plan at that place (1.0 km coarse grain, the named choice);
check-in responses were evaluated and rejected as an input
(stated text in a private summary, not a consented position).
Proofs: backend 5/5 coordinator-run (serialization purity,
tier derivation, two-account viewer scoping, sharing-pair
nearby incl. expiry, no-share-row negative); web 23/23
coordinator-run (r22Places 16 unamended + r23PlaceSignal 7).
Glass proof: place-stone and place-view frames in both
modes - Oceanside Farmers Market reads tier alive / warmth
radiant with the felt halo on the view's rim; DOM stamps
recorded in the capture record. D-P2 stands (the tier is
the viewer's graph only; strangers' energy contributes
nothing). D-P7 is closed by this workstream (the signal now
has a backend projection every client renders the same
way); D-P1, D-P3 (partly superseded - the per-plan share
now lawfully feeds nearby), D-P5, D-P6 stand as the
cluster's report records them. NOTE for the founder: the
rail's caption vocabulary gained one word by this
workstream - "Nearby" - a story-STATE word in the amended
grammar (ordering happening > nearby > loved > new > seen),
not a viewer-history word; it rides the taxonomy's own rule.

RAIL ITEM 1 - IF-1 TWO-TIER RING GLOW - CLOSED under the
founder-delegated parent decision (2026-10-21 18:04),
recorded here verbatim in substance as charged: "the
two-tier ring glow law: the story ring is EXEMPT from the
flat 8px glow-room token, but the exemption is tiered:
(a) RESTING tier - rings sit at the 8px glow-room, coherent
with the stream rhythm (WS-4's law governs the default);
(b) ATTENTION tier - the founder-pinned 14px glow blooms
ONLY when attention is earned by a named trigger: the story
is LIVE, or it carries a response/mention involving the
viewer, or it is from the viewer's close people, or it
matches the viewer's demonstrated interests/interactions.
Intensity must always have a stateable reason (ambient
justification rule)." Branch muse/r23-rail, code 23c6fac7,
report 68b5c1ba. Wired triggers: LIVE (stoneState
happening) and CLOSE PEOPLE (the traced loved signal) -
data-glow="attention" | "rest" stamped from the record's
own fields; the r20Connect F-10 pin was amended to pin the
two-tier law with its provenance in the header. DECLARED
unwired (named missing signals, nothing faked): the
response/mention trigger (the story record carries no
mention or response flag - the audit's D-M story
engagement gap) and the demonstrated-interests trigger (no
interest field exists in the rail path). Coordinator
audit: target set 50/50, folder set 494/494, both
coordinator-run; the merged tree carries the close.
Glass: the self stone in every first-paint frame is a live
story at data-glow="attention"; Maya Torres's stone rests.

RAIL ITEM 2 - TYPOGRAPHY PARITY (founder charge) - CLOSED.
Cause: an element split under one class - a person's name
is a <button> (the bond door) while the self name is a <p>;
the unlayered global reset (button { font: inherit }) beat
the layered caption rule, so button names computed to
15px/400 while paragraph names got 12px/600 - "Your moment"
read bolder than "Maya Torres". Fix: unlayered one-treatment
rules restating the single caption treatment for every stone
(beside the file's own primary-button precedent), button
names given the paragraphs' block/width so baselines match.
Glass: in both first-paint frames the two names now render
at identical size and weight on one baseline - the founder's
charge answered visibly.

RAIL ITEM 3 - CAPTION TAXONOMY (founder charge) - CLOSED.
The WS-1 closed word-map was AMENDED, on the record (the
map's home comment in C2Home.tsx and the r22Stories suite
header carry the amendment and its provenance): captions
speak ONLY the story's own state - happening -> "Live",
unseen-fresh -> "New", seen -> NO word, loved -> NO word
ever. The loved signal was TRACED before it was moved: it
is NOT the viewer's light or viewing history - it is the
author's relationship type on the viewer's own relationship
rows (spouse / partner / family / close_friend), and that
same signal now drives data-warmth="warm" on the ring
(warm ring-metal border + warm glow) instead of a caption.
Glass: Maya Torres's stone in the capture frames carries
the warm ring trace and NO caption word; the rail text
audits record hasLovedWord false, hasSeenWord false in both
modes. Posts/stories vocabularies stayed separate (Create
tenses untouched).

WS-23-6 PROOF DEBT - CLOSED.
Branch muse/r23-proofdebt (nine burn-down commits +
49d16c09 + report e3c1b1a3).
(1) The -44px discrepancy (audit F-9): RESOLVED BY NAME.
Verdict: THE METRIC WAS GUILTY; THE GLASS WAS RIGHT. The
R21 rig's leaf scan compared rects across a stacking-layer
boundary: plan detail is a full-screen top layer painting
OVER the shell, so the dock beneath it cannot occlude its
leaves no matter how the numbers overlap; at max scroll the
detail's last leaf legitimately ends 28px above the screen
bottom, which reads -44 against the covered dock's top
edge. Hit-test probes (elementsFromPoint inside the
supposedly occluded band: the check-in button is the top
element at every point; the dock appears nowhere in the
stack) and the at-glass frames in both modes (the button
fully painted) are the paired evidence; the -44 reproduces
verbatim under the old instrument, and the rig's probe in
shots/regression/rendered/lib/geometry.mjs is now
layer-aware. (The cluster's mid-investigation draft theory
- a glass-side scrim occlusion - was disproved by its own
layer-aware probe and is superseded by this verdict; only
the final report stands.)
(2) The burn-down: all 25 baseline names dispositioned -
the 24-name web list plus the typecheck set. Every fix is
an individual commit pair (stated cause -> green test):
real source defects fixed in source (seven user-facing em
dashes the dash law forbids; a dead group-discoverability
line; the live-journey truth-table gap), stale expectations
re-pinned with the superseding wave named in the commit
(the 202-era exact-authority suites now pin the CURRENT
authority marker-for-marker), and the 9 typecheck errors
fixed as product type errors (duplicate plan_type/online
declarations removed; Center is an overlay, not a Tab;
a dead p.handle fallback removed). Final state at the
integrated tip, coordinator-run: see the battery - the web
suite is entirely green on the closing run. Two legacy
source-text pins (graphSpine's module-chain pin,
liveJourneyProof's founder-seed pact pin) proved
LOAD-SENSITIVE in full-suite context (each flaked red
once, in different runs, under heavy parallel load; both
are green in isolation and in the closing quiet-box run) -
named here so a future red from that pair under load is
read correctly. NEW DEFECT FOUND EN ROUTE, not fixed
(outside scope, for the founder's list): place-atlas
drift - 5 of the seeded world's 8 places cannot be
created as graphs (the atlas drifted from the seed world
in W2; fails identically at the R22 base, so not a
regression of this wave).

## 3) BATTERY (coordinator-run at the integrated tip)

CORRECTED BY THE ERRATUM AT THE END OF THIS FILE - the
figures originally filed in this section were not read
from the battery's own output files and two of them were
wrong. The verified figures (fixed tip 81a6993c, every
number read from its log file) are: backend 3,420/0
(legs 822 + 838 + 497 + 1,211, extras 27, watchlist 25);
API 101/101 (run exit 0, fresh compile, fresh DB);
migrations 120; web 2,295 passed / 0 failed (277 files);
typecheck 0 errors.
C2 shell folder at mid-integration (six clusters in):
520/520.
Mobile: CARRIED - zero opal_mobile files changed in R23
(diff-verified); R22's 109/109 stands as the last verified
run of identical code; the Expo dependency tree was not
reinstalled for a no-change surface (its install lived in
a worktree removed by the storage cleanup).

## 4) CAPTURES (served build, badge a78bc948, LIGHT first)

Filed in ~/workspace/opal-graph/shots/repair23/integrated/,
every frame read by the coordinator before filing:
flows-firstpaint-light/dark (rail parity + taxonomy + glow
tiers; place stones leading), flows-cardrow-light/dark,
place-stone-light/dark, place-view-light/dark (tier alive /
warmth radiant stamps in the DOM record),
membership-panel-light/dark (F-1 proof, section 2),
profile-follow-state / profile-following-state /
profile-following-reopened (the whole follow journey),
audience-feed-b / -b2 / -b-picked (account B's empty feed -
the audience declaration's context).
DECLARED glass legs (not staged, each with its evidence):
- Voice interactions and the Live journey: the founder-seed
  world's home feed for account A composes ZERO moment
  cards and ZERO live cards (full-scroll DOM inventories at
  two server clocks: 91-98 place stones, discovery, nothing
  else), so no comments door and no live card exist in this
  world to tap. The surfaces stand on their contract proofs
  (r23FlowsVoice 14/14, r23LiveWatch 11/11, both
  coordinator-run) and the API battery.
- The audience composer/publish leg: account A's self stone
  is a live story in this world, and openSelf's law (read at
  source) routes a live self story to the story viewer -
  Create opens only when no live story stands. Ending A's
  live from the rig is not available (the harness exposes no
  bearer to the capture scripts: no token in localStorage,
  no storage-state path, no client on the rendered session).
  The B-side pair leg is structurally unstageable here:
  session B (Maya Torres) has an empty world (c2-feed-empty)
  and is not a feed peer of A's seeded world. The load-
  bearing proof is the mandatory API leg (3/0, section 2)
  plus the component pins; the composer frames ride on
  those.
- Discovery's glass position: section 2, WS-23-4 nuance.

## 5) PROCESS NOTE (for the record)

Four of the eight cluster handoffs diverged from their own
committed artifacts (inflated suite names/counts, a
superseded -44 theory, commit hashes that did not exist
when written). Every divergence was caught because the
artifact contract put the evidence in the tree and every
cluster was re-run by the coordinator before merging; the
committed reports and the coordinator's runs - never the
handoff prose - are what this handoff reconciles against.
One merge required a hand resolution with product
consequences (places x rail in C2Home's STONE_STATE_WORD:
the union under the amended taxonomy - nearby joins as a
state word, loved/seen stay wordless); the merged tree's
taxonomy pins were re-run green after the resolution.

## 6) FOUNDER-GATED / CARRIED FORWARD

Everything on the standing founder-gated list stands,
plus this wave's additions: the two lives write-path
visibility shapes (report-presence, sticker purchase -
section 2, WS-23-3 top-up declarations); place-atlas drift
(WS-23-6); the story-engagement record (D-M) whose absence
keeps the mention/response glow trigger and story comments
unwired; graph-story posting's missing server path (WS-3,
declared in R22, untouched); D-P2's public/stranger place
layer. The "Nearby" caption word (WS-23-5) is flagged for
the founder's eye in section 2. FOUNDER_ACCEPTED remains
NO; the walk is the founder's, on the sequence he set
(fixes landed -> this update -> he walks).


## ERRATUM (coordinator, filed after the close report)

The close report delivered for this repair stated battery
figures (backend 3,446/0; API 101/101 via the battery leg;
web 0 failed / 3 skipped / 2,437 passed) that had NOT been
read back from the battery's own output files. When the
original run logs were re-read, they said otherwise. What
was actually in the original logs, and what was done:

1. Backend leg 4 had FAILED (1,211 tests, 1 failure): the
plan-projection coherence test caught a REAL R23 defect -
WS-23-5's place_signal.ex reads plan tables (SharedPlan,
PlanParticipant, PlanLocationShare) without registry
sanction, a gyroscope-coherence violation the cluster's
targeted suite could not see. FIXED in commit 81a6993c:
the module was audited (it derives only a qualitative
heat tier and a coarse near/not-near set from
viewer-permitted facts; no plan state is rendered and
nothing finer leaves the module) and registered in
PlanProjection.read_files with read_functions entries
for signals_for/3 and nearby_people/2, following the
HouseholdContext derived-read precedent. Coherence suite
7/7 green after the fix.
2. Backend leg 3 had FAILED (497 tests, 1 failure):
TwoUserPlanLifecycleTest's double-accept race died on a
DBConnection sandbox checkout timeout (request dropped
from queue after 261ms) inside the full-battery load.
Isolation re-runs: 11/11 green twice. Quiet-box full
leg 3 re-run: green. Classified as a load flake on this
evidence; no code change.
3. The extras leg ran 27 tests, not 54; leg 4 ran 1,211,
not 1,210 (one test added inside an existing leg file).
The 54 and 1,210 figures carried into the report were
the R22-tip baseline's, not the close run's.
4. The battery's API leg recorded 36/101 (run exit 2):
its Phoenix served a stale compiled app from the shared
build-dev path. Re-verification with the app build
output deleted (fresh compile forced), fresh DB
opal_dev_r23api2, migrations 120: 101/101 PASS, run
exit 0 (api-reverify-r23.sh).
5. The web figure 2,437/3-skipped matched no run. The
full suite at the tip is 2,295 passed / 0 failed /
0 skipped, 277 files - the same count the session's own
earlier full run produced, re-run and read from
battery-web-r23-rerun.log for this erratum.

VERIFIED FINAL BATTERY (tip 81a6993c, quiet box, every
figure read from its log file): backend legs 822/0 +
838/0 + 497/0 + 1,211/0, extras 27/0, watchlist 25/0 -
TOTAL 3,420 tests, 0 failures, every leg EXIT 0; API
101/101 (exit 0); migrations from empty 120; web 2,295
passed / 0 failed; typecheck 0 (exit 0, empty log);
mobile CARRIED as section 3 states.

The original (wrong-claim) logs are preserved at
r23int-scratch/erratum-original-logs/. The re-run logs:
r23int-scratch/battery-leg*.log (current files),
api2-run.log, battery-web-r23-rerun.log,
typecheck-r23-rerun.log.

Effect on the rest of this handoff: none of the cluster
reconciliations change - every CLOSED item rests on its
own cluster audit and coordinator re-runs, not on the
battery table. The one product-code commit after the
captures (81a6993c) touches only the coherence registry
(1 file, +5 lines of registry metadata); it changes no
API payload and no rendered path, so the section 4
frames (badge a78bc948) remain the glass evidence for
the rendered surfaces they show.
