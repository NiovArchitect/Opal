# REPAIR #23 - WS-23-4 FOLLOW FINDABLE - CLUSTER REPORT

Worker: WS-23-4 cluster worker, 2026-10-21.
Branch: muse/r23-follow, based on the merged R23 tip 83c910bc
(WS-23-1 + WS-23-2 in). Code commit: 97440990.
Closes: audit R-4, part of O-7 (people leg only; places /
interests discovery stays declared, see Declarations).
Gates honored: no merge, no production, muse/repair-17
untouched, plain hyphens only.

## Model truth honored

Follows are a durable FollowGraph edge, explicitly NOT
friendship and granting NO visibility (FollowController:
follow_is_not_friend, grants_friend_visibility = false);
friendship runs on the separate RelationshipGraph. This
workstream invented no graph and no endpoint: the control
rides GET /follows/status, POST /follows and
DELETE /follows/:creator_user_id through the existing client
wrappers followStatus / followUser / unfollowUser
(productClient.ts, re-pinned at the merged tip: 2538 / 2515 /
2531). Places / interests follow was NOT built - its endpoint
does not exist and the decision is founder-gated.

## Files changed (commit 97440990)

- apps/opal_web/src/c2/shell/PersonProfile.tsx - the follow
  control (below).
- apps/opal_web/src/c2/shell/C1ShellHosts.tsx - the host wires
  the follow leg into PersonProfileSheet for single-peer
  profiles only: follow={{ userId: selected.peers[0].id,
  bearer }}. A group profile gets no leg and no control (the
  same gating shape as onSaveRelationship / onOpenBond).
- apps/opal_web/src/c2/shell/C2Home.tsx - the discovery
  re-site (below). DiscoveryRow itself is unchanged: same
  semantics (people the viewer converses with, not yet
  followed), same response-driven re-render.
- apps/opal_web/src/c2/shell/r23Follow.test.tsx - NEW suite,
  11 tests (below).

## 1) The profile control

PersonProfileSheet gains an optional follow prop
({ userId, bearer }), supplied by the host when it holds a
session and the profile is one person. Absent = no control
renders - the sheet's house rule (no buttons without a real
action behind them) holds.

Behavior:
- On open, the sheet calls followStatus(userId, bearer) and
  renders the control ONLY from that response. Until the
  status lands (or if the read fails), no control paints -
  an unconfirmed state is never shown.
- The control sits in the profile's action row
  (.r19-profile-actions), between Message and Our stone,
  testid r23-profile-follow, aria-pressed mirrors the state,
  disabled while a write is in flight.
- A tap fires followUser (from Follow) or unfollowUser (from
  Following) and the control re-renders FROM THE RESPONSE's
  following field - the DiscoveryRow's proven pattern. A
  failed write changes nothing on screen.
- Re-open persistence is structural: the sheet remounts per
  open and re-reads followStatus, so state can only ever be
  the server's current truth, never local memory. Pinned by
  test (close, reopen, Following read back with followUser
  never called in the second mount).

Exact language of the control: "Follow" / "Following" -
the model's own words, and nothing else. The sheet adds no
line about friendship, visibility, or seeing anything, and
no follow count renders anywhere (counts are not in the
model; the no-scoreboard posture holds). A test pins that
the rendered sheet contains no "friend", no visibility /
follower wording, and no numeral on the control.

## 2) Discovery re-site - what shipped, and the evidence

Shipped siting: INTERLEAVED, inside the stream's own rhythm,
at the render-composition level in C2Home. The discovery
section (data-testid c2-discovery) now renders inside the
.c2s-feed braid AFTER THE FIRST BRAID GROUP and before all
remaining feed items. The braid runs in two staggered
currents (c2shell.css stream law: narrow moments take one
current's width, wide stones take the full berth), so the
first group is composed as the first two stream items;
discovery takes the wide berth there - a wide stone the
stream parts around - and the rest of the braid keeps its
order below it. Edge cases preserve the old semantics: with
fewer than two feed items the stone follows what there is;
with an empty feed it renders after the place stones, inside
the same feed container, exactly where it rendered before.

Composition evidence (rendered test, r23Follow.test.tsx):
with a 5-item feed + 1 discovery person, the feed container's
children are [memory, memory, discovery, memory, memory,
memory] - discovery's position index is 2, three feed cards
remain BELOW it (so it is provably not after the whole feed),
and index 2 sits inside the first scroll group of the
composed stream (header + stones + happening precede the
feed; two cards + the discovery stone are the feed's first
screenful at phone size). With a 1-item feed, discovery's
index is 1 - it follows the only item rather than vanishing
or jumping above the stream. The row's own toggle is pinned
in place: Follow on the re-sited row fires followUser with
the person's id + bearer and re-renders Following from the
response.

Why this siting over a separate tab/door: the wiring plan's
decided direction (Section 4.2) prefers the interleave
because discovery inside the current is the surface's
premise; the composition allowed a clean interleave without
touching the braid's ordering law (happeningFirst still
lifts Lives / happening plans above the braid untouched;
rest keeps its relative order around the stone), so no
fallback siting was needed.

