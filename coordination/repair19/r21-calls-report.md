# Repair #21 - Cluster W-16 + Mislabel Quarantine: THE IN-CALL SET - report

Branch `muse/r21-calls`, base `4dd0e940` (the r21-openings tip,
which carries the W-8 capture signature gate in
`shots/regression/rendered/lib/surfaceSignature.mjs`). No merge,
no deploy, `muse/repair-17` untouched. Plain hyphens in all
user-facing copy.

## Frames first

NO new frames are filed in this cluster. All four requested
in-call states are DECLARED below with their exact blockers -
the served shell mounts no in-call surface, so any incall-*
frame produced today would be a staged call. Per the task,
declared states file no frame, and the new call-family
signature (section 0b) would refuse a log frame filed as
incall in any case. The one frame action taken is a REMOVAL:
the mislabeled offender is quarantined out of pack-v2
(section 0a).

---

## 0a. Mislabel quarantine - DONE

`pack-v2/incall-ringing-outgoing-dark.png` was NOT an in-call
frame. Read at the glass in this dispatch, it is an old-build
CALL LOG: "Calls" title, Chats/Calls toggle, "Search calls"
field, five call-log rows (four of them duplicated Jordan
Ellis rows - "Live now", three "Happening now / No answer /
Canceled"), seed badge `3e230af`, "Home" dock label, and no
in-call surface, control, or presence element anywhere in the
frame. The founder caught it at the glass 2026-10-20 21:20
PDT. Third offense of the capture-integrity species (V-4,
then W-8 / F-18 reopened, now this).

Action: MOVED (never deleted) to
`shots/repair19/pack-archive/mislabeled-incall-r19-3e230af/incall-ringing-outgoing-dark.png`,
and the archive README gained the entry: what it actually is,
its badge (3e230af), why it was misfiled (captured and named
as an in-call frame with no content check against the surface
it claims), and the date. pack-v2 now contains no incall-*
frame at all.

## 0b. Signature gate - CALL-FAMILY rule added

`surfaceSignature.mjs` gains two signatures, defined from the
real served DOM (CallSurface testids in
`apps/opal_web/src/opalUi/CallSurfaces.tsx`; PeopleCallsList
testids in the C2 shell Calls tab, pinned by
`r19CallsHost.test.tsx`):

- `incall`: allOf `[data-testid="call-surface"]`; anyOf
  in-call presence/control elements (`call-orbit`,
  `graphing-light`, `call-assist`, `call-end`, `call-stage`);
  noneOf call-log signatures (`people-calls-list`,
  `calls-row`) plus the other primary surface roots. A frame
  filed as incall must carry call-surface signatures AND must
  NOT carry list-row signatures.
- `call-log`: anyOf `people-calls-list` / `calls-row`;
  noneOf `call-surface` / `call-orbit` / `graphing-light` -
  the reverse filing (an in-call frame filed as a log) is
  refused too.

`surfaceClaimedByFrameName` now maps `incall-*` to `incall`
and `calls-log-*` / `callog-*` to `call-log` (the picker and
settings frames keep a null claim - they are neither).

Tests: `surfaceSignature.test.mjs` gains 6 call-family tests -
call-log DOM fails incall with missing AND forbidden named
(the quarantined species), in-call DOM fails call-log, each
own DOM passes, a bare call-surface root with no presence
element fails incall, an in-call DOM with a stray log row
fails incall, and the frame-name mapping. Full file:
13/13 pass (7 pre-existing + 6 new), `node --test`.

## 0c. Call-family audit of pack-v2 (every frame read at the glass)

Badge = the seed chip visible in the frame. Per the W-8
record, the chip is stamped from the seed record the capture
session was provisioned under, so a chip identifies the
capture session, not a build SHA; all of these frames predate
the R21 tip and carry the R19-era "Home" dock label. Currency
below is stated on exactly that basis.

| Frame | Badge | What it actually is | Name/content match |
|---|---|---|---|
| callog-closeup-dark.png | ad17caf | Call log closeup: Calls tab, + New, rows for Maya Torres (Needs your answer), Jordan Ellis (Canceled), Chanelle Brooks (Needs your answer), Maya Torres (Missed call, Call back), state-colored ambient borders | MATCH - a call log, filed as a call log |
| calls-log-dark.png | 79000ac | Call log: Jordan Ellis (Canceled), Chanelle (Needs your answer), Maya Torres (Missed call 4:42 PM, Call back) | MATCH |
| calls-log-light.png | 79000ac | Same log, light mode (Jordan Ellis rows read No answer / Canceled) | MATCH |
| calls-log-after-callback-dark.png | 79000ac | Call log with a fresh top row: Jordan Ellis, "Call - 4:46 PM", "Live now" - consistent with a log re-read after a callback was placed | MATCH |
| calls-log-after-callback-light.png | 79000ac | Same, light mode ("Call - 4:51 PM") | MATCH |
| create-call-picker-dark.png | none visible (sheet covers the chip) | "Start a call" people picker sheet over the blurred log (Alex Rivera, Chanelle Brooks, Jordan Ellis, Marcus Lee, Maya Torres x2, Nina Patel, Priya Shah, Sabrina Nguyen, Cancel) | MATCH - a call picker, filed as a call picker |
| settings-calls-assist-dark.png | 3e230af | Settings room "Opal Assist and calls": "Opal Assist on calls" toggle OFF, copy "Allow Assist on future calls. You can still pause it on any private call." | MATCH - filed as what it is. NOTE: it shares the offender's seed session (3e230af, the old-build session) - same session, correctly named frame; left in place |
| settings-calls-assist-light.png | 3e230af | Same room, light mode, toggle OFF | MATCH - same shared-session note as the dark frame |

No other offender found. The incall frame was the only
name/content mismatch in the call family.

---

## W-16. The in-call set - per-state dispositions

### Where calls honestly live today (verified in code, not assumed)

- The served shell is C2 only: `App.tsx` returns `<C2Shell />`
  on the member path and states the legacy OpalApp is no
  longer mounted (the `?shell=r17` override is retired).
- The C2 shell mounts NO in-call surface: zero references to
  `CallSurface` or `ActiveCallOverlay` under
  `apps/opal_web/src/c2/` or in `App.tsx`.
  `ChatsHost.placeCall` (`c2/shell/C1ShellHosts.tsx`) calls
  `createConversationCall`, then only sets a status note
  ("Calling {name} - {status}.") and re-reads the call log.
  Nothing renders a ringing, connecting, or connected state.
- The real in-call machinery lives in the unmounted legacy
  `OpalApp.tsx`: `CallSurface` (live view branch,
  `.live-call`, orbit stage) + `ActiveCallOverlay` (WebRTC
  media through `CallClient` over the `call:<id>` Phoenix
  channel) + `callLifecycle.ts` inbox handling +
  `callMediaRuntime`. The founder's two-account call on
  2026-10-19 is founder-grade proof this machinery works -
  on that legacy path, which this build does not serve.
- Even there, the surface state drops the call record's
  `conversation_id`: the `LiveCallSurface` type in
  `callLifecycle.ts` has no conversation field at all, and
  `CallSurface`'s `orbitConversationId` prop is passed by no
  caller anywhere in the tree (grep: zero call sites outside
  its own definition). The W-5d doorway gap stands as
  declared there.

### (a) Voice call CONNECTED, graphing light ON - DECLARED

Blocker: no in-call surface is mounted in the served C2
shell (above), so there is no served surface on which a
connected call can honestly appear, in any mode. The graphing
machinery itself is real and server-derived
(`OpalCore.Calls.Graphing.graphing_state/1`, rendered verbatim
by `GraphingLight` + `CallAssistControl`) - but both render
only inside the unmounted legacy surface.
No frame filed.
The exact build that would carry it: a C2-shell in-call mount
- ChatsHost (or C2Shell) holds a live-call surface state fed
by (1) `placeCall`'s created call, (2) the realtime inbox
(`RealtimeClient` already exposes the call-inbox subscription
OpalApp uses: call:ringing / call:answered / call:ended on
`user:<id>`), and (3) `ActiveCallOverlay` joined on the shell's
existing `productRealtime` socket (C2Shell already starts it),
rendering `CallSurface` with the live `CallView` from
`deriveCallView` + the media runtime. Then a two-seat capture
(two synthetic sessions through create -> answer ->
media-connected) passes the call-family gate in section 0b.

### (b) Same call, graphing PAUSED FOR THIS CALL - DECLARED

Same mount blocker as (a). The pause control itself is real:
`CallAssistControl`'s toggle calls
`setCallAssist(callId, false, scope: "call")`, and the light's
paused state is a distinct hollow-ring tone with the sentence
"Paused for this call." - but it renders only on the unmounted
surface. No frame filed. Carried by the same build as (a),
plus the pause tap mid-call before the shutter.

### (c) VIDEO call connected - DECLARED (two independent blockers)

1. The same C2 mount blocker as (a).
2. There is no video media path anywhere in the stack:
   `CallClient` requests `getUserMedia({ audio: true,
   video: false })` (CallClient.ts:166); no video track, no
   remote video element exists. The honest live surface says
   so itself - `CallSurface`'s live view, when connected with
   kind "video", renders `call-video-truth`: "Video is not on
   for this call - Opal calls are audio only, so there is no
   camera feed to show." A connected VIDEO frame with a camera
   feed cannot be honestly produced by any build in this tree.
   The exact build that would carry it: a video media path
   (video track in CallClient, a remote-video element on the
   live surface, and the truth line retired) ON TOP OF the
   (a) mount build. Until then the only honest video-kind
   frame is the audio-only truth line on a connected call,
   which itself waits on build (a).

### (d) A Live call surface - DECLARED

Interpretation, stated plainly: the only "Live call surface"
in the code is `CallSurface`'s view-driven live branch
(`.live-call`, `data-testid="call-surface"` with a real
`CallView`) - the same surface that would carry (a)-(c).
There is no fourth, distinct Live call surface in the tree
(the Lives go-live panel, `LivesGoLivePanel`, is a streaming
go-live room, not an in-call surface). So (d) carries the
identical blocker and the identical carrying build as (a):
declared, no frame filed. If a distinct surface was meant,
it does not exist in this tree under any name I can find -
flagged here for the parent to confirm the intent.

### Why no wiring was landed in this dispatch

The task scopes "a small truthful wiring" as in scope. The
honest wiring here is not small: it is the live-call state
machine (inbox subscription, surface state, media runtime,
elapsed/mute state, answer/decline/end handlers, overlay
lifecycle) ported from a ~11k-line legacy component into the
C2 shell, plus a two-seat WebRTC capture rig against a served
Phoenix stack. Landing a partial version would risk exactly
the staged-call failure this cluster exists to prevent, and
the R19 W12 record shows these captures were already owed and
unlanded for the same reason. The sharp declaration above,
with the carrying build named part by part, is the
deliverable for W-16.

---

## Semantics verdicts (founder's model, 2026-10-20, vs the code)

### (i) Pause is PER-CALL and TEMPORARY - TRUE

`OpalCore.Calls.Assist.set_allowed/4` with scope `"call"`
writes only the per-call `AssistConsent` row keyed by
`(call_id, user_id)` - pause writes `allowed: false`,
`revoked_at: now`, `source: "call_pause"` - and consents are
always read per call_id (`consents/1`), so a pause cannot
leak into the next call: a new call starts with no consent
rows of its own and re-derives from the standing default
(section ii). The client pause/resume buttons use scope
`"call"` exclusively (`callAssist.tsx`: graphing ->
`choose(false, "call")`; self-paused -> `choose(true,
"call")`). One wrinkle, named: the FIRST-choice buttons are
account-scoped - first "Enable Assist" calls
`choose(true, "account")` and first "Not now" calls
`choose(false, "account")` - so a first-ever enable/decline
also writes the standing permission. The pause itself never
does. Pinned by the backend test "standing account default
seeds new calls and the per-call pause never rewrites it"
(graphing suite, R19 W12 record).

### (ii) Next call starts graphing ON by default UNLESS the standing permission says otherwise - DIVERGES

The founder's model is default-ON with an opt-out standing
permission. The build is the opposite posture: opt-in.
`Assist.apply_defaults/1` seeds a per-call allow
(`source: "account_default"`) ONLY for a participant whose
`users.assist_calls_enabled == true`. When the standing field
is `null` (never decided) or `false`, nothing is seeded, and
`Graphing.graphing_state/1` then reads `:off` (or
`:waiting_for_other` if only the peer allowed) - never
`:graphing`, which additionally requires BOTH participants
to allow. `apply_defaults` runs lazily from `Assist.state/2`,
only once the call is answered and media-connected.
So: a next call starts graphing ON only when both people
have previously opted in as a standing allow; everyone else
starts OFF, decided or not. Declared as a divergence, not
patched: flipping the default consent posture for call
ingestion is a founder decision, not a repair.

### (iii) Consent lineage records BOTH states - TRUE for user-driven transitions, with one named gap

Every `set_allowed/4` write - on, pause, resume, off -
calls `Graphing.record_transition/4`, which inserts an
append-only `call_graphing_events` row (actor, action
`graphing_on | graphing_paused | graphing_resumed |
graphing_off`, resulting state, scope), publishes
`call.graphing_changed` to the domain-event outbox, and
broadcasts on `call:<id>` - in that order, so the light is
backed by a record. Paused and graphing states are both
first-class recorded states (pinned sequence in
`graphing_test.exs`: on -> on -> paused -> resumed yields
exactly four lineage rows with their resulting states).
THE GAP: `apply_defaults/1` seeding writes consent rows with
`source: "account_default"` but records NO lineage event - a
call that starts in `:graphing` purely from two standing
defaults has consent rows but no `graphing_on` lineage row
for that initial state. Declared, not patched: the fix shape
is one `record_transition` call inside the insert branch of
`apply_defaults` (insert-only, never on the read path's
no-op pass), but it changes broadcast behaviour on a read
path (`Assist.state/2`) and belongs with the (a) mount build,
where the seeded-on state is first exercised at the glass.

---

## Tests

- `node --test shots/regression/rendered/lib/surfaceSignature.test.mjs`:
  13/13 pass (7 pre-existing W-8 tests + 6 new call-family
  tests, section 0b).
- No product code changed in this cluster (gate + tests +
  report only), so no web/backend suite re-run is claimed.
  The semantics citations above were verified by direct code
  reading at this tip; the backend behaviours they cite are
  pinned by the existing suites named in-line
  (`apps/opal_core/test/opal_core/calls/graphing_test.exs`,
  `apps/opal_web/src/opalUi/graphingLight.test.ts`,
  `callAssist.test.ts`), which were not re-run here.

## Declared / owed

- D-1: incall-voice-graphing / incall-voice-paused /
  incall-video / incall-live frames (both modes, 390x844) -
  all DECLARED, blockers and carrying builds in the W-16
  section. Nothing staged, nothing filed.
- D-2: Semantics divergence (ii) - default posture is opt-in,
  founder model says default-on. Founder decision owed.
- D-3: Lineage gap (iii) - account-default seeding writes no
  lineage event; fix shape named, lands with the mount build.
