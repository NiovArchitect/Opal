# Paste J Phase 0 — Opal Center Interactive Inventory

**Audited:** 2026-10-08  
**Scope:** Default Solo Center shell (`OpalCenterLifeGraph` + `OpalCenterChat` chat phase).  
**Not in scope as primary surface:** Global `OpalAmbient` (`?opal_global_opal=1`, Figma 618:902 / rejected 1086 neural). First-run `TrustContractCard` (Meet Opal only — zero references under `opalUi/`).  
**Entry:** Dock Opal (`member-tab-opal`) → `opalAmbientOpen` → Solo mounts `OpalCenterLifeGraph`.  
**Honesty law:** WORKS requires code + test/live evidence. No “probably.”

## Status legend

| Class | Meaning |
|-------|---------|
| **WORKS** | Interactive path does what it claims; vitest and/or shots evidence |
| **BROKEN** | Intended product behavior fails or is incomplete relative to the control’s promise |
| **FAKE** | UI implies capability; data/path is fixture, local-only theater, or overclaim |
| **UNTESTED** | Real wiring present; no dedicated Center E2E/pressure proof found |

---

## Backend APIs Center hits

| Client | Endpoint / bridge | Used by |
|--------|-------------------|---------|
| `getOpalConversation` | `GET /api/v1/product/opal/conversation` | `OpalCenterChat` hydrate |
| `postOpalMessage` | `POST /api/v1/product/opal/conversation/messages` | Chat send / chips / retry |
| `resolveDecision` | `POST /api/v1/product/decisions/resolve` | Life Graph composer + quick chips → conversation phase |
| STT/TTS | **No** `voice/speak` HTTP. Browser Web Speech / `speechSynthesis`; native `startNativeSpeechRecognition` / `speakNativeText` via `nativeHostBridge` | Chat mic + speaker toggle only |
| Media | Local `acquireMedia` (native bridge or HTML file input). **No** product upload / conversation attachment API | Life Graph `+` attach |
| Intelligence HTTP | Center chat does **not** call `intelligenceClient` directly. OC-2/3/4 run server-side inside create-message. Reminder/mediation cards elsewhere may `postOpalMessage` | Indirect via message POST |

Life Graph rest/week/family **do not** hit calendar/intelligence APIs for the painted day strip.

---

## A. Dock entry (opens Center)

### A1. Dock Opal glyph
- **Path:** `OpalApp.tsx` (`member-tab-opal`)
- **Should:** Open/close Solo Center
- **Today:** Toggles `opalAmbientOpen`; Solo → `OpalCenterLifeGraph`; Global only if `?opal_global_opal=1`
- **Class:** **WORKS**
- **Verify:** Open member shell → tap center Opal → `data-testid="opal-center-life-graph"`; tap again closes

---

## B. Life Graph shell — rest (`OpalCenterLifeGraph.tsx`)

### B1. Refresh (↻)
- **Path:** `opal-center-refresh`
- **Should:** Reset day view
- **Today:** `setPhase("rest")`, restores `REST_NODES`, clears query
- **Class:** **WORKS** (local UI reset only)
- **Verify:** Leave rest → ↻ → rest + fixture strip restored

### B2. Life graph strip
- **Path:** `LifeGraphStrip` / `opal-life-graph-strip`
- **Should:** Live day openings/events
- **Today:** Hardcoded `REST_NODES` (Now Open / 3:30 Appointment / 7:30 Dinner). Not clickable
- **Class:** **FAKE** (display fixture; not interactive)

### B3. Rest signal copy (“2h 10m open…”)
- **Should:** Real free-window intelligence
- **Today:** Static copy in JSX
- **Class:** **FAKE**

### B4. Nudge body (tap)
- **Path:** `opal-center-nudge-*` body `role="button"`
- **Should:** Act on real attention/celebration nudges
- **Today:** Hardcoded `CENTER_NUDGES` (Maya birthday / Friday open). Tap → `askAboutDay(n.body)` → DI resolve
- **Class:** **FAKE** (content) + DI path as B11
- **Verify:** Content never fetched from AttentionCenter

### B5. Nudge dismiss (✕)
- **Path:** `opal-center-nudge-dismiss-*`
- **Should:** Dismiss nudge durably
- **Today:** `sessionStorage` key `opal.center.nudges.dismissed.v1` only
- **Class:** **WORKS** for session hide; **FAKE** vs product attention dismiss
- **Verify:** Dismiss → gone until new session

