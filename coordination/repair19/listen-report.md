# Repair #19, Wave W6 — KILL THE LISTEN RAIL (W5-08)

- **Branch / worktree:** `muse/r19-listen` at `~/workspace/opal-graph/wt-r19-listen`, off `muse/repair-19` base `f2981dbf`. **Not pushed.** No other worktree touched.
- **Commits:** `70dfe417` (rail kill, C1/C2), `7d87d94f` (breadth sweep, legacy shell + backend), `b3c40b8d` (experience: speaks from Opal's mark). Tip at report time: see final handoff (a report-commit may follow).
- **Founder law:** "Opal doesn't listen — it graphs. That's our thing." Plus: he doesn't remember asking for a "Zoom page" — meeting content belongs in the product only as ingested transcripts, never as a surface identity.
- **YOUR MOVE fire-frame card: untouched** (protected pattern; no file that renders it was modified in its card logic — `MessageFlow`/`ThreadShell` changes are limited to the Opal-bubble action row and the transcript-correction button class name).

---

## 1. What the rail was, and exactly which surface the founder saw

**The surface:** C1 `CenterChat`, served by the C2 shell's Center host
(`apps/opal_web/src/c2/shell/C1ShellHosts.tsx` → `CenterHost` renders
`CenterChat` with the active session's title). A session titled
**"Zoom standup with the team"** is a Center chat session (its title is the
conversation's topic — the same words the backend intent tests use for a
plan request, "Zoom standup with the team Tuesday"); the header renders
`title` + a presence subtitle that was, verbatim, **"Here with you."**
(`PRESENCE_COPY.idle` in `apps/opal_web/src/opalUi/c1/C1Surfaces.tsx`).

**The rail:** `ListenButton` (`apps/opal_web/src/opalUi/c1/ListenButton.tsx`,
ST-I, R18 adopt3). It is a **TTS playback** control — it speaks the exact
displayed text via `speakApprovedText`, gated honestly on
`GET /voice/status` (`tts_configured`). `MessageFlow` rendered it **inside**
every Opal bubble:

```tsx
<div className="c1-bubble …"> <span className="c1-opal-dot"/> <span>{m.body}</span> <ListenButton/> </div>
```

`.c1-bubble` is `display:flex` with the body span taking the row; the button
had **no CSS rule at all** (`.c1-listen-btn` is defined nowhere in the C1
stylesheets), so at 390px it was crushed into the remaining sliver and its
label wrapped letter-by-letter — the vertical "L-i-s-t-e-n" rail down the
side of every Opal message. This is the same defect the R18 map-trace
already named as **MT-13** ("C1 Listen 390px wrap", harmony2 §1).

**Second site of the same button:** `PlanCard` (thread size) rendered
`<ListenButton text={summaryText}/>` at the foot of every plan card — same
mislabeled CTA, in the card's column.

## 2. Every site found, and what replaced each

### 2a. The rail + listening frame (integrated C1/C2 app) — commit `70dfe417`

| # | Site (file) | Was | Replaced with |
|---|---|---|---|
| 1 | `opalUi/c1/ListenButton.tsx` | "Listen" / "Listen - try again" button, `listen-play`/`listen-stop` testids, aria "Listen"/"Stop listening" | **Renamed file/component to `ReadAloudButton.tsx` / `ReadAloudButton`** — same real function (see §3), honest label **"Read aloud"**, testids `read-aloud-play`/`read-aloud-stop`, aria "Read aloud"/"Stop reading aloud" |
| 2 | `opalUi/c1/C1Surfaces.tsx` `MessageFlow` | ListenButton **inside** the Opal bubble (the rail) | Control moved **out of the bubble** into its own horizontal action row **below** it (`.c1-message-actions`); bubble now contains only Opal's dot + words |
| 3 | `opalUi/c1/PlanCard.tsx` | ListenButton at card foot | `ReadAloudButton`, as its own row in the card column |
| 4 | `opalUi/c1/C1Surfaces.tsx` `PRESENCE_COPY` | idle "Here with you.", listening "Listening.", thinking "Thinking.", responding "Got it." | Graph language: idle **"Your plans, graphed."**, listening **"Voice input is on."**, thinking "Working on it.", responding "Opal answered." |
| 5 | `opalUi/c1/C1Surfaces.tsx` `CenterChat` header | subtitle = presence copy → "Here with you." under any title | Self-evident identity (surface map entry 5): idle subtitle is **"Chat with Opal"**; non-idle states (real signals only) use the new graph-language copy |
| 6 | `opalUi/c1/C1Surfaces.tsx` `VoiceTranscriptCorrection` | buttons reused class `c1-listen-btn` | class renamed `c1-inline-action-btn` (function unchanged: sender corrects the stored transcript) |
| 7 | `opalUi/c1/c1.css` | **no rule** for the button (why it crushed) | `.c1-read-aloud-btn`/`.c1-inline-action-btn`: `white-space:nowrap; flex:none`, natural width, pill; `.c1-message-actions` row under the bubble, `:empty { display:none }` so provider-off takes zero space — a rail can never form again at any width |
| 8 | `c2/shell/shellData.ts` Settings "What Opal hears" section (title, lede, index entry, You keywords, error note, fallback rows) | Title "What Opal hears"; room row "Listening in the room" / "There is no room listening in Opal…"; calls row "Opal cannot listen to or write down a live call yet"; meetings row "Zoom and other meetings are a future source, named here so the place exists" / "Coming later" | Title **"What Opal graphs"**, lede "Where Opal's graphs and memory come from…"; room row **"In the room" / "Opal does not capture room audio, hidden or otherwise."**; calls row "Opal does not transcribe a live call here. Nothing is recorded in secret."; meetings row states the ingestion rule (§4) with value **"Not wired yet"** (was the promissory "Coming later"). Internal section key `what-opal-hears` and the `/settings/hears` API route are **unchanged** — stable internal identifiers, not user-facing copy (changing them would break routing/other waves for zero user benefit) |
| 9 | `c2/shell/C2You.tsx` | Settings group label "What Opal hears" | "What Opal graphs" |
| 10 | `opal_core/lib/opal_core/settings/ingestion_status.ex` (backend, source of the live per-source lines the C2 section renders) | room title "Listening in the room", progress "There is no room listening in Opal, hidden or otherwise." | **"In the room"**, **"Opal does not capture room audio, hidden or otherwise."** (state stays `absent` / "Not in Opal today" — TRUE/HONESTLY-ABSENT unchanged) |

### 2b. Breadth sweep — legacy shell + presence/status labels + backend copy — commit `7d87d94f`

The founder's retrospective rule: prove the **class**, not the screenshot —
and his sharpened note: Opal is **never described or shown as "listening"
anywhere user-facing**. The R17 legacy shell is still reachable
(`?shell=r17`), so it was swept too. Every remaining user-facing
Listen/Listening string in the repo's rendered copy:

| # | Site | Was | Now |
|---|---|---|---|
| 11 | `opalUi/OpalLivingCharacter.tsx` (legacy Center character status + aria) | status "Listening", aria "Stop listening" | **"Voice input is on"**, **"Stop voice input"** |
| 12 | `opalUi/livingCharacterState.ts` `LIVING_STATE_COPY.listening` | "Actively listening." | "Voice input is on." |
| 13 | `opalUi/opalPresence.ts` `OPAL_PRESENCE_COPY.listening` | "Listening" | "Voice input is on" |
| 14 | `opalUi/opalCenterVoice.ts` `LISTENING_COPY` (legacy Center composer placeholder while capturing) | "Listening…" | "Voice input is on…" |
| 15 | `opalUi/OpalCenterChat.tsx` mic aria | "Stop listening" | "Stop voice input" |
| 16 | `opalUi/OpalCenterLifeGraph.tsx` mic aria + attach note | "Stop listening", "Listening…" | "Stop voice input", "Voice input is on…" |
| 17 | `opalUi/OpalAmbient.tsx` voice control | testid `opal-listen`, aria "Stop listening", notes "Listening ended…"/"Listening UI on…" | testid `opal-voice-input`, aria "Stop voice input", notes "Voice input ended…"/"Voice input on…" |
| 18 | `opalUi/callAssist.tsx` (in-call consent note) | "Opal Assist can listen during this call to help with plans." | **"With your say-so, Opal Assist transcribes this call to help with plans. Raw audio is not saved."** — names the real, consented Deepgram function |
| 19 | `opalUi/YouSettingsDestination.tsx` (legacy settings note) | "Assist only listens when allowed." | "Assist transcribes a call only when you say so." |
| 20 | `opal_core/lib/opal_core/settings/connections.ex` (×2) — Settings Connections catalog, which the C2 shell renders **verbatim** from the server | display name "Listening to voice notes (Deepgram)" | **"Transcribing voice notes (Deepgram)"** (its own powers line already said "Turns voice notes and recordings into words Opal can read") |
| 21 | `opal_core/lib/opal_core/voice.ex` `listen_disabled` message (returned by `GET /voice/listen`, the voice-note gate) + moduledoc | "I can't listen to voice notes yet" | **"I can't transcribe voice notes yet"** (2 backend test pins updated to match) |
| 22 | `opal_core/lib/opal_core_web/controllers/voice_controller.ex`, `voice.ex` doc lines | "The web Listen control renders…", "**Listen path:**" | "The web read-aloud control renders…", "**Transcription path:**" |

**Scanned and classified — deliberately NOT changed:**

- **Internal identifiers, not copy:** the `"listening"` presence **state key**
  (`livingCharacterState`, `opalPresence`, C1 `PresenceState`, C2 projections,
  `loopExpressionForPresence`), `externalListening` props, `listenOnce`/
  `stopListening` function names, `is-listening` CSS hooks, dock
  `data-opal-state="listening"` attributes, the Deepgram `wss://…/v1/listen`
  provider URL, and the `/voice/listen` + `/settings/hears` API routes. None
  of these ever renders as words on a surface; the breadth scan (§5C) proves
  the state key never reaches the glass (the legacy character's rendered
  status/aria are pinned directly).
- **`opal_core/…/opal_message.ex` `@oc1_placeholder_body` = "I'm listening.
  Tell me what's on your mind…":** a **guard fingerprint**, kept on purpose.
  Its doc says "must never appear in the live response path", and
  `opal_placeholder_guard_test.exs` / `opal_conversations_test.exs` /
  `opal_response_test.exs` assert live Opal replies never equal/contain it.
  It is **never rendered** (TRUE classification: dead constant whose only
  job is to be refuted). Changing its text would disarm the guard. The
  breadth scan allowlists exactly this one line, by content.
- **`styles.css` `.opal-listen-btn` rules:** orphan CSS (no component uses
  the class — the similarly named C1 class was `c1-listen-btn`); renders
  nothing. Left in place to avoid churn in the shared legacy stylesheet;
  flagged here so a future cleanup can delete it knowingly.
- **Mobile app (`apps/opal_mobile`):** swept — no user-facing listen copy
  (only test names about event listeners).
- **Voice-note surfaces (ST-H):** a voice message renders a player + its
  real transcript as caption — that is an ingested record with provenance,
  already honest, and not a listening frame. Untouched.

## 3. What the rail carried, and the re-home decision

The rail carried a **real function**: TTS playback of Opal's exact words.
It was **kept, not removed** — deleting it would have removed a working,
honestly-gated capability (provider off ⇒ control absent, never a silent
button; playing is stoppable; unmount stops the audio). What died is the
**label** ("Listen" — the function never listened to anything; it speaks)
and the **placement** (crushed inside the bubble).

**Design notes (interpretive key: functional parity, experiential
invention):**

- **Parity:** identical function — same exact string handed to the provider
  (message body verbatim; plan title+when+where summary on cards), same
  provider gate, same stop/unmount semantics. Proven end-to-end in tests (§5).
- **Invention in Opal's physics, not a renamed rail:** the control is
  **Opal's own presence mark** — the iris orb that marks Opal's node in a
  conversation (same gradient/geometry family as the bubble's Opal dot and
  `PresenceMark`) — with the label beside it, in the message's own action
  row **below** the bubble. While the words play, **the mark itself pulses**
  (`.c1-read-aloud-orb.is-speaking`, the existing `c1-pulse` motion): Opal
  speaks *from its mark*; the speaking state lives on the node, not on
  borrowed media-player chrome. On plan cards the same mark+label sits at
  the card's foot.
- **Where clarity won over invention:** the label stays the literal words
  **"Read aloud"**. A coined graph metaphor ("Hear the graph", "Play the
  node") would be a renamed rail and would fail a first-time reader; the
  invention moved to structure and motion instead, per the key.
- **Naming elsewhere follows the same rule:** a real mic capture is named
  for the **input** ("Voice input is on" / "Stop voice input"), never for
  Opal hearing you; consented call transcription is named **transcribes**,
  the thing it actually does.
- **QUIET:** provider-off renders nothing and the empty action row takes
  no space (`:empty` rule) — no dead chrome, no placeholder buttons.

## 4. Ingestion-honesty note for meeting / Zoom content

- There is **no "Zoom page" and no meeting surface identity** in the served
  app after this wave, and there was no live-listening state behind the
  founder's screenshot: the surface was a **chat with Opal** whose session
  title names its topic. The header now says so ("Chat with Opal").
- A meeting enters Opal **only** as what it is: meeting **links** on plans
  are kept (backend `meetings` source: state `links_only`, "Nothing inside
  a meeting comes back to Opal"); **transcripts/summaries** enter only as
  ingested records inside a conversation, with provenance — the pattern the
  app already uses for voice notes (player + transcript caption from the
  real transcription path; no transcript ⇒ no caption, no claim) and call
  outcomes (kept as outcomes, not recordings).
- The Settings source row now states this in plain words instead of
  promising a future surface: *"Meetings are not a page in Opal. A meeting
  enters only as an ingested transcript or summary record in a
  conversation, with its source named — and that is not wired yet."*
  (value: **"Not wired yet"**). Classification: transcript ingestion from
  meetings = **HONESTLY ABSENT** today; meeting links on plans = TRUE;
  any live-listening meeting state = FALSE, and nothing renders one.

## 5. Tests added + results (verbatim)

### New permanent suites

- **`apps/opal_web/src/opalUi/c1/r19ListenRail.test.tsx` (7 tests)** — the
  founder's exact surface (CenterChat titled "Zoom standup with the team"):
  no Listen CTA/testids/classes, no "Here with you"/"Listening" anywhere in
  the render; header = title + "Chat with Opal"; Read aloud sits **outside**
  the bubble (`.c1-message-actions`, bubble text is exactly the message),
  carries Opal's orb mark, speaks the **exact** body end-to-end
  (`speakApprovedText` called with `{text, approved:true}`, play → stop →
  pause, mark gains `is-speaking`); provider-off ⇒ no control at all;
  ThreadShell same treatment; PlanCard speaks the exact displayed summary;
  `PRESENCE_COPY` values listen-free; source pins over the served C1/C2
  files that carried the frame.
- **`apps/opal_web/src/opalUi/c1/r19ListenBreadth.test.tsx` (5 tests)** —
  the breadth proof (§5C below).
- **Updated pins:** `adopt3.test.tsx` ST-I → "ST-I Read aloud" (same
  end-to-end assertions on the new testids); `adopt2Settings.test.tsx`
  room fixture → the backend's new line; `settingsArchitecture.test.tsx`
  now also asserts "What Opal graphs", "Meetings are not a page in Opal",
  and NOT /Listening/ or "What Opal hears"; `opalCenterVoice.test.ts`
  `LISTENING_COPY` pin → "Voice input is on…"; backend `voice_test.exs` +
  `voice_api_test.exs` disabled-message pins → "I can't transcribe voice
  notes yet".

### 5C. Breadth of the scan (what the proof covers)

- **Rendered DOM scans** (jsdom; copy is viewport-independent — the same
  components render at phone width and in the 1024px wide two-pane C1
  layout, and the rail's layout half is pinned by the nowrap/own-row CSS):
  C1 **CenterChat** (founder's surface), C1 **ThreadShell** (person
  threads), C1 **PlanCard**, legacy **OpalLivingCharacter** with a real
  mic-capture signal on (status text + aria), legacy **OpalAmbient**
  (voice control, including its toggled-on state).
- **Copy-record scans:** every presence/status copy record in the app —
  C1 `PRESENCE_COPY`, legacy `OPAL_PRESENCE_COPY`, `LIVING_STATE_COPY`,
  and the composer `LISTENING_COPY` (real, unmocked) — asserted free of
  any listen framing.
- **Full-source scans:** a string-literal scan of **every non-test file in
  `apps/opal_web/src`** (197-file suite tree; scan asserts >100 files) —
  zero literals containing "Listen"/"Listening"/"Here with you"; and a
  line scan of **every file in `apps/opal_core/lib`** (>50 files) —
  exactly one hit, the allowlisted OC-1 guard fingerprint (§2b).
- **Not claimed here:** served-build screenshot proof at phone/wide in
  both modes — that is pack work (W11); this wave's proof is rendered-DOM
  + full-source, which is the level at which the rail and the copy live.

### Results (targeted, on the final tip `b3c40b8d` unless noted)

- `r19ListenRail.test.tsx` — **7 passed** (inside the c1 cluster run below).
- `r19ListenBreadth.test.tsx` — **5 passed** (same run).
- c1 cluster (`src/opalUi/c1` + `opalPresence.test.ts`): **Test Files 6 passed (6), Tests 72 passed (72)** — includes `c1.test.tsx` 10, `harmony2.test.ts` 13, `opalPresence` 20.
- `opalCenterVoice.test.ts` — **16 passed**; `callAssist.test.ts` — **2 passed**.
- `adopt3.test.tsx` — **9 passed**; `adopt2Settings.test.tsx` — **6 passed**; `settingsArchitecture.test.tsx` — **17 passed**.
- `soloOpal1075.test.ts` — **7 passed**.
- Earlier in the wave (pre-breadth files, same assertions): `OpalCenterChat.test.ts`, `repair18CenterWeb.test.tsx`, `livingCharacterState.test.ts` (6), `waveBGlobalOpalExact.test.tsx` (3), `ChatSessions.test.tsx`, `ProfileGap.test.ts`, `planSurface.test.ts` — all green.
- Backend targeted (`voice_test.exs`, `voice_api_test.exs`, `adopt2_account_settings_test.exs`): **21 tests, 0 failures**.

## 6. Regression battery (verbatim)

- **Web full suite** (`npx vitest run`, whole `apps/opal_web`): 
  `Test Files  16 failed | 181 passed (197)` / `Tests  23 failed | 1509 passed (1532)` —
  **failing set exactly the R18 baseline (23 failed / 16 files)**; passed grew
  1,497 → 1,509 = the 12 new W6 tests, no new failures. (Run started on the
  tree at `7d87d94f`; the orb-mark commit `b3c40b8d` landed during it — the
  affected c1 cluster was re-run green on the final tip, §5, and typecheck
  below is on the final tip.)
- **Typecheck** (`npx tsc --noEmit`): **exactly 9 errors**, all pre-existing
  (3× `OpalApp.tsx` Tab, 5× `api/productClient.ts` duplicates, 1×
  `YouSettingsDestination.tsx` handle) — none in any W6 file.
- **Backend full suite** (`mix test`, own DB `opal_test_r19listen` on
  Postgres 16 :5433, migrated fresh: **110 migrations through
  20261029050001**): **`3170 tests, 0 failures`, EXIT:0.**
- **Environment note:** the VM restarted three times during this wave
  (06:44, ~07:29, ~08:14), wiping `/tmp` dep caches and the first backend
  attempt; all numbers above are from completed runs on this worktree's
  final code.
- **Not done by design:** push (forbidden), served-build screenshot pack
  (W11 owns it).

## 7. Files changed (3 commits)

Web: `opalUi/c1/ListenButton.tsx` → `ReadAloudButton.tsx` (rename),
`opalUi/c1/C1Surfaces.tsx`, `opalUi/c1/PlanCard.tsx`, `opalUi/c1/c1.css`,
`opalUi/c1/r19ListenRail.test.tsx` (new), `opalUi/c1/r19ListenBreadth.test.tsx` (new),
`opalUi/OpalLivingCharacter.tsx`, `opalUi/livingCharacterState.ts`,
`opalUi/opalPresence.ts`, `opalUi/opalCenterVoice.ts` (+test),
`opalUi/OpalCenterChat.tsx`, `opalUi/OpalCenterLifeGraph.tsx`,
`opalUi/OpalAmbient.tsx`, `opalUi/callAssist.tsx`,
`opalUi/YouSettingsDestination.tsx`, `c2/shell/shellData.ts`,
`c2/shell/C2You.tsx`, `c2/shell/adopt3.test.tsx`,
`c2/shell/adopt2Settings.test.tsx`, `c2/shell/settingsArchitecture.test.tsx`.
Backend: `opal_core/settings/ingestion_status.ex`,
`opal_core/settings/connections.ex`, `opal_core/voice.ex`,
`opal_core_web/controllers/voice_controller.ex`,
`test/opal_core/voice_test.exs`, `test/opal_core_web/voice_api_test.exs`.
