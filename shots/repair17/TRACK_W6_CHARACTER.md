# Repair #17 — Track W6: Living Center Character

Branch: `muse/repair-17-w6` (base: R16 tip `2c1bdcd2`). Web surface only
(`apps/opal_web`); not pushed.

Founder requirement: the Opal Center character (the Opal creature) must be a
DYNAMIC, animated presence whose state reflects what Opal is actually doing:
**idle / listening / thinking / responding** — driven by real app state only.

---

## 1. Current state found (before this track)

### Where the character appears

| Surface | Component | Character form | State before R17 |
|---|---|---|---|
| Opal Center chat header (the walked "top of the Opal chat" avatar) | `OpalCenterChat.tsx` → `OpalLivingCharacter` (`opal-center-chat-presence`, 64px) | Canon `opal-character.png` in a circular frame with conic border, headphones overlay, lightbulb motif | State machine existed (W6A1) and CSS motion existed, but see gaps below |
| Opal Center rest / conversation / accepted / week / shared header | `OpalCenterLifeGraph.tsx` → `OpalLivingCharacter` (`opal-center-presence`, 56px) | Same living component | Same gaps |
| PlanComposer header (opened from OpalApp) | `PlanComposer.tsx` → `OpalPresenceOrb` mode hardcoded `"idle"` | Static character bubble + CSS float (`hs-orb-*`) | Honest idle: PlanComposer runs no request and no voice capture, so no non-idle state exists to show. Left as-is (documented, not faked) |
| Onboarding: Meet Opal conversation | `MeetOpalConversation.tsx` → `OpalPresenceOrb` (mode state: typing → idle) | Static bubble + glow animations | First-run surface, not a walked Center surface. Out of scope; modes there are scripted-conversation beats, not live app signals |
| Onboarding: Trust contract card | `TrustContractCard.tsx` → `OpalPresenceOrb mode="ready"` | Static bubble | First-run only. Out of scope |
| First-run splash / auth / OTP / permissions | `FirstRunSplashPage.tsx`, `FirstRunExperience.tsx`, `PermissionBootstrapPage.tsx` | Plain `<img>` of `opal-character.png`; splash has one CSS breathe (`fr-splash-character-breathe`) | Identity chrome, not a presence surface. Out of scope |
| Chat message avatars (per Opal reply) | `OpalCenterChat.tsx` `MeridianGlobeMark` | SVG globe glyph — NOT the creature | Not a character surface; no change |
| Bottom dock center tab | `OpalApp.tsx` | `opal-center-mark.png` (O-swirl mark) | Brand law (`brand.ts`): the center mark is explicitly "Not the living character button." No change |

### What already existed (W6A1)

- `opalUi/livingCharacterState.ts` — a 9-state machine
  (idle / notice / prepare / listening / processing / thinking /
  response_ready / speaking / back_to_idle) with an honesty comment law:
  listening only while mic captures, thinking only while a request is in
  flight, speaking only while audio plays.
- `opalUi/OpalLivingCharacter.tsx` — renders the canon character with
  state-driven CSS (`opal-living-*` in `styles.css`): idle scale breathing,
  listening border pulse driven by real mic amplitude (`useMicLevel`),
  thinking border breathe + lightbulb, response bounce, speaking bob.
- Wiring: chat header received `requestInFlight={sending}` and
  `audioPlaying={audioPlaying}`; Center header received
  `requestInFlight={resolving}` and a `speakQueue`.

### Gaps found (the actual founder-visible problem)

1. **The character read as static.** The idle treatment was a 1.5% scale
   change over 4.2s — effectively imperceptible — and "thinking" changed
   only the border (the art itself was a fixed transform). On the walked
   surfaces the creature looked like a still image in almost every state.
2. **Composer mic was invisible to the character (chat).** `OpalCenterChat`
   has its own real `listening` state for the composer mic button
   (`onMicTap` → `listenOnce`). It was never passed to the header
   character, so during composer voice input the character stayed idle.
3. **Rest-surface mic was invisible too.** `OpalCenterLifeGraph`'s
   `onLifeGraphMic` capture state (`listening`) was never passed to its
   header character.
4. **Provider work after the first reply was invisible.**
   When an Opal reply carries `metadata.action_state` queued/running (the
   thread itself shows "Checking places…"), the character dropped back to
   idle even though Opal was still working.