### B6. Talk to Opal
- **Path:** `opal-center-talk-to-opal`
- **Should:** Enter conversational shell
- **Today:** `setPhase("chat")` → mounts `OpalCenterChat`
- **Class:** **WORKS**
- **Verify:** `shots/poc1/rest_talk_390.png`; vitest `opalCenterLifeGraph.test.ts`

### B7–B9. Quick chips: Curate my time / What’s next? / Move something
- **Should:** Meaningful curation intents
- **Today:** Each calls `askAboutDay("<label>")` → same `nearby_now` DI resolve with free_text
- **Class:** **UNTESTED** as distinct intents (same DI pipe as composer; no Center chip E2E). Labels do not map to dedicated curation APIs

### B10. Composer query + Enter / Send (↑)
- **Path:** `opal-center-query`, `opal-center-send`
- **Should:** Ask Opal about the day / follow-ups
- **Today:** `askAboutDay()` → `POST /api/v1/product/decisions/resolve` (`intent: "nearby_now"`, `center_v2: true`). Does **not** write `opal_messages`
- **Class:** **WORKS** for DI resolve when product API up (structural: idempotency + stale-gen in `opalCenterLifeGraph.test.ts`). **Not** the OC chat pipeline
- **Verify:** Authenticated Center → type ask → send → conversation phase with answer or honest resolve note

### B11a. Go with this
- **Path:** `opal-center-go-with-this`
- **Should:** Commit place into real graph / plan
- **Today:** Updates local `dayNodes`, `onSeedGraph(title)` → OpalApp note + Graphs tab. No SharedPlan/reservation create from this control
- **Class:** **BROKEN** vs durable graph/plan commitment (local theater + navigation only)
- **Verify:** Go with this → Graphs + gate note; no plan row from Center alone

### B11b. Adjust
- **Should:** Reject answer / return to rest
- **Today:** Bumps `requestGen`, `setPhase("rest")`, clears decision
- **Class:** **WORKS**
- **Verify:** Adjust → rest phase

### B12. Timing / Budget / Vibe / More ideas chips
- **Should:** Recompose DI on one dimension
- **Today:** Re-call `askAboutDay` with adjusted free_text string
- **Class:** **UNTESTED** (no dedicated recompose proof; free_text hope)

### B13. Context link
- **Path:** conversation phase context pill
- **Should:** Open permitted context settings
- **Today:** `onOpenSettings` → closes Center, `setTab("you")`
- **Class:** **WORKS**
- **Verify:** Conversation phase → Context → You hub

---

## C. Life Graph — accepted / week / family / lenses

### C1. Material time (“Leave around 3:52 PM”)
- **Path:** `opal-center-material-time`
- **Should:** Location/traffic-aware leave time
- **Today:** Hardcoded string; copy admits “Not fabricated traffic” while painting a fixed clock
- **Class:** **FAKE**

### C2. Open Graph / Change it
- **Should:** Open seeded graph / return to answer
- **Today:** `onOpenGraphs` / `setPhase("conversation")`
- **Class:** **WORKS** (navigation)

### C3. Week day tabs (Thu–Sun)
- **Should:** Show that day’s live shape
- **Today:** `setWeekDay`; list always maps `WEEK_FRIDAY` fixture. Non-Fri copy says openings “when available”
- **Class:** **FAKE** (tabs switch label only)

### C4. Yes, curate it (week)
- **Today:** `askAboutDay("Shape Friday open window"|…)` → DI
- **Class:** **UNTESTED**

### C5. Family Saturday list + Back to today
- **Today:** `FAMILY_SAT` fixture; Back → `setPhase("rest")`
- **Class:** **FAKE** (content); Back **WORKS**

### C6. Lenses: Today / Week / Shared
- **Path:** `opal-center-v2-lens`
- **Should:** Switch life-graph modes
- **Today:** Phase switches; Today active for rest|conversation|accepted
- **Class:** **WORKS**
- **Verify:** Tap Week/Shared/Today → matching `data-testid` sections

---

## D. Life Graph attach + mic (non-chat composer)

### D1. Plus / Attach (+)
- **Path:** `opal-center-attach`
- **Should:** Add photo/file context for Opal
- **Today:** Toggles attach menu
- **Class:** **WORKS** (menu toggle)
- **Verify:** Tap + → `opal-center-attach-menu`

