# REPAIR #23 - WS-23-3 LIVE ENTERABLE - CLUSTER REPORT

Workstream: WS-23-3 (closes audit F-2 / ledger H-NEW-6).
Branch: muse/r23-live, worktree wt-r23-live, based on the merged
R23 tip muse/repair-23 at 83c910bc (WS-23-1 + WS-23-2 merged).
Anchors re-pinned at that tip before code was trusted: C2Home.tsx
live branch at :831-905, the JA-06 confession at C2Shell.tsx
:1666-1668 (HomeRoute events), the feedAction contract doc at
C2Home.tsx :176-181. All line numbers below are the merged-tip
pins, not the R21/R22 snapshots.

## What shipped

1. C2Home.tsx - the events contract gains openLive(liveId)
   beside feedAction / openComments (NOT a feedAction overload;
   the journey is named honestly in code). The live branch is
   restructured to the place stone's proven form: the whole card
   is the tap target - a <button> carrying data-testid
   c2-feed-live and data-live-id when events.openLive is wired,
   firing openLive with the ROOM id (from the projection's
   watch: action id, falling back to the live- card id prefix).
   With no openLive wired the card renders as the resting
   <article> it was, with the feedAction button behavior
   unchanged (ja06FeedAction still green). The stale feedAction
   doc comment ("Watching a Live has no viewer surface yet") is
   corrected to point at openLive.