5. **Stuck-state bugs (dishonest states).** The reducer ignored
   `speech_end` outside speaking/response_ready, so three real paths
   pinned the character in a state after the activity had ended:
   - tap-to-stop while listening: `stopListening()` ran but the character
     stayed "listening" forever (and the mic-level hook kept a stream open);
   - an STT session that ended with no speech dispatched `speech_end` from
     listening — a no-op, stuck on "listening";
   - the processing watchdog dispatched `speech_end` from processing —
     a no-op, stuck on "processing".
   Also, when a request ended while the machine sat in `processing`
   (voice path), the component never dispatched `request_end`, so the
   reply-arrival beat never fired.
6. **No reduced-motion coverage.** `styles.css` has many
   `prefers-reduced-motion` blocks, and the onboarding orb (`hs-orb-*`) has
   one — but none covered `.opal-living-*`, so the living character
   animated regardless of the OS preference.
7. **No founder-quartet surface.** Nothing exposed the four founder states
   (idle/listening/thinking/responding) as a testable, inspectable
   derivation; the internal 9-state machine leaked as the only vocabulary,
   and the status line never surfaced the processing/response-ready beats.

### Native mobile note

`apps/opal_mobile` has **no native center-character surface**. The product
is hosted by `src/shell/ProductWebSurface.tsx` (a `react-native-webview`
WebView rendering `opal_web`); the founder's phone walk therefore walks
this web implementation. The mobile app carries no character asset beyond
`assets/icon.png`, and App.tsx/shell contain no character rendering. No
mobile change was needed or made.

## 2. What this track changed

### New: founder presence quartet (`opalUi/opalPresence.ts`)

- `OpalPresenceState` = `idle | listening | thinking | responding`.
- `deriveOpalPresence(signals)` — pure signal → presence derivation.
  Priority: listening (user speaking now) > thinking (request in flight) >
  responding (reply arriving / audio playing) > idle. No signals ⇒ idle.
- `presenceStateForLivingState(state)` — the single mapping from the
  internal machine to the quartet:
  - listening ⇐ `listening` only. The tap beats `notice`/`prepare` map to
    **idle**: the mic is not capturing yet, so they must not claim listening.
  - thinking ⇐ `processing`, `thinking` (both entered only via real
    utterance-capture / request-start events).
  - responding ⇐ `response_ready` (entered only via `request_end` — a real
    reply arrived), `speaking` (entered only via `speech_start` — audio is
    actually playing).
  - idle ⇐ `idle`, `notice`, `prepare`, `back_to_idle`.
- `OPAL_PRESENCE_COPY` — calm status copy per quartet state.

### Component (`opalUi/OpalLivingCharacter.tsx`)

- New optional prop **`externalListening`**: a parent surface's mic is
  actually capturing (STT session open). An effect reflects it —
  `mic_open` when capture starts, `mic_closed` when it ends — without ever
  starting capture itself, and never tearing down the component's own
  listen session (guarded by an `internalListenActive` ref).
- The button now renders **`data-presence-state`** (the quartet) alongside
  the existing `data-living-state`, derived via
  `presenceStateForLivingState`.
- Request-end effect now also fires from `processing`, so the
  responding beat (`response_ready`) fires when a voice-path request ends.
- Status line now also surfaces the two previously silent real beats:
  processing → "Understanding.", response_ready → "Got it!" (existing
  `LIVING_STATE_COPY` strings; shown only while those states are active).

### Machine fixes (`opalUi/livingCharacterState.ts`, additive only)

- New event **`mic_closed`**: listening → back_to_idle (capture ended).
- **`speech_end`** now also unwinds listening and processing →
  back_to_idle. This one reducer change repairs all three stuck paths in
  gap 5 (tap-stop, empty STT result, processing watchdog) — the component
  already dispatched `speech_end` in each of them.
- No existing transition was removed or altered; the W6A1 test suite passes
  unchanged.

### Surface wiring (real signals only)