### D2–D4. Photo library / Camera / Document
- **Path:** `opal-center-attach-library|camera|file`
- **Should:** Acquire media into conversation for Opal to reason
- **Today:** `acquireMedia({ initiating_surface: "center" })` → local preview state. Comment: intelligence ingestion = tranche #4. Note claims *“Opal has the file in this conversation”* but nothing POSTs to `/opal/conversation` or upload API
- **Class:** **FAKE** for product claim (local preview only). Acquisition plumbing itself is real (`mediaAcquisition.ts`, `nativeHostMediaBridge.test.ts`)
- **Verify:** Attach → preview; send query → DI body has no attachment payload

### D5. Attach remove / Cancel
- **Class:** **WORKS** (clears local state / closes menu)

### D6. Life Graph mic (when input empty)
- **Path:** `opal-center-voice`
- **Should:** Speech → query (same as chat STT)
- **Today:** Toggles `listening` boolean; sets note *“Listening — speech recognition is a system dependency when unavailable.”* **Never** calls `listenOnce` / Web Speech
- **Class:** **FAKE**

---

## E. Opal Center Chat (`OpalCenterChat.tsx` + `opalCenterVoice.ts`)

### E1. Back
- **Path:** `opal-center-chat-back`
- **Should:** Return to Life Graph rest
- **Today:** `onBack` → `setPhase("rest")`
- **Class:** **WORKS**
- **Verify:** Chat → ‹ → rest

### E2. Voice replies toggle (speaker)
- **Path:** `opal-center-chat-voice-toggle`
- **Should:** TTS on/off for new Opal replies; persist per user
- **Today:** `localStorage` `opal_center_voice_mode:{userId}`; `speakText` via Web Speech / native bridge (not HTTP)
- **Class:** **WORKS** (browser evidence)
- **Verify:** `shots/oc6/` (tts_on_speaks, voice_mode_persisted); vitest voice toggle

### E3. Load / Retry
- **Path:** hydrate + `opal-center-chat-retry-load`
- **Should:** GET conversation; retry on failure
- **Today:** `getOpalConversation`; error UI + Retry
- **Class:** **WORKS**
- **Verify:** `shots/poc1/load_error_390.png`; OC-1 VERIFY

### E4. Empty suggestion chips
- **Path:** `opal-center-chat-chip-*` — Plan something / Remember something / What’s coming up?
- **Should:** Seed real intents into OC pipeline
- **Today:** `sendBody(chip)` → `postOpalMessage` → server OC-2/3/4
- **Class:** **WORKS**
- **Verify:** Empty state chips → messages; `shots/poc1/empty_390.png`; BE OC-3/4 evidence `shots/poc3`, `shots/poc4`

### E5. Message long-press / context menu → timestamp
- **Should:** Show time on long-press only
- **Today:** 450ms pointer timer + contextmenu → `<time>`
- **Class:** **UNTESTED** (implemented; no dedicated shot/test assert found)

### E6. Send failure retry
- **Path:** `opal-center-chat-send-error`
- **Should:** Resend failed user message
- **Today:** `sendBody(body, retryKey)`
- **Class:** **WORKS**
- **Verify:** `shots/poc1/send_error_390.png`; vitest send-error path

### E7. Composer textarea + Send
- **Path:** `opal-center-chat-input`, `opal-center-chat-send`
- **Should:** Send up to 2000 chars; optimistic UI; Opal reply
- **Today:** Enter (no Shift) / submit → `postOpalMessage`; typing indicator while sending; plan metadata → `onPlanCreated` (closes Center → Chats in OpalApp)
- **Class:** **WORKS**
- **Verify:** `shots/poc1` send/reload; `OpalCenterChat.test.tsx`; OC-4 reply generation BE

### E8. Mic (STT)
- **Path:** `opal-center-chat-mic`
- **Should:** Listen → editable transcript in input; interrupt TTS; honest offline/unavailable
- **Today:** `listenOnce()` Web Speech or native; fills draft; disables when offline/unavailable with honest copy
- **Class:** **WORKS** in browser with Web Speech (`shots/oc6` GREEN). Native Expo without speech module: honest pre-tap disabled — not a silent fake
- **Verify:** `shots/oc6/voice_flow_390.webm`; founder walk still required for physical mic