2. C2LiveWatch.tsx (new) - the viewing room, apps/opal_web/src/
   c2/shell/C2LiveWatch.tsx. A sheet in the shell's own material
   (TopLayer band sheet, c2s-scrim + c2s-sheet, explicit close,
   the comments sheet's pattern), reading the room once at open
   over the EXISTING client wrapper getLive (productClient.ts
   :6654 - it already existed beside the go-live wrappers; no
   new wrapper was needed). Renders, from the record: title,
   host line, place line, Live pill + status, elapsed from
   started_at, and presence lights (below). Load failure shows
   an error line with an explicit retry - no painted room.
3. C2Shell.tsx - openLive is wired in HomeRoute's events: the
   handler looks the room's card up in the route's own
   projection and passes the shell a seed of that card record's
   fields; the JA-06 confession comment is replaced by the wire
   it confessed missing. The outer shell holds liveWatch state
   and mounts <C2LiveWatch> in the surface stack beside the
   comments sheet, passing bearer + viewerUserId
   (session.user_id). Home never unmounts while the surface is
   open, so close (setLiveWatch(null)) returns to Flows at the
   preserved scroll position - doors-with-return, the story
   viewer's / comments sheet's proven pattern.
4. c2shell.css - .c2s-live-watch sheet layout (mirrors the
   comments sheet) and a button-form rule for the live card
   (.c2s-live-card:is(button) - the :is form is deliberate: a
   plain button.c2s-live-card selector shadowed the stream
   rhythm test's .c2s-live-card rule lookup and was caught by
   r22StreamRhythm, now green).

## Room contract fields consumed (each mapped to its source)

Source: GET /lives/:id -> LivesController.show ->
{"live_room" => LiveRoom.to_contract(room, venue)}
(apps/opal_core/lib/opal_core/lives/live_room.ex to_contract).

- id -> surface identity / data-live-id. Base contract.
- status -> isLive (status === "live") and the ended state.
  Base contract. Statuses on the schema: live | ended | flagged.
- title -> watch title (fallback: seed title, then
  "Live at <place>", then "Live" - the adapter's own derivation
  order in shellData.liveFeedFromRooms). Base contract.
- started_at -> elapsed ("12 min in"), local clock. Base.
- ended_at -> ended duration (started_at -> ended_at, "Ran
  24 min") and the "Ended <locale stamp>" line. Base contract.
- host_account_id -> host identity; mine when it equals the
  viewer's session user id. Base contract.
- venue.display_name / venue.name -> place line, ONLY as the
  last fallback (see the precision note in Declarations).
  Base contract (Venue.to_public_contract).
- host_display_name / host_handle -> host name. These are NOT
  on the show contract; they are the visible-lives enrichment
  (Lives.list_visible_lives merges them onto the same
  to_contract). The surface reads them when the fetched record
  carries them, else from the seed.
- place_label -> place line, first choice: it is the server's
  precision-honored label (Lives.place_label/2: venue-precision
  rooms name the venue; area-precision rooms carry the
  formatted address instead). Visible-lives enrichment, else
  the seed.
- mine -> "You are hosting this live" + the single self-host
  light. Visible-lives enrichment / seed / host_account_id
  equality - any of the three.

The seed is the card record's own fields for the same room
(hostName, placeLabel, title, mine), carried by the shell from
the Home projection the card was rendered from - itself built
from the visible-lives read. Both sources are the room's own
server records; nothing is composed locally, and when no source
names a host, no host line renders (pinned by test).

NOT consumed: presence_report_count and
heat_contribution_frozen. The first counts report_host_not_here
flags, not watchers; rendering it would paint a number the
record does not mean. report_presence is NOT wired anywhere in
this build: it is a flagging act, not a join.

## What "join" is in this build, in one sentence

Joining is entering the viewing room: the viewer's own presence
light takes its place beside the host's on the surface, shown
as self and never counted, and no server join write exists or
is faked.

## Tests

New suite: apps/opal_web/src/c2/shell/r23LiveWatch.test.tsx
(11 tests) - the card tap target firing openLive with the room
id; the resting-article form with no openLive wired; host /
place / title / elapsed rendered from a mocked getLive
contract record; the viewer's self light beside the host's
(exactly two lights, no watcher count text); the base
show-contract shape alone (place from venue, no invented
host); the ended state's truthful frame (line, duration,
ended stamp, no presence, no Live pill); the load-failure
error; the exit door firing onClose; and source pins (JA-06
confession gone, openLive wired, C2LiveWatch mounted with its
return).

Commands and counts (from apps/opal_web, vitest via
./node_modules/.bin/vitest run):
- r23LiveWatch.test.tsx alone: 11 passed / 11.
- Full c2 shell folder set (src/c2/shell/): 499 passed, 1
  failed, 500 total, 52 files. The single failure is
  r20Connect.test.tsx's IF-1 PIN test - name-identical to the
  coordinator's Section 11a baseline list
  (r23int-scratch/baseline-web-failed-names.txt); it is another
  cluster's founder-gated item and fails at the merged base.
  An earlier run of the folder caught one real regression of
  mine (the CSS selector shadowing above); fixed and the
  folder re-run to the counts stated here.
- Typecheck (tsc -p tsconfig.json --noEmit): exactly the 9
  baseline errors (OpalApp.tsx x3, productClient.ts x5,
  YouSettingsDestination.tsx x1); no new errors.

## CAPTURE SPEC (for the coordinator's signature-gated set)

Badge: the served R23 integrated tip after this branch merges.
LIGHT first, then dark. Phone size.

1. Flows, scrolled so a Live card sits mid-stream (note the
   scroll position - a moment card's edge against a fixed
   reference). The Live card at rest: Live pill, host monogram
   well, title, host line, place line, host presence light.
2. Tap the Live card (anywhere on it) -> the watch surface:
   sheet titled "Watching live", Live pill, the room's title,
   "<host> is hosting", "At <place>", "<n> min in", the
   presence row (host light + viewer self light + "You are
   here"), and the as-of line. Host named, place present, two
   lights, no counts anywhere in frame.
3. Close via the sheet's close control -> Flows at the SAME
   scroll position as frame 1 (the same moment card edge at
   the same reference).
4. Negative frame - an ended live's truthful state: open a
   room whose record reads status "ended" (seed or fixture
   must supply one; the feed itself never lists ended rooms,
   so this frame is taken by opening the watch surface on an
   ended room id at the rig's hand): "This live has ended.",
   title, "Hosted by <host>", place, "Ran <n> min", "Ended
   <stamp>", and NO presence lights, NO Live pill.
5. Own-live variant (optional, if the seed carries one): the
   card reads "Your live"; the watch surface reads "You are
   hosting this live" with ONE light (the host light is the
   viewer's own; no second self light is painted).

## DECLARATIONS (not closed, named)

- NO PRESENCE WRITE. The room contract carries no lawful
  presence/join write: the only presence-shaped endpoint,
  POST /lives/:id/report-presence, is report_host_not_here (a
  flag). Nothing was wired in its place and nothing is faked.
  The watcher roster build stays founder-gated (audit D-1).
- MID-WATCH ENDING. No event path exists for a live ending
  while the watch surface is open, and no polling was
  introduced: the surface reads the record at open and says so
  on its face ("Shown as of when you opened this room - it
  does not refresh while you watch."). A room already ended at
  open renders its ended state from that same read. The
  elapsed clock is a local timer over started_at only; it
  makes no network calls.
- SHOW CONTRACT ENRICHMENT GAP. LivesController.show returns
  the BASE LiveRoom.to_contract only: no host_display_name,
  no place_label, no mine. Host naming and the precision-
  honored place label reach the surface from the visible-
  lives enrichment (when the fetched record carries it) or
  the card seed. If both were absent, the venue fallback
  (display_name) could state a venue name for an
  area-precision room whose card deliberately showed only
  its formatted address; in the shipped flow the surface is
  only ever opened from a card, so the seed always carries
  the honored label, and the fallback is unreachable there.
  A one-line server fix (merge the same enrichment in
  Lives.get_live as list_visible_lives applies) would close
  this at the source; it is backend work outside this
  cluster's web lane and is named here for the coordinator.
- SHOW HAS NO VISIBILITY RE-CHECK (pre-existing, observed,
  not introduced): Lives.get_live/1 returns any room by id to
  any authenticated caller; friend/audience visibility is
  enforced only on the visible-lives list that feeds the
  cards. This build opens the surface only from those cards,
  so no new exposure is created; flagged for the coordinator
  as a backend observation from this cluster's audit pass.
- NO VIDEO. The room record carries no stream or media URL;
  the watch surface is the room's truthful viewing state
  (record, place, presence), not a video player. Nothing
  paints a stream that does not exist - the same law the
  card's monogram well already obeys.