- `OpalCenterChat.tsx` header character now receives:
  - `requestInFlight={sending || providerWorking}` where
    `providerWorking` is derived from actual reply metadata
    (`action_state === "queued" | "running"` — the same signal the
    thread's poll loop chases and the "Checking …" row renders);
  - `externalListening={listening}` — the composer mic's real capture state;
  - `audioPlaying` as before (TTS actually playing).
  Edits are confined to one derived const + the header JSX. The send path
  was not touched.
- `OpalCenterLifeGraph.tsx` header character now receives
  `externalListening={listening}` — the rest-surface mic's real capture
  state from `onLifeGraphMic`. `requestInFlight={resolving}` and
  `speakQueue` were already bound to the real Decision-resolve request
  and real TTS playback.

### Motion (`styles.css`, W6A1 block only; calm, no rotation anywhere)

- Idle is now perceptible but quiet: art breathes to scale 1.03 with a
  2px rise over 5s, and the border breathes on the same 5s cycle.
- Thinking: the art now has a gentle 3s sway (`opal-living-think-sway`)
  in addition to the border breathe and lightbulb, so "thinking" is
  visibly distinct from idle.
- Listening keeps its mic-amplitude-driven border pulse (real level via
  `--opal-living-pulse`); responding keeps the arrival bounce and the
  speaking bob.
- **Reduced motion**: a new `@media (prefers-reduced-motion: reduce)`
  block disables all `.opal-living-*` animation/transition. State remains
  readable without motion through non-motion cues: border opacity,
  headphones overlay, lightbulb, and the status line.

### State → signal source table (the honesty contract)

| Presence | Chat surface signal | Center (rest) signal |
|---|---|---|
| idle | No send in flight, no provider work, no mic capture, no TTS | No resolve in flight, no mic capture, no TTS |
| listening | Composer `listening` state (a `listenOnce` STT session is open) OR the character's own `listenOnce` session | Rest-surface `listening` state (`onLifeGraphMic` session open) OR the character's own session |
| thinking | `sending` (POST /opal in flight) OR `providerWorking` (reply `action_state` queued/running) | `resolving` (resolveDecision request in flight) |
| responding | `response_ready` after a real reply lands; `speaking` while TTS `audioPlaying` | `response_ready` after a resolve lands; `speaking` while the speak queue's TTS actually plays |

There is **no text-reply streaming** in the app today (`postOpalMessage`
returns complete messages; no realtime typing/response signal exists for
the Opal conversation), so "responding" is bound to the two real
reply-arrival signals above and never to a timer or a fake stream.

## 3. Asset inventory + remaining asset work

### Inventory (searched the whole repo)

- Canon stills in `shots/brand/`: `opal-character.png` (1 pose,
  friendly/welcoming), `opal-center-mark.png`, `opal-logo.png`,
  `opal-wordmark.png`, `opal-app-icon.png`. The runtime copy
  `apps/opal_web/public/brand/opal-character.png` is byte-identical to
  the canon file (md5 `2cb18693b5abb7fb3d5f06729c7a07e3`).
- **No animation rig exists anywhere**: no Lottie (`.lottie`/animation
  JSON), no Rive (`.riv`), no GIF, no sprite sheet, no per-state poses,
  no character video. The only `.webm` files in the repo are evidence
  recordings (`docs/evidence/.../CINEMATIC_DEMO.webm`,
  `shots/oc6/voice_flow_390.webm`), not character assets.
- The `motion` package is a declared `opal_web` dependency but is not
  imported anywhere in `src/` today.
- All motion in this track is therefore CSS/component treatment of the
  single canon pose (transforms, border, overlays) — consistent with the
  repo's animation decision (`docs/evidence/social-flow-13/
  ANIMATION_DECISION.md`: web = CSS transitions + prefers-reduced-motion)
  and with brand law (the character is never redrawn).

### Remaining asset work for a richer rig (NOT done here — needs art)

1. **Per-state poses of the canon creature** (same character, never a
   redraw by engineering): listening (head tilt / ears forward),
   thinking (gaze up), responding (speaking mouth shapes or a gentle
   talk cycle). Source art at the fidelity of `shots/brand/
   opal-character.png`, transparent background, delivered into
   `shots/brand/` first, then copied to `apps/opal_web/public/brand/`.
2. **A real animation format decision** if frame-level motion is wanted:
   Lottie or a sprite sheet are the web-friendly options; either slots
   into `OpalLivingCharacter` behind the existing state machine — the
   states and signal bindings in §2 do not change.
3. **Blink / micro-life frames** for idle (the current idle is a CSS
   breath on one pose; a blink cycle needs art).
4. Until that art exists, the headphones overlay and lightbulb remain
   SVG motifs drawn by the component (existing W6A1 approach), not canon
   art.

## 4. Tests

New file `apps/opal_web/src/opalUi/opalPresence.test.tsx` — **20 tests,
all passing**:

- Quartet derivation (pure): exact state set; no signal ⇒ idle (never
  thinking/responding); each real signal maps to its state; priority
  listening > thinking > responding; all 9 living states mapped, with
  notice/prepare pinned to idle (mic not yet open).
- Machine honesty (reducer): breadth-first fuzz over tap/timer/stop
  events only — reachable states are exactly {idle, notice, prepare}
  and all map to presence idle (timers can never manufacture listening/
  thinking/responding); tap-stop unwinds listening; `mic_closed`
  unwinds listening; processing with no request unwinds; `request_end`
  from processing lands on responding.
- Component (rendered, voice module mocked): mounts idle with no
  signals; `requestInFlight` drives thinking → responding → idle;
  `externalListening` drives listening and unwinds; `audioPlaying`
  drives responding only while playing; a tap alone is NOT listening —
  listening begins only when mic permission + STT actually open.
- Wiring contracts (source): chat header binds `sending ||
  providerWorking`, `externalListening={listening}`, `audioPlaying`;
  Center header binds `resolving`, `externalListening={listening}`,
  `speakQueue`; component exposes `data-presence-state`; reduced-motion
  block covers `.opal-living-*`; per-state motion treatments exist and
  contain no rotation.

Existing suites in touched areas pass unchanged:
`livingCharacterState.test.ts` (6), `opalCenterLifeGraph.test.ts` (14),
`OpalCenterChat.test.tsx` (14/15 — see below).

### Full-suite comparison vs R16 baseline

Verified by chunked runs over identical file sets on this tree and on a
pristine `2c1bdcd2` worktree (single-process full runs in this sandbox
oscillate 24–26 failures on BOTH trees — timing-sensitive tests under
parallel load; the chunked comparison is deterministic and complete:
chunk sums are exactly 1,163 baseline tests and 1,183 on this tree =
1,163 + 20 new). Every chunk matched name-for-name: root/brand/api/
theme/realtime 6 = 6, onboarding 2 = 2, opalUi a–d 1 = 1, opalUi e–g +
intelligence 7 = 7, opalUi h–o 2 = 2 (this chunk carries the 20 new
tests: 170 vs 150, all passing), opalUi p–s 2 = 2, opalUi t–z 5 = 5,
people/experience 8 passed on both.

Total: **25 failures, name-identical to the baseline set** recorded in
`shots/repair16/VERIFY.json`. The one failure inside a touched file,
`OpalCenterChat > shows send error and keeps typed text on failure`,
fails identically (same assertion, standalone and chunked) on the
pristine baseline — pre-existing; it concerns draft retention on send
failure, not the character.

Typecheck (`tsc --noEmit`): 7 pre-existing errors on both trees, error
sets identical, zero in touched files.

## 5. Files changed

- `apps/opal_web/src/opalUi/opalPresence.ts` (new) — founder quartet +
  pure derivations.
- `apps/opal_web/src/opalUi/opalPresence.test.tsx` (new) — 20 tests.
- `apps/opal_web/src/opalUi/OpalLivingCharacter.tsx` — `externalListening`
  prop, `data-presence-state`, processing/response status, request-end
  from processing.
- `apps/opal_web/src/opalUi/livingCharacterState.ts` — `mic_closed`
  event; `speech_end` unwinds listening/processing (stuck-state fixes).
- `apps/opal_web/src/opalUi/OpalCenterChat.tsx` — header character bound
  to `sending || providerWorking` + composer `listening` (one derived
  const + header JSX; send path untouched).
- `apps/opal_web/src/opalUi/OpalCenterLifeGraph.tsx` — one prop:
  `externalListening={listening}`.
- `apps/opal_web/src/styles.css` — W6A1 block only: perceptible calm
  idle, thinking sway, reduced-motion block.
- `shots/repair17/TRACK_W6_CHARACTER.md` — this document.

Not done / not claimed: no phone walk (founder-only), no push, no merge.
FOUNDER_ACCEPTED=NO · FREEZE=HOLD · PASS2=NO (unchanged).