## Tests - exact commands and counts

Run from apps/opal_web in wt-r23-follow:

1. ./node_modules/.bin/vitest run src/c2/shell/r23Follow.test.tsx
   -> 1 file passed, 11 tests passed, 0 failed.
   Pins: Follow renders when followStatus says not-following
   (and followStatus was called with the person id + bearer);
   Following renders when it does; a tap fires followUser and
   re-renders from the response, the reverse fires
   unfollowUser; a failed toggle changes nothing; state
   persists across a re-open by re-reading followStatus
   (2 calls, no local memory); no host leg = no control and
   no status call; a failed status read paints no control;
   the language pin (Follow / Following only, no friendship
   or visibility wording, no counts); the discovery
   composition pins (index 2 of 6 with cards below; index 1
   on a 1-item feed); the re-sited row's follow round-trip.
2. ./node_modules/.bin/vitest run src/c2/shell
   (the whole c2 shell folder set, incl. the PersonProfile
   suites: legacyRecreation, c2ShellSurfaces, homeSocial,
   r23FlowsVoice, r23Audience)
   -> 52 files: 51 passed, 1 failed; 500 tests: 499 passed,
   1 failed. The single failure is
   src/c2/shell/r20Connect.test.tsx > R20 F-10 Center assets
   > PIN (design compass, founder 2026-10-20): the pressed
   treatment is a RING, the connector mark is an orbit mark,
   and Home's lead carries the ring mark
   - name-for-name identical to the standing baseline
   (~/workspace/opal-graph/r23int-scratch/baseline-web-failed-names.txt)
   and to IF-1, which belongs to another cluster and is
   founder-gated; this cluster changed neither side. NO new
   failures vs the merged base.
3. ./node_modules/.bin/tsc -p tsconfig.json --noEmit
   -> exactly 9 errors, the baseline set (OpalApp.tsx x3,
   productClient.ts x5, YouSettingsDestination.tsx x1).
   No new type errors.

## CAPTURE SPEC (for the coordinator's signature-gated rig)

Badge: the served R23 tip after this branch merges; LIGHT
first, phone size, both modes for each frame.

1. PersonProfile, Follow state: open a single-peer thread
   (Maya Chen), tap the name to open the profile sheet. The
   action row shows Message (primary), Follow, Our stone,
   What Opal remembers, Done. Frame asserts the Follow
   control (r23-profile-follow) reads exactly "Follow".
2. PersonProfile, Following state: tap Follow on that sheet;
   the control re-renders "Following" from the response -
   frame it in place. Then close the sheet, reopen the
   profile: the control still reads "Following" (state
   re-read from GET /follows/status, not local memory).
   Frame the reopened sheet.
3. Flows first scroll: Flows at first paint, scrolled no
   further than the first screenful of the feed: the story
   rail, happening strip, then the feed's first two cards,
   then the discovery stone (a row: avatar, the person's
   name, "You talk with them", a Follow control) with more
   feed cards visible below it - discovery reached WITHOUT
   exhausting the feed. Frame asserts c2-discovery is inside
   the first scroll, not at the stream's end.

## DECLARATIONS (not closed, named)

- API leg not run by this cluster: the plan's Section 4
  acceptance names a follow status read-back via
  GET /follows/status in the two-account scaffolding
  (Section 7). The endpoint and client wrapper are
  audit-verified and unchanged by this cluster; the web leg
  above pins the client contract end to end against the
  wrapper's response shapes. The two-account API read-back
  remains for the coordinator's close battery to run.
- Places / interests follow: NOT built, by design - its
  endpoint does not exist (audit D-H / B-3) and the decision
  is founder-gated. Discovery remains people-only, as the
  projection declares.
- FOUNDER_ACCEPTED remains NO; no frames were captured by
  this cluster (no served stack in its scope) - the capture
  spec above is the handoff to the rig.
- IF-1 (r20Connect PIN, 8px vs 14px glow) is untouched and
  remains founder-gated, exactly as Section 11 of the wiring
  plans records.