### E9. Plan confirm → Graph surface
- **Should:** Affirmative after plan ask creates/surfaces SharedPlan
- **Today:** Server `planFromOpalMetadata` when metadata present; founder-seed local `planFromLocalConfirm` fallback (incl. offline Yes)
- **Class:** **WORKS** under founder-seed / metadata paths (`OpalCenterChat.planSurface.test.tsx`). Non-seed production peer-less confirm remains env-dependent → treat production multi-peer as **UNTESTED** here

---

## F. Explicitly absent from Center (searched)

| Element | Finding |
|---------|---------|
| `TrustContractCard` | Onboarding `MeetOpalConversation` only — not Center |
| Photo/file upload in **chat** composer | Chat has mic+textarea+send only; attach lives on Life Graph composer |
| `intelligence/*` FE client from Center | Not imported by Center files |
| `voice/speak` product HTTP | Unused; device TTS only |
| In-chat plan/reminder **cards** | Plain text bubbles; plan surfaces via `onPlanCreated` navigation away |

---

## G. 390px / layout overlap notes (past polish)

From `styles.css` + `iphoneLayoutSystem.test.ts`:

- Center v2 composer is **in-flow** (`position: relative !important`) — contracts assert `CENTER_CONTENT_HIDDEN_BY_COMPOSER = 0`, `DOCK_EXCLUSION_DOUBLE_COUNT = 0`, `CENTER_COMPOSER_OVERLAPS_DOCK = 0`.
- Native host clips `.opal-ambient-destination` bottom to `--opal-primary-viewport-inset` so composer clears the dock pill.
- Formal Figma width remains 390; native host must **not** reintroduce `max-width: 390px; margin: 0 auto` letterbox (test asserts absence).
- Historical risk class (fixed in CSS contracts, not re-broken in this audit): absolute composer + dock padding double-count hiding thread bottom; Ambient Solo legacy absolute composer still exists for **non**–`opal-center-v2-composer` paths.
- OC-1 browser shots at 390/430 (`empty`, `with_messages`, `rest_talk`, composer visible) were GREEN at ship — treat as evidence of prior layout pass, not a fresh 2026-10-08 visual re-walk.

**Residual layout risk (honest):** Chat phase replaces entire Life Graph chrome (no lenses/attach). No fresh Playwright matrix run in this Phase 0 pass — classify chat@390 visual as previously evidenced, not re-verified today.

---

## Counts by class

Unit = one distinct interactive control (each chip instance counted). Non-interactive display fixtures that claim live data are listed separately.

| Class | Count |
|-------|------:|
| **WORKS** | 29 |
| **FAKE** (interactive) | 10 |
| **BROKEN** | 1 |
| **UNTESTED** | 10 |
| **Total interactive** | **50** |
| Display-only FAKE claims (strip / signal / material time / family list) | 4 |

| Class | Members |
|-------|---------|
| WORKS (29) | A1; B1; B5×2; B6; B10 query+send; B11b Adjust; B13; C2×2; C5 Back; C6×3; D1; D5 remove+cancel; E1; E2; E3; E4×3; E6; E7 input+send; E8; E9 seed/metadata |
| FAKE interactive (10) | B4×2 nudge bodies; C3×4 week tabs; D2–D4 attach “in conversation”; D6 Life Graph mic |
| BROKEN (1) | B11a Go with this |
| UNTESTED (10) | B7–B9×3; B12×4; C4; E5; E9 non-seed production |

Caveats inside WORKS: B5 sessionStorage-only; B10 hits DI not OC chat; E8 Expo needs speech module for native; E9 founder-seed/metadata proven.

---

## Component map

| Component | Absolute path |
|-----------|---------------|
| Life Graph / Solo Center | `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/opalUi/OpalCenterLifeGraph.tsx` |
| Chat shell | `.../apps/opal_web/src/opalUi/OpalCenterChat.tsx` |
| Voice adapters | `.../apps/opal_web/src/opalUi/opalCenterVoice.ts` |
| Product API | `.../apps/opal_web/src/api/productClient.ts` (`getOpalConversation`, `postOpalMessage`, `resolveDecision`) |
| Media acquire | `.../apps/opal_web/src/mediaAcquisition.ts` |
| Mount | `.../apps/opal_web/src/OpalApp.tsx` (~10053–10095) |

**Evidence roots:** `shots/poc1/`, `shots/poc4/`, `shots/oc6/`, `shots/p0_intent/`, `shots/p0_memory/`.
