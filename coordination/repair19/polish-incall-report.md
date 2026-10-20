# Repair #19 - FOUNDER POLISH WAVE, CLUSTER F: CONNECTED CALL EXPERIENCE (P10a + P10b ORBIT TRACE)

Branch `muse/r19-polish-incall`, worktree `~/workspace/opal-graph/wt-polish-incall`, base `95319bd7` (Repair #19 final tip). Not merged, not pushed. FOUNDER_ACCEPTED stays NO.

Commits:
- `6fa90e32` - Polish F (P10a) backend: live call projection carries plan-in-context (DIR-1 NextPlan) + projection test
- `15a5debb` - Polish F (P10a+P10b): orbit trace on the connected call surface, truthful participant states, plan-in-context
- `b38fe5f9` - Polish F: drop unused public/1 delegate (kills the new compile warning; the controller file is left in its base format posture beyond this wave's hunks, per the W12 precedent - a whole-file `mix format` was run, inspected, and reverted for exactly that reason)

---

## 1. Investigation - existing call / graphing machinery as found

Read first: `incall-report.md` (W12), `ambient-rulebook.md`, `ambient-truth-audit.md`, and the COMPLAINT_LEDGER W5-16 row (GREEN on machinery). Verified at this branch's base, in code:

- **Graphing machinery (W5-16): TRUE and already wired into the connected surface.** Backend: `OpalCore.Calls.Graphing.graphing_state/1` is the one server derivation (`graphing | paused | waiting_for_other | off`) over the per-call Assist consents; `Assist.set_allowed/4` writes consent, records append-only lineage (`call_graphing_events`), publishes the outbox event, and broadcasts `graphing` on `call:<id>`; the pause is a real halt (`accept_transcript/3` refuses `:assist_inactive` before any persistence - W12 pause proof). Web: `CallAssistControl` (in `callAssist.tsx`) polls the assist projection every 2s, refreshes immediately on the `opal:call-graphing` window event forwarded by `ActiveCallOverlay` from BOTH join paths, renders `GraphingLight` + the capture-truth line, and owns the single state-correct pause/resume/held-by-peer control. It already renders ONLY on `view.phase === "connected"` with a real `assistCallId`. The Settings standing permission (`users.assist_calls_enabled`, GET/PATCH `/preferences/assist`) already existed at base; no new code needed.
- **The orbit stage (W12 identity): TRUE.** `CallSurfaces.tsx` live view keeps the peer at the center of two gyroscope rings with Opal's mark riding the ring; the tilted ring turns only while waiting (ringing/connecting), connected rings are still. Elapsed time is a quiet 17px line. The call field is the spectral dark field in both modes; the assist pane is frosted glass.
- **Live media: audio-only, TRUE.** `CallClient` requests `getUserMedia({audio: true, video: false})`; there is no video track, no video toggle on the live path, and the legacy Figma video stage carries `data-video-truth="dark_stage"`. The live view (the `view` branch) is kind-agnostic: audio and video-kind live calls both render it.
- **Speaking / peer-mute signals: ABSENT in the stack (verified by sweep).** No `AnalyserNode`, level meter, remote-track `onmute`/`onunmute`, or mute channel message exists anywhere in the call stack. `CallClient` exposes exactly: connection state (`onState`), `setMuted` (local track `enabled`), and `tapCallMicrophone(callId)` - the live local mic clone Assist already uses. Peer mute and peer speaking have NO signal to render from.
- **Plan association: TRUE in the records, ABSENT on the live projection.** Calls carry `conversation_id`. The call-LOG rows (`Calls.list_for/1`) already carry the DIR-1 fact (`next_plan`, via `NextPlan.for_peer/2`). But the LIVE call projection (`CallController.public/1`, used by create/show/answer/connected/hangup) carried no `next_plan`, and `OpalApp`'s call-surface state carried no plan - so a connected call could not show the plan it is about. That was this wave's one backend gap.
- **F-16 stands.** The Deepgram grant + device-mic websocket path exists in code (`Assist.grant/3`, gated on `:active`; `callAssist.tsx` `hear()`), but live per-call transcription has never been exercised in evidence. Nothing in this wave simulates it: no transcript text, no captions, no fake segments anywhere on the connected surface.

## 2. Novelty review - ON-CALL SURFACES pattern (founder novelty mandate)

For each pattern: alternatives genuinely considered, the pick, and the reason. Clarity was the senior partner throughout; novelty that harmed clarity lost.

### 2a. Sustained-state graphing / live visibility
- **A1 - A banner across the top of the call** ("Graphing is on for this call"). Rejected: it occupies the conversation, competes with the peer's name/status, and reads as an alert for a state that is calm and sustained. Banners are for events, not states.
- **A2 - A badge/pill only** (the W12 graphing light, unchanged). Kept as the legend, insufficient alone: a 9px point + label inside the assist pane is legible when you look at it, but a sustained state deserves a peripheral read - you should be able to feel graphing's presence without focusing on the pane.
- **A3 - PICK: a border-traveling light (the Orbit Trace, P10b) + the existing light as its legend.** The trace informs without occupying the conversation: the center stays the person, the border carries the sustained truth, and the light + words in the pane say exactly what the border means. One orbiting surface per view, one trace, one meaning at a time (graphing takes the trace over live presence - it is the stronger sustained state).

### 2b. Participant states
- **B1 - Zoom-style avatar halo that pulses on the active speaker.** Rejected: it borrows the live pulse's signature for a second meaning (AT-12 collision), it is noisy at call scale, and - decisively - it promises a peer-speaking signal this stack does not have. Novelty that requires faking a signal is not novelty, it is a lie.
- **B2 - Live waveform / level bars per participant.** Rejected: noisier than B1, implies an audio-visualization (and, to many users, a recording) the product is not doing, and again needs the absent peer signal.
- **B3 - PICK: quiet participant rows - name + state word + a still state dot** (speaking = solid spectral point, muted = hollow ring, on-call = dim point). The dot is a register, never an animation: the speaking dot changes only because the measured mic level changed. It renders ONLY what is truthful: this device's mute (real, wired to the track) and this device's speaking (real, measured from the live mic tap); the peer row carries name + "On call" and nothing invented. It matches the graphing light's own shapes (hollow ring = held/muted family), so the surface teaches one shape language.

### 2c. Plan-in-context
- **C1 - The full plan card (thread YOUR MOVE form) on the call surface.** Rejected: it duplicates the thread surface inside a call, occupies the stage, and imports confirm/dismiss actions into a moment where the user's hands are on call controls. The call is about the plan; it is not where the plan is managed.
- **C2 - A top banner strip under the peer name.** Rejected: it stacks a second header over the status line and reads as chrome, not context; at a glance it competes with "Connecting audio..."-class status words.
- **C3 - PICK: one quiet context line under the orbit** - kicker "About", the plan's title, its finished when/where strings, and its state word, with a 3px state edge in the canon indicator hue. It is present on the surface (ringing and connected), recessive by design, renders the ONE projection verbatim, and disappears entirely when there is no shared upcoming plan - presence discipline, never a placeholder.

### 2d. Video-kind connected calls
- **D1 - Paint the Figma video stage (dark tiles) as if it were a feed.** Rejected: that is exactly the fabricated-feed failure the honesty bound forbids; the legacy stage already marks itself `dark_stage` off the live path.
- **D2 - PICK: the same orbit stage as audio + one plain truth line** ("Video is not on for this call - Opal calls are audio only, so there is no camera feed to show."). The connected experience stays first-class and identical in language; the absence is named, not dressed.

## 3. Builds, file by file

### Backend (commit `6fa90e32`)
- `apps/opal_core/lib/opal_core_web/controllers/call_controller.ex` - `public/1` becomes viewer-scoped `public/2` (all five call sites pass their `user_id`; a transient unused `public/1` delegate was removed in `b38fe5f9`). Every live-call response (create, show, answer/decline/cancel via `transition`, hangup, mark-connected) now carries `"next_plan"`: `NextPlan.for_conversation/2` when the call has a conversation, else `NextPlan.for_peer/2` - the same one derivation the call log uses. Null when no shared upcoming plan exists. No new derivation, no schema change.
- `apps/opal_core/test/opal_core_web/polish_incall_next_plan_test.exs` (new, 1 test) - two activated users, a direct conversation, a real call create: `next_plan` key present and null with no plan; after a real plan is created in that conversation, `GET /calls/:id` projects the plan (id, title, when_label) for BOTH participants.

### Web (commit `15a5debb`)
- `apps/opal_web/src/opalUi/orbitTrace.tsx` (new) - the reusable P10b treatment. `orbitTraceStateFor({connected, graphing})` is the one input mapping (not connected -> null; graphing active -> `"graphing"`; otherwise `"live"` - paused/waiting/off never claim graphing). `OrbitTrace` renders nothing for null (the light exits the moment the state ends), carries `data-orbit-trace-state`, and pauses its travel while the document is hidden. It consumes its inputs verbatim and derives no state.
- `apps/opal_web/src/opalUi/participantStates.tsx` (new) - `participantStateModel` (pure: muted > speaking > on call; the peer label is always "On call" - no peer state is modeled because none exists), `useLocalSpeaking` (real level measurement: polls for the live call's `tapCallMicrophone` clone, `AnalyserNode` RMS over a 160ms interval, threshold + 400ms hold, full cleanup; no audio recorded or sent), and `ParticipantStates` (the two quiet rows).
- `apps/opal_web/src/opalUi/CallSurfaces.tsx` - live view only (fixture/gate branches untouched): renders the single `<OrbitTrace>` as the surface's border layer (state from `orbitTraceStateFor`); holds the graphing state lifted from the assist control; renders the plan-in-context line whenever the projection carries a plan (all live phases); renders `ParticipantStates` and the video-truth line on the connected phase (video line only for `kind === "video"`); forwards `onGraphingChange` into `CallAssistControl`.
- `apps/opal_web/src/opalUi/callAssist.tsx` - new optional `onGraphingChange` prop, reported verbatim (via ref, so the poll loop never resets) at all three points where server truth is applied: the 2s poll tick, the broadcast refresh, and the consent write. Rendering, wording, and the pause control are unchanged from W12.
- `apps/opal_web/src/api/productClient.ts` - `ProductCall` gains `next_plan?: NextPlanFact | null` (the DIR-1 type, reused - no second plan type).
- `apps/opal_web/src/OpalApp.tsx` - the call-surface state gains `liveNextPlan`; all 7 sites that learn a live call from a server response (6 creates + answer) set it from `res.call.next_plan`; both `CallSurface` render sites pass `plan={callSurface.liveNextPlan ?? null}`. Incoming ringing carries no plan until the answer response returns the projection - the connected surface is where the plan appears (see frame list).
- `apps/opal_web/src/styles.css` - the orbit-trace treatment (section 4), the plan-in-context line (canon state edge via `data-plan-state`), the participant rows, and the video-truth line. All inside the existing live-call block's neighborhood; no other surface's CSS touched.
- `apps/opal_web/src/opalUi/connectedCall.test.ts` (new, 12 tests) - orbit-trace mapping/exit/token/reduced-motion pins, participant truthfulness pins (model + real-tap source pins + connected-only rendering), wiring pins (one trace, lifted graphing state, verbatim plan fields, app plumbing), video-honesty pins, and the F-16 pin (no captions / live-transcript text in any of the three new/touched surface files).

## 4. P10b - Orbit Trace spec + draft Rulebook entry (for the integrator to file)

**Implementation spec (as built).** Element: `.orbit-trace` overlaying its host surface (`position:absolute; inset:0`, pointer-events none); runner: a conic-gradient segment (92 degrees of arc) clipped to a 2px ring by the mask ring trick (the FireFrame construction), rotating via the registered CSS property `--orbit-trace-angle` (compositor-only; no layout, no JS loop). Colors are tokens, never literals: live = canon happening `--orb-indicator-happening` at 55% mix; graphing = the opal fire sector tokens (`--orb-fire-violet` -> `--orb-fire-cyan` -> `--orb-point-light`) with a <=6px glow at 35%. Speeds: 12s per circuit (live), 9s per circuit (graphing) - both far inside the QUIET loop floor (>=2s). The runner pauses while the document is hidden. The component renders nothing when no sustained state is true.

**Draft rulebook entry - AR-F7 - Orbit Trace (sustained live state) - SHIPPED (Cluster F, connected call surface)**
- **Where:** the connected call surface (its border). Reusable treatment (`orbitTrace.tsx`); any future surface adopting it takes this rule with it.
- **Motion signature:** a light segment travels the surface's border continuously - one circuit in 12s (live presence) or 9s (graphing) - for exactly as long as the state is true, and exits the moment it ends. One orbiting surface per view; one trace per surface.
- **Color/gradient:** by live state - happening cyan (canon `--orb-indicator-happening`, 55% mix) for live presence; the opal fire gradient for graphing active. Graphing takes the trace over live presence when both are true (one trace, one meaning at a time).
- **Intensity + duration:** 2px ring, ambient strength, glow <=6px at <=35%; indefinite WHILE the state lasts, absent otherwise.
- **Meaning:** "This surface is live right now" (cyan) / "This call is being graphed into your shared graph right now" (fire). The trace is the peripheral form of truths the surface also states in words (call status; the graphing light + capture-truth line).
- **Emotional cue:** a quiet orbit of attention around the conversation - presence felt at the edge of vision, never a demand at its center.
- **CHANNELS:** color (canon happening / brand fire) / pattern: the traveling segment itself vs the steady reduced-motion rule (below) / words: the graphing light's label and the call status always accompany it, so color is never the only channel / motion: the travel - redundant, never sole.
- **Static (reduced-motion) equivalent:** the travel stops and a steady 2px ruled border in the same state color remains (solid canon-cyan rule for live; fire-gradient rule for graphing) - the same meaning carried statically. Parity holds by construction.
- **SCIENTIFIC BASIS:** sustained peripheral motion at multi-second periods maintains awareness of a continuing state without the attentional capture of an onset (contrast Jonides & Yantis, 1988 - onsets are spent on events, AR-F1; a sustained state must not keep re-summoning). Cyan's basis is rulebook section 1B happening (calm, approach, low arousal - "open, live, approachable"); the fire gradient is the brand iris, carrying "Opal is acting" as it does on lit reveals (AR-05), here sustained rather than scarce - recorded as a deliberate extension: on this one surface, fire means Opal's graphing is actively working, and the graphing light's words beside it carry the precise meaning. CONFIDENCE: moderate for the peripheral-awareness mechanism; the fire extension is a stated product convention, not a researched association.
- **INTENDED RESPONSE:** peripheral, continuing awareness - "we are live" / "graphing is on" - without looking away from the person; when the state ends, the border rests, and the rest itself says it ended.
- **ACCESSIBILITY STATEMENT:** no sound dependence (AR-00.4); no color-alone meaning (AR-00.5 - the state is named in words on the same surface, and live vs graphing also differ in pattern under reduced motion: solid rule vs gradient rule); reduced-motion parity per AR-00.6 (steady ruled border, above); the travel pauses while the document is hidden; the trace is `aria-hidden` decoration over truths that are all available as text.

## 5. Honest absences

- **Peer speaking: HONESTLY ABSENT.** No remote level/track signal reaches the surface (see section 1). The peer row never shows a speaking state. Wiring point for a future wave: expose the remote stream / track mute events from `CallClient` (its peer connection's `ontrack`) plus a level sampler - the participant row's peer side is ready to carry it truthfully then.
- **Peer muted: HONESTLY ABSENT.** No channel message or track event carries a peer's mute. Same wiring point, plus a `call:<id>` "mute" push on `setMuted`.
- **Self speaking: TRUE but best-effort.** It renders only when the live mic tap and an `AudioContext` are available; where they are not (autoplay policy, no tap yet), the row carries no speaking state rather than a guessed one. It has never been exercised in a rendered capture (see section 7).
- **Live transcription / captions: HONESTLY ABSENT (F-16 stands).** The screens show graphing STATE truthfully - the light, its capture-truth sentence, and now the trace. No transcript, caption, or "listening" text beyond the W12 capture-truth sentences exists, and nothing is simulated.
- **Video: HONESTLY ABSENT as media.** Video-kind calls are audio calls; the connected surface says so in one plain line and paints no feed, no tiles, no video toggle.
- **Plan on incoming ringing: ABSENT until answer.** The inbox event carries no plan fact; the answer response's projection supplies it, so the plan line appears from the connected phase onward for incoming calls (outgoing calls carry it from create). No client-side derivation was added to paper over this.
- **Connected-call rendered frames: NOT CAPTURED by this wave** (the W5-15 debt; headless fake-media ceiling). Section 7 is the precise frame list for the integrator's central pack captures. Nothing in sections 3-4 is claimed as rendered-proven; it is code-proven and test-pinned.

## 6. Tests + exact results

**Execution-method disclosure.** This machine's runtime SIGTERM-reaped the first backend run after the app compiled (the same reaper the W12 report records), and the 5433 Postgres cluster went into crash recovery in the same storm; it recovered on its own and the rerun used the persisted compile. Deps were fetched fresh into the task-specified `MIX_DEPS_PATH=~/workspace/opal-graph/polish-scratch-incall/deps` (the first attempt's apparent hang was the fresh-`MIX_HOME` Hex prompt - rerun with the provisioned incall mix home + stdin closed). Backend env: `incall-scratch/env.sh` (OTP 27.3.4.2 + Elixir PATH, PGPORT 5433) with that deps-path override, `OPAL_CLOCK_OVERRIDE=2026-10-18T09:00:00Z`. Logs: `~/workspace/opal-graph/polish-scratch-incall/logs/` (`backend-targeted3.log`, `backend-final.log`, `web-full.log`).

**Backend targeted (the touched cluster):**
```
polish_incall_next_plan (1, new) + graphing (7) + repair19_calls_call_state (3)
  + repair18_dir1_next_plan (2):  13 tests, 0 failures
After the public/1 cleanup, re-run of the new + graphing files:
  8 tests, 0 failures, and the "public/1 is unused" warning is gone.
Compile: the app compiles with only pre-existing warnings (swept for
call_controller - none remain after b38fe5f9).
```
A full backend suite was NOT run by this wave (the W12 chunked floor at this base is 3,177/0; this wave's backend change is one controller projection + one new test file, and the four files above cover the call/graphing/DIR-1 surface it touches). Declared plainly rather than implied.

**Web targeted:**
```
connectedCall.test.ts (12, new) + graphingLight.test.ts (7):  19 passed, 19 total
(also green in the same session: callAssist.test.ts 2, callView.test.ts 6)
```

**Web floor - failing set exactly baseline (23 failed / 16 files), monolithic run:**
```
npx vitest run --maxWorkers=2:  Test Files 16 failed | 212 passed (228)
  Tests 23 failed | 1,762 passed (1,785 total - includes this wave's 12 new, all passing)
Failing files (16, exactly the baseline set; none is a call/graphing/assist file):
  src/activation.test.ts, src/availability/availability.test.ts,
  src/designTokens.test.ts, src/onboarding/firstRun.test.ts,
  src/opalUi/authorityRejectedStates.test.ts, src/opalUi/grammar.test.ts,
  src/opalUi/graphCalendaring.test.ts, src/opalUi/graphDetail.test.ts,
  src/opalUi/graphScroll.test.ts, src/opalUi/graphSpine.test.ts,
  src/opalUi/liveJourneyProof.test.ts, src/opalUi/pasteW4DeviceFixes.test.ts,
  src/opalUi/waveBChatsExact.test.ts, src/opalUi/waveBGraphsExact.test.ts,
  src/opalUi/waveBHomeExact.test.ts, src/theme/technicolorProduction.test.ts
```

**Typecheck - exactly 9, unchanged:**
```
npx tsc -p tsconfig.json --noEmit -> 9 errors, all pre-existing, none in this
wave's files: OpalApp.tsx x3 ("opal" not assignable to SetStateAction<Tab>),
productClient.ts x5 (duplicate plan_type/online), YouSettingsDestination.tsx x1
(RelationshipContact.handle). Verified before AND after this wave's changes.
```

**API floor:** not re-run by this wave (no API-suite surface changed beyond the additive `next_plan` key on call responses, which is covered by the backend projection test). Declared, not implied.

## 7. Frame list (for the integrator's central pack captures)

Capture against the real lifecycle only - two real sessions (the harness provisions two; Chromium flags `--use-fake-device-for-media-stream` + `--use-fake-ui-for-media-stream`), driven through the app's real call-state path. The call field is the spectral dark field in BOTH modes; light-mode frames prove the surrounding chrome, the stage stays dark by design. All frames 390x844.

How to drive the shared setup: session A and session B signed in as two users who share a conversation AND a shared upcoming plan (seeded/created in that conversation, so the plan-in-context exists). A opens the conversation and taps Call (audio). B answers. Both surfaces are now connected. Graphing states are driven from either surface's assist control (first enable writes the account default - use accounts whose standing preference is undecided for the off/waiting frames, or drive in the order below on fresh accounts).

1. **connected-audio-graphing-on** (dark + light) - connected audio call, both sides allowed (A: Enable Assist; B: Enable Assist). MUST SHOW: orbit stage still, quiet timer, participant rows (You / peer, On call), plan-in-context line (About + plan title + when + state word, state edge), graphing light "Graphing on" + capture-truth line, "Pause graphing" control, and the ORBIT TRACE in its graphing form (fire segment traveling the surface border - capture two frames ~2s apart; the segment's position must differ, proving travel; all other pixels identical).
2. **connected-audio-graphing-paused** (dark + light) - from state 1, the viewer taps "Pause graphing". MUST SHOW: hollow amber ring, "Graphing paused", "Resume graphing", capture-truth line ("not listening while graphing is paused"), participant rows unchanged, plan line unchanged, and the trace in its LIVE form (cyan) - NOT fire: paused must not claim graphing. (Peer frame, optional third capture: "Paused by {peer}" + held note on the other surface.)
3. **connected-audio-graphing-off** (dark + light) - fresh accounts / standing preference declined on both sides, connected call. MUST SHOW: dim light "Graphing off" + "Opal is not listening to, transcribing, or recording this call.", "Enable Assist" control, trace in LIVE (cyan) form only.
4. **connected-video-kind** (dark + light) - a call opened as video kind (calls list / thread video entry), connected. MUST SHOW: the same orbit stage (no feed, no tiles, no video toggle), the video-truth line ("Video is not on for this call - Opal calls are audio only..."), participant rows, plan line if a plan exists, trace per graphing state.
5. **plan-in-context-visible** (dark + light) - state 1 reframed tight on the mid-surface: the plan line readable at full size (title, when_label, where_label, state word, state-colored left edge). Companion negative frame: the same call between two users with NO shared upcoming plan - the plan line is entirely absent (no placeholder, no empty box).
6. **orbit-trace-reduced-motion** (dark, one frame + the state-1 frame pair) - emulate `prefers-reduced-motion: reduce`, connected + graphing on. MUST SHOW: no traveling segment; a steady fire-gradient ruled border around the surface; graphing light and words unchanged. (Pair with frame 1's dark capture to prove the meaning survives statically.)

What NOT to capture as proof: any fixture stage (the Figma branches), any state reached by editing the DOM, and any frame claiming a transcript, captions, peer speaking, or peer mute - none of those exist.
