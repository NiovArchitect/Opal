# Repair #24 — Cluster H (WS-10): F-16 LIVE CALL TRANSCRIPTION + W-5d IN-CALL FRAMES — ASSESSMENT

Branch `muse/r24-incall`, worktree `~/workspace/opal-graph/wt-r24-incall`,
base `c74adfe3` (muse/repair-23 tip, tree `12b2a02f`). Read-only
investigation of that tree plus the records named in the task
(`incall-report.md`, `calls-report.md`, the R18/R19 F-16 records,
the R21 handoff's W-5d declaration). **No product code was built or
changed by this cluster.** No merge, no deploy, gates untouched.
FOUNDER_ACCEPTED stays NO.

Verdict up front: both items are **BLOCKED**, for different reasons.
F-16's live path is *code-complete but never exercised* — every leg
exists in code, and the one leg that has never run in evidence is
the leg that needs a real Deepgram account session on a real call.
W-5d's doorway is *code-complete but homeless* — the button, its
gate, and its target all exist, and the served shell still mounts
no in-call surface for it to live on. Neither block is a missing
credential in the simple sense, and neither item has a slice that
is genuinely provable end-to-end on this VM without founder-only
credentials or external accounts. The slices that *are* provable
locally are already proven and pinned by existing tests (named
below, with the exact boundary of what each proof covers).

---

## 0. Shared state of the world — how calls actually work at the R23 tip

Evidence first, because both items ride this machinery:

- **Calls are in-app 1:1 WebRTC, audio-only. There is no Twilio
  Voice, no PSTN, and no Twilio Media Streams anywhere in the
  tree.** Server call records and lifecycle:
  `OpalCore.Calls` (`apps/opal_core/lib/opal_core/calls.ex`) —
  `invite/2`, `invite_in_conversation/3`, `answer/2`,
  `mark_media_connected/2`, `end_call_session/3`; state
  `ringing → answered → ended` (+ canceled/declined/missed/failed).
  Signaling is the Phoenix channel `call:<id>`
  (`apps/opal_core/lib/opal_core_web/channels/call_channel.ex`):
  SDP/ICE relayed as `"signal"`, never persisted. The only Twilio
  webhook route in the router is Verify status callbacks
  (`router.ex:22`); there is no Voice/TwiML/media-stream route.
  `settings/connections.ex:92` states it in code: "Twilio Voice
  get NO row (absent as user-facing connections)", and
  `settings/ingestion_status.ex:95`: "in-app WebRTC calls are
  REAL; there is no PSTN dial-out."
- **Media:** `CallClient` (`apps/opal_web/src/realtime/CallClient.ts`)
  builds an `RTCPeerConnection`, requests
  `getUserMedia({audio: true, video: false})` (line 166). No video
  track exists anywhere in the stack. ICE: Twilio NTS TURN
  credentials fetched per call, with an honest STUN-only fallback
  when TURN is unconfigured (lines 205–242).
- **TURN:** `OpalCore.Calls.TwilioNts.mint/0`
  (`apps/opal_core/lib/opal_core/calls/twilio_nts.ex:27–48`) POSTs
  to Twilio's Tokens API using `OPAL_TWILIO_ACCOUNT_SID` +
  `OPAL_TWILIO_AUTH_TOKEN` (lines 38–39), cached per call by
  `OpalCore.Calls.TurnCredentials`, served at
  `POST /calls/:id/turn-credentials` (`router.ex:266`), which
  returns 503 `turn_disabled` when unconfigured
  (`call_controller.ex:100–131`). No separate TURN-specific key
  names exist; there is no `OPAL_TURN_*` read anywhere.
- **The served shell is C2 only, and it mounts no in-call
  surface.** `App.tsx:36` returns `<C2Shell />` on the member
  path (the R17 legacy shell is retired there, comment at
  `App.tsx:31–35`). Grep at this tip: **zero** references to
  `CallSurface`, `ActiveCallOverlay`, `CallAssistControl`, or
  `deriveCallView` under `apps/opal_web/src/c2/` or in `App.tsx`.
  Placing a call in C2 is `ChatsHost.placeCall`
  (`apps/opal_web/src/c2/shell/C1ShellHosts.tsx:2098–2113`): it
  calls `createConversationCall`, then only sets a status note
  ("Calling {name} - {status}.") and re-reads the call log. The
  C2 shell *does* start the realtime socket
  (`C2Shell.tsx:511`, `productRealtime.start(...)`) but never
  subscribes to the call inbox: `RealtimeClient.onCallInbox`
  (`RealtimeClient.ts:291`, events at lines 474–480) has exactly
  one subscriber in the tree — the unmounted legacy
  `OpalApp.tsx:2827`.
- **The real in-call machinery lives in the unmounted legacy
  `OpalApp.tsx`:** `CallSurface` + `ActiveCallOverlay` (WebRTC
  media, TURN fetch, graphing-broadcast forwarding) +
  `callLifecycle.ts` + `callMediaRuntime`. The voice path on
  that legacy surface is FOUNDER-PROVEN (real call, two
  accounts, separate rooms, 2026-10-19 —
  `functional-accountability.md`, J6/INGESTION sections;
  `shots/repair19/COMPLAINT_LEDGER.md` F5 founder update). That
  proof does not transfer to the served C2 shell, which does
  not mount the surface.

### Config / env keys the code reads (names only — no values anywhere in this document)

| Purpose | Key name(s) | Read at |
|---|---|---|
| Deepgram (batch **and** live — one key, no separate streaming key exists) | `DEEPGRAM_API_KEY` (env, or app env `:deepgram_api_key` for batch only, or macOS `launchctl getenv DEEPGRAM_API_KEY`) | `deepgram_client.ex:192–196`, `deepgram_grant.ex:45–47`, `live_transcription.ex:98` |
| Twilio TURN (NTS) + Verify + Messaging (shared account creds) | `OPAL_TWILIO_ACCOUNT_SID`, `OPAL_TWILIO_AUTH_TOKEN` (+ `OPAL_TWILIO_VERIFY_SERVICE_SID` for Verify only — NTS does not need it, `twilio_nts.ex:32`) | `twilio_nts.ex:38–39` |
| Twilio media streams | **none — no such code path, no key read** | — |

Env loading: `apps/opal_core/config/runtime.exs:9,40–41` —
outside `:test`, Phoenix auto-loads `~/.opal/r1a1.env` and
`~/.opal/tunnel.env` **from the HOME of the machine running the
server**. `.env.example` lists neither Deepgram nor Twilio
names (checked at this tip).

### Where the records say the keys live

- **The founder's Mac:** `BLOCKED.md:19` — Deepgram
  "**LIVE (verified 2026-10-08)** — projects API 200;
  `LiveTranscriptionConsumer.readiness() == {:ready, :deepgram}`
  after Phoenix restart", key in `~/.opal/r1a1.env`.
  `shots/audit/KEY_PROVISION_AUDIT.md:20,42` — `DEEPGRAM_API_KEY`
  SET in that file; same audit lists `OPAL_TWILIO_ACCOUNT_SID` /
  `OPAL_TWILIO_AUTH_TOKEN` SET (names only). `BLOCKED.md:18` —
  Twilio NTS "present via `r1a1.env`" on the Mac BEAM.
- **This VM:** no record in the repo places a copy of
  `r1a1.env` (or of either key) on this VM. Every R19–R23
  staging stack recorded in the coordination reports was
  launched on this VM with synthetic env in scratch dirs, not
  with the Mac's env file. This assessment did not read, copy,
  or probe any env file on any machine — per the task, Mac-side
  facts are stated only as the records state them.
- What the 2026-10-08 verification actually proved: the
  Deepgram **projects API**, **batch** transcription, and the
  consumer's `readiness()` (key presence). It did **not**
  exercise the live grant endpoint or a live listen websocket
  (see §1).

---

## 1. F-16 — Live call transcription

### 1.1 What exists today (file/line evidence at c74adfe3)

The live path is a complete chain in code. It is **not** the
Twilio-media-stream shape and **not** a server-side stream: each
participant's own device streams its own microphone to Deepgram
directly, and posts final segments back to the server.

1. **Consent gate (server).** `OpalCore.Calls.Assist`
   (`apps/opal_core/lib/opal_core/calls/assist.ex`):
   `assist_state/2` is `:active` only when the call is answered
   + media-connected and **both** participants have an
   unrevoked allow (line 190 ff.). `apply_defaults/1`
   (lines 93–113) seeds a per-call allow only for participants
   whose standing `users.assist_calls_enabled == true`.
2. **Grant.** `Assist.grant/3` (assist.ex:153–164) refuses with
   `:assist_inactive` unless `:active`, then calls the issuer —
   in production `OpalCore.Calls.DeepgramGrant.issue/0`
   (`deepgram_grant.ex:10`), which POSTs
   `https://api.deepgram.com/v1/auth/grant` (line 7) with the
   server-only `DEEPGRAM_API_KEY` and returns a 60-second
   token. HTTP route: `POST /calls/:id/transcription/grant`
   (`router.ex:274` → `call_controller.ex` `transcription_grant`;
   an unconfigured key surfaces as 503
   `transcription_unavailable`).
3. **Device-mic websocket (web).** `CallAssistControl.hear()`
   (`apps/opal_web/src/opalUi/callAssist.tsx:61–132`): gated on
   the polled server state being `"active"` and unmuted; takes
   a **clone of the live call's own mic** via
   `tapCallMicrophone(callId)` (line 65; `CallClient.ts:62–66` —
   Assist never acquires a second mic, and **remote playback is
   never sent** — callAssist.tsx header comment, lines 25–28);
   opens `wss://api.deepgram.com/v1/listen?model=nova-2&…&interim_results=true&mip_opt_out=true`
   with the grant token as subprotocol (lines 74–77); streams
   `MediaRecorder` chunks every 250 ms (lines 113–124); on
   final results only, POSTs the segment to the server
   (lines 94–107).
4. **Ingestion + fold (server).** `POST /calls/:id/transcripts`
   (`router.ex:275`) → `Assist.accept_transcript/3`
   (assist.ex:166–188) — the **only** entry that can persist a
   segment; interims persist nothing; finals insert a
   `TranscriptSegment` and only then fold into the graph
   (`VoiceAlignment.record/2`, `Outcomes.record_proposal/3`,
   commitment / open-question / waiting-on extraction, in
   `store_final`, assist.ex:204 ff.). Pause is a real halt:
   any participant's per-call pause makes the state `:off`, so
   both the grant and `accept_transcript/3` refuse with
   `:assist_inactive` before any persistence (R19 W12 pause
   proof, `incall-report.md` §5).
5. **Batch (the proven sibling).** `DeepgramClient.transcribe_batch/2`
   (`deepgram_client.ex:41–53`) — POST to
   `api.deepgram.com/v1/listen`, honest `{:disabled,
   "transcription not configured"}` when unkeyed, **no canned
   transcript anywhere** (the R18 BS-4 stub was removed
   outright). Callers: `CallTranscription.after_call_ended/1`
   (post-call, consent-gated, needs a recording binary),
   `AudioIngestor` / `VoiceNotes` (voice notes).
6. **Two orphaned modules — not the live path.**
   `Intelligence.LiveTranscription` (`live_transcription.ex`):
   `start/1` returns a state map whose `stream:` is
   `DeepgramClient.stream_interface()` — which is
   `%{status: :not_wired, …}` (`deepgram_client.ex:59–67`, its
   own doc: "documented seam for future live-call websocket
   wiring"). **Zero callers in `lib/`** (grep at this tip: the
   module name appears only in its own file).
   `Intelligence.LiveTranscriptionConsumer`
   (`live_transcription_consumer.ex`): `readiness/0` +
   `consume_final/1`; its only caller is its own test
   (`event_driven_test.exs:211–231`, which pins only the
   unkeyed `{:disabled, :api_key_missing}` leg). Neither module
   is wired to `Assist`, to a channel, or to any controller.
7. **Where the live surface renders:** only inside
   `CallSurface`'s live view, only when `phase === "connected"`
   with a real `assistCallId` (`CallSurfaces.tsx`, connected
   branch) — i.e. only in the unmounted legacy shell (§0).

### 1.2 Consent model — founder's model vs the code

Task-stated founder model: standing permission disclosed at
onboarding; graphed state visible in the call; any participant
can shut it off per call; both states logged in consent
lineage. Against the code at this tip:

- **Standing permission: EXISTS, in Settings — not at
  onboarding.** `users.assist_calls_enabled` (nullable:
  true/false/never-decided), read/written via
  `GET/PATCH /api/v1/product/preferences/assist`
  (`incall-report.md` §6), and it **is** mounted in the served
  C2 shell: "Opal Assist on calls" toggle
  (`c2/shell/shellData.ts:2490–2501`, write path
  `C2Shell.tsx:1826–1829` via `updateAssistPreference`). The
  onboarding flow carries only a capability line
  (`onboarding/holyShitCopy.ts:60`: "Let Opal help on calls
  when you both turn Assist on.") — no permission is collected
  or disclosed as granted there.
- **Visible graphed state per call: TRUE** (on the legacy
  surface) — one server derivation
  `Calls.Graphing.graphing_state/1` (`calls/graphing.ex:52–65`:
  `:graphing | :paused | :waiting_for_other | :off`), rendered
  verbatim by `GraphingLight` + the capture-truth sentence,
  broadcast on `call:<id>` so both participants' lights move
  together. **Default posture DIVERGES from the founder's
  model (open item D-2, `repair21-handoff.md`):** the founder's
  model is default-ON with per-call pause; the build is
  opt-in — a call starts in `:graphing` only if **both**
  participants previously set the standing allow.
- **Any participant can shut it off per call: TRUE** — REST and
  channel doors into the one `Assist.set_allowed/4`; a peer's
  pause can only be resumed by that peer; pause halts
  ingestion for real (§1.1.4).
- **Both states logged in consent lineage: TRUE for
  user-driven transitions, one named gap (D-3).** Every
  `set_allowed/4` write records an append-only
  `call_graphing_events` row + a `call.graphing_changed`
  outbox event before broadcast (`calls/graphing.ex`,
  `record_transition/4`). **Gap:** `apply_defaults/1` seeding
  (a call that *starts* in `:graphing` from two standing
  defaults) writes consent rows but **no** `graphing_on`
  lineage row (`r21-calls-report.md`, semantics §iii).

### 1.3 What is provable WITHOUT founder-only credentials or external accounts

Provable — and **already proven**, so no new build is owed:

- The consent gate around the grant, with an **injected
  issuer**: `assist_test.exs:20–36` proves grant refusal while
  off/waiting/revoked and grant success while `:active`. This
  proves the gate, not Deepgram: the issuer is a test fun, by
  design of `Assist.grant/3`'s third argument.
- The full server ingestion leg downstream of Deepgram:
  `accept_transcript/3` persistence, interim refusal, the
  graph fold, and the pause-halt (segment count frozen during
  a pause) — pinned in `assist_test.exs` and the R19 W12
  graphing suite (7 tests), and exercised end-to-end at
  API + served-DB level by the R19 J6 run
  (`functional-accountability.md`, INGESTION (a): "segments
  persist, pause halts ingestion with `assist_inactive`, the
  lineage records `graphing_on → graphing_paused →
  graphing_resumed`"). In those proofs the segment text
  arrives through the API directly — i.e. the test stands in
  for the provider session. That is honest proof of
  everything **except** F-16 itself.
- Batch transcription against a provider-shaped response via
  the `:deepgram_http_fun` transport seam
  (`deepgram_ears_test.exs`), and the unkeyed honest-disabled
  shape (`repair18_bs_honesty_test.exs:109–123`).

**Not provable on this VM — the actual F-16 slice.** The
end-to-end live session needs, simultaneously: (a) a
media-connected call on a surface that mounts
`CallAssistControl` — the served shell mounts none (§0), and
connected-state captures on this VM are recorded as
unreachable ("headless fake-media ceiling",
`polish-incall-report.md` §5/§7; `polish-p9-draft.md` F5); the
one lab media proof on record (W9 dual-Chromium TURN relay,
`shots/calling/W9_CALLING.md` §1b) required the Twilio creds
from the Mac's `r1a1.env`, i.e. an external account; (b) a
Phoenix process holding `DEEPGRAM_API_KEY` — per the records
that key exists only in the Mac's `~/.opal/r1a1.env` (§0), and
moving it is a founder credential action this cluster must
not perform; (c) a successful live exchange with Deepgram
itself: `POST /v1/auth/grant` + `wss /v1/listen` — neither has
**ever** been exercised in any record in this repo (the
2026-10-08 verification covered projects/batch/readiness
only). A further code-level obstacle to local proof:
`DeepgramGrant.issue/0` has **no transport seam** — unlike
batch's `:deepgram_http_fun`, the grant's `:httpc` call is
hard-wired, so even the grant leg cannot be driven against a
local fixture without either the real key or a code change
whose only purpose would be to simulate the provider —
exactly the fakery this cluster is forbidden from shipping.
A loopback/fixture path therefore proves nothing about F-16:
every hop it could reach is already pinned, and the hop it
cannot reach is the item itself.

### 1.4 Missing pieces (exact)

1. **An exercised live provider session** — grant mint +
   device-mic websocket + a final segment landing through
   `accept_transcript/3` on a real call. Zero evidence exists.
2. **A served in-call surface to run it on** — the C2 mount
   (§2; F-16's `hear()` path lives inside it).
3. **A Deepgram key in the proof stack's env** — the proof
   must run either on the founder's Mac (where the records
   place the key) or on a stack the founder has provisioned.
4. **D-2 founder decision** — default posture (opt-in as built
   vs the founder's default-ON model). Transcription cannot
   start under either posture without both participants
   allowing; the decision changes what a first call looks
   like, and it is the founder's, per `repair21-handoff.md`.
5. **D-3 lineage gap** — `apply_defaults/1` seeding writes no
   `graphing_on` lineage event (code fix shaped in
   `r21-calls-report.md` §iii; lands with the mount build).

### 1.5 Exact founder steps that would unblock

1. **Run (or provision) the proof stack where the key is.**
   Either: (a) run the staging Phoenix on the founder's Mac —
   `~/.opal/r1a1.env` there already holds `DEEPGRAM_API_KEY`
   per the 2026-10-08 audit; `runtime.exs` auto-loads it at
   boot, so start/restart Phoenix once with that env in place;
   or (b) to prove it on this VM instead, the founder places
   `DEEPGRAM_API_KEY` into `~/.opal/r1a1.env` **on the VM host
   running Phoenix** (never in the repo) and restarts Phoenix
   once. No code reads any other name or location for this
   key.
2. **Confirm the Deepgram account can do the two live calls
   the code makes** (console.deepgram.com, the project that
   owns the key in step 1): temporary-token grant
   (`POST /v1/auth/grant`, used by `DeepgramGrant`) and
   streaming listen (`wss /v1/listen`, used by the web
   client). The records verify neither. If the existing key
   cannot mint grant tokens, create a key that can in the
   console and replace the `DEEPGRAM_API_KEY` value in
   `~/.opal/r1a1.env`, then restart Phoenix once.
3. **For a cross-network proof call, keep the Twilio pair in
   the same env file** — `OPAL_TWILIO_ACCOUNT_SID` +
   `OPAL_TWILIO_AUTH_TOKEN` (records list both as already SET
   in the Mac file) so TURN mints instead of falling back to
   STUN-only; a same-LAN proof does not need this step.
4. **Make the D-2 decision** (default-ON vs opt-in) and, with
   it, confirm the Settings standing-permission toggle is the
   disclosure surface, or direct an onboarding disclosure
   build.
5. **Walk it on two real devices/accounts** (the
   founder-proven pattern of 2026-10-19): both accounts set
   "Opal Assist on calls" on (or enable on the first-call
   prompt), place a call on the build that mounts the in-call
   surface (§2), speak a plan-shaped sentence, and read back:
   a persisted transcript segment + its graph fold on the call
   record, the graphing light on both devices, and a pause
   mid-call after which nothing further persists.

**DISPOSITION — F-16: BLOCKED.** Reason: the live provider
session (Deepgram grant + device-mic websocket on a real,
media-connected call) has never been exercised in evidence and
cannot be exercised from this VM — the only Deepgram key the
records know of lives in the founder's Mac `~/.opal/r1a1.env`,
the grant leg has no local test seam, and the served shell
mounts no surface that could run `hear()` in any case. Founder
steps: §1.5 (run/provision the stack where `DEEPGRAM_API_KEY`
lives, confirm grant + streaming on that Deepgram project,
decide D-2, two-device walk). Nothing simulated; no canned
transcript, no fake segment, no "listening" state was built
or claimed.

---

## 2. W-5d — In-call orbit doorway / in-call frames

### 2.1 What exists today (file/line evidence at c74adfe3)

- **The doorway control is real and correctly gated.**
  `CallSurface` (`apps/opal_web/src/opalUi/CallSurfaces.tsx`)
  renders, in its live view, the orbit doorway button
  (`data-testid="call-open-orbit"`, lines 317–330) only when
  `orbitConversationId && onOpenOrbit` are both supplied, with
  `data-conversation-id={orbitConversationId}`. The component's
  own header comment (lines 54–76) carries the sharpened R21
  declaration of the blocker, verbatim in substance.
- **Its gating id never arrives — anywhere.** Grep at this tip:
  `orbitConversationId` appears **only** in `CallSurfaces.tsx`
  (its definition and its render). Zero call sites pass it.
  The legacy surface state that would supply it,
  `LiveCallSurface` (`apps/opal_web/src/opalUi/callLifecycle.ts:7–20`),
  has **no conversation field at all**, and `OpalApp`'s
  `callSurface` state (`OpalApp.tsx:1063–1084`) likewise
  carries `liveCallId`, caller/callee ids, kind, plan — never
  a conversation id. The server side is *not* the gap:
  `CallController.public/2` already projects
  `"conversation_id"` on every live-call response
  (`call_controller.ex`, `public/2`), and
  `Calls.invite_in_conversation/3` creates the call from the
  conversation in the first place.
- **The served shell mounts no in-call surface** (§0): C2's
  `placeCall` leaves only a status note and a re-read log.
  `CallSurface` renders only inside `OpalApp.tsx` (two render
  sites, e.g. lines 7687, 10983), which `App.tsx` no longer
  mounts.
- **The target the doorway opens already exists and is
  reachable from elsewhere:** the thread's orbit route.
  In C2, `ChatsHost.openThreadThenOrbit`
  (`C1ShellHosts.tsx`) opens a conversation's orbit, and the
  call-**log** row already carries doorway parity through it
  (`PeopleCallsList` `onOpenOrbit` → `openThreadThenOrbit(call.conversationId)`)
  — the R20/R21 record's "the call LOG row carries the live
  parity route meanwhile" is still true at this tip.
- **Frames:** pack-v2 contains **no** `incall-*` frame. The
  one historical in-call frame was quarantined as a mislabeled
  call log (R21, `r21-calls-report.md` §0a), and the capture
  pipeline now has a call-family content-signature gate that
  refuses a log frame filed as in-call and vice versa
  (§0b there). The four owed frame states (connected/graphing-on,
  connected/paused, video-kind, live surface) remain DECLARED
  with their blockers, per `r21-calls-report.md` W-16.

### 2.2 What is provable WITHOUT founder-only credentials or external accounts

- The doorway's gate, target, and server projection are all
  already pinned by existing tests (doorway identity pins in
  `graphingLight.test.ts` / `connectedCall.test.ts`; the
  call-family signature gate, 13/13 in
  `surfaceSignature.test.mjs` per the R21 record). No new
  local proof is owed for the *button*.
- **The mount itself is not a provable slice on this VM.**
  The honest build is the one named part-by-part in
  `r21-calls-report.md` §(a): C2 shell holds a live-call
  surface state fed by (1) `placeCall`'s created call, (2) the
  realtime call inbox (`productRealtime.onCallInbox` — the
  socket is already started by C2Shell; the subscription is
  missing), and (3) `ActiveCallOverlay` joined on that socket,
  rendering `CallSurface` from `deriveCallView` + the media
  runtime — plus threading the call record's
  `conversation_id` into `orbitConversationId` and
  `onOpenOrbit` → `openThreadThenOrbit`. That is a port of the
  legacy live-call state machine into the served shell, not a
  small wiring. Its end-to-end proof obligation — a two-seat
  call reaching **media-connected** in the served C2 shell,
  the doorway tapped, the correct conversation's orbit
  opening — cannot be discharged on this VM: connected-state
  WebRTC proof in headless Chromium is the recorded
  fake-media ceiling (§1.3), and the only lab media proof on
  record used an external account's TURN credentials.
  Building the mount without that proof would ship a surface
  this cluster cannot distinguish from a mounted-but-dead
  one — the exact failure the task forbids. Per the task's
  bar (build only on overwhelming evidence of local
  end-to-end provability), **no product code was built**.

### 2.3 Missing pieces (exact)

1. **The C2 in-call mount** (engineering, no credential
   needed): live-call surface state in `ChatsHost`/`C2Shell`
   from `placeCall` + `onCallInbox` + `ActiveCallOverlay` on
   the shell's existing `productRealtime` socket, rendering
   `CallSurface` with `deriveCallView` — as specified in
   `r21-calls-report.md` §(a).
2. **The one-line doorway wiring that rides it:** pass the
   created/answered call's `conversation_id` (already in
   every live-call API response) as `orbitConversationId`,
   and `onOpenOrbit` → the host's existing
   `openThreadThenOrbit(conversationId)`.
3. **D-3's lineage fix** rides the same build (§1.4.5).
4. **A two-seat proof rig that can reach media-connected** —
   in practice, two real devices/accounts on the served
   build; the VM's headless path is recorded as insufficient.

### 2.4 Exact founder steps that would unblock

W-5d needs **no credential and no account** from the founder.
It is blocked on proof capacity, and the founder step is the
proof itself:

1. **Schedule the two-device walk on the served C2 build**
   (the pattern already founder-proven on the legacy surface,
   2026-10-19): two accounts, the mount build (§2.3.1–2)
   served, A calls B from a conversation, B answers, media
   connects — then tap the in-call orbit doorway and confirm
   it opens **that call's conversation's** orbit; capture the
   four W-16 frame states (graphing-on, paused-for-this-call,
   video-kind audio-only truth line, live surface) at
   390×844 in both modes through the call-family signature
   gate. Until a build containing the mount exists and that
   walk runs, every `incall-*` frame would be staged.
2. **The D-2 decision (§1.5.4)** also lands here in effect:
   the walk's graphing-on frame requires both participants
   allowing under whichever posture the founder chooses.

**DISPOSITION — W-5d: BLOCKED.** Reason: the served C2 shell
mounts no in-call surface (`App.tsx:36`; zero `CallSurface` /
`ActiveCallOverlay` references under `src/c2/`), the legacy
surface state drops the call's `conversation_id`
(`callLifecycle.ts:7–20` has no conversation field;
`orbitConversationId` has zero call sites), and the mount
build that would carry the doorway cannot be proven
end-to-end on this VM (recorded headless fake-media ceiling;
the only lab media proof required external TURN credentials).
Founder step: §2.4 — no credential; a two-device walk of the
mount build on the served shell, plus the D-2 decision. No
dead doorway was wired, no frame was staged or filed.

---

## 3. Cluster summary

| Item | State at c74adfe3 | Provable locally without external accounts? | Disposition |
|---|---|---|---|
| F-16 live call transcription | Code-complete chain (consent gate → Deepgram grant → device-mic wss → gated ingestion/fold); never exercised; two paste-era live modules orphaned (`LiveTranscription` stream `:not_wired`, consumer test-only) | Downstream legs yes — already pinned (gate, ingestion, pause-halt, batch). The live provider session itself: **no** | **BLOCKED** — founder steps §1.5 |
| W-5d in-call doorway / frames | Doorway button + gate + orbit target + server `conversation_id` projection all exist; no served in-call surface to mount on; id never threaded; no `incall-*` frames filed | Button/gate yes — already pinned. The mount end-to-end: **no** (proof ceiling on this VM) | **BLOCKED** — founder steps §2.4 |

Commits on `muse/r24-incall`: this assessment only (docs).
No product code, no simulated transcript, no canned frame,
no mounted-but-dead surface. No merges, no deploys, gates
untouched.
