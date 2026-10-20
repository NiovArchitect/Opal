# Repair #19 — Founder Polish Wave, Cluster B: Thread (P2 + P7) + Amendment A2

Worktree `wt-polish-thread`, branch `muse/r19-polish-thread`, base `95319bd7` (Repair #19 final tip).
FOUNDER_ACCEPTED=NO. No merge, no push, no ledger edits, no rendered captures by this cluster (frames specified below for the integrator).

Commits:

- `7aa89289` — R19 polish thread cluster: P2 header Opal doorway + P7 composer truth
- `4456abed` — R19 polish A2: call-log pill containment - state glow spent inset

## P2 — Thread Opal doorway (top-right)

### What the served thread showed before

The doorway machinery was real and complete (W14: `opalDoorwayContext` / `personOpalContext` in `opalChatScope.ts`; `CenterHost.openDoorway` reuses the session scoped to person+plan or creates a scoped session; the context chip navigates back). But in `ThreadShell` both doorways lived **inside the Next Together strip in the scroll column** — the plan doorway as a text button attached to the plan-awareness element, the person index doorway as a quiet text button in the same zone (or a slim zone under the header when no plan fact exists). The thread **header had no Opal control at all**: back, avatar, titles, and (when wired) call buttons only. A user in a thread had to already know the strip text was a door.

### The build

- `apps/opal_web/src/opalUi/c1/C1Surfaces.tsx` (ThreadShell): a small orb-mark button at the header's top-right — `data-testid="thread-opal-doorway"`, class `c1-thread-opal-btn` with a `c1-thread-opal-orb` mark. It carries the richest context the host derived from that thread: `opalDoorway ?? personContext` — the plan-scoped context when the thread's own DIR-1 fact + DIR-4 reveals make the plan discussable, else the person context (Scope Addition A: the person is always discussable). Tap routes through the existing `onTalkToOpal` → `OpalOpenRequest` → `CenterHost.openDoorway` path; nothing new was derived and no second path exists. Presence is stateful per the doorway rules: the button renders **only** when the host derived a context AND an Opal route is wired — a group thread (host derives no person) and unwired review surfaces (C1Review) render nothing. The strip doorways are unchanged (the existing pin "renders in the strip when earned" still passes verbatim).
- `apps/opal_web/src/opalUi/c1/c1.css`: `.c1-thread-opal-btn` (44px hit area, bare chrome) + `.c1-thread-opal-orb` (26px, `background: var(--opal-iris-gradient)` — the same token the Opal dot / presence / read-aloud orb carry; no state hue, it is a door, not a plan element).
- Host: no change needed. `ChatsHost` already passes `opalDoorway`, `personContext`, and `onTalkToOpal`; `C2Shell` already routes the request to CenterHost.

### Navigation, both directions

Thread → tap header orb → Opal conversation opens scoped to that person/chat (existing session reused when person+plan match, else a new scoped session is created by the existing machinery) with the context chip naming the scope. Chip → "Back to your chat with <person>" returns the same context, and the shell reopens the same thread (its `conversationId`). Pinned by the new journey test (below).

## P7 — Composer truth table

Audit of the thread composer (`ThreadShell`'s `c1-composer-bar` / `c1-composer`), its host wiring, the product client, and the backend message path.

| Capability | Verdict | Evidence |
|---|---|---|
| Text send | **REAL end to end** | Composer input + iris send arrow (appears when the draft is non-empty; Enter also sends) in `C1Surfaces.tsx` ThreadShell. Host: `ChatsHost.send` in `c2/shell/C1ShellHosts.tsx` → `sendMessage` (`api/productClient.ts`) → `POST /api/v1/product/conversations/:id/messages` with `{body, client_message_id}` (idempotency key preserved across retries) → backend `ConversationController.create_message` → `Messages.accept_message`, channel broadcast + inbox fanout; the thread reloads from the contract. When a host wires no `onSend`, the input renders read-only — no fake send. |
| Audio message (record + send) | **REAL end to end; was mis-presented, now presented in the composer** | `VoiceNoteControl` (`c2/shell/adopt3.tsx`, ST-H): MediaRecorder record → visibly active recording state → review player → send via `sendVoiceNote` → `POST /api/v1/product/conversations/:id/voice_notes`; renders **nothing** where MediaRecorder/getUserMedia is unavailable (honest absence, never a dead button). Voice notes render as messages in `MessageFlow` (player + transcript caption + sender-only transcript correction via `correctVoiceNoteTranscript`). **Defect found:** the control rendered as an unstyled sibling block *below* the thread surface (after `ThreadShell` inside `.c2s-c1-thread-wrap`, above the check-in bar) — page furniture, not a composer affordance; this is why the send path was undiscoverable. **Fix below.** |
| Photo attach | **ABSENT — not wired, no button painted** | No attach control, file input, or attach sheet exists in the thread composer. Blocker (backend): a message has no media carrier — `OpalCore.Messaging.Message` types are only `text / voice_transcript / voice_note / call_invite`, `create_message` casts only `body / message_type / client_message_id`, and the message contract's only media fields are audio (`audio_url / duration_ms / transcription_*`, decoded from the voice-note hint). The one upload endpoint, `POST /api/v1/product/social-moments/media`, creates social-moment media records that no message can reference, and `MessageFlow`/`ThreadMsg` have no image rendering. Wiring the composer to it would fake an attachment. Missing pieces: a message-media model + conversation-scoped upload route + contract field + thread rendering. |
| File attach | **ABSENT — not wired, no button painted** | Same blocker as photo attach, in full: no file message type, no conversation-scoped file store/serving route, no contract field, no render path. Missing pieces identical in kind: message-media model + upload/serve route + contract + rendering. |

### The P7 fix (presentation of a real affordance only)

- `C1Surfaces.tsx` (ThreadShell): new optional `composerAccessory` prop, rendered inside `.c1-composer-bar` directly above the input pill. The surface renders the node verbatim and invents nothing; a host with no real affordance passes nothing and the bar is exactly the input pill (pinned).
- `c2/shell/C1ShellHosts.tsx` (ChatsHost): `VoiceNoteControl` moved from below-`ThreadShell` sibling into `composerAccessory` — same control, same `sendVoiceNote` path, same `onSent` refresh (thread reload + conversations refresh).
- `c2/shell/c2shell.css`: `.c1-composer-bar .c2s-voice-note` lays the control out as one quiet wrapping row in the bar; its recording line takes no margin of its own.
- Center is untouched, per the amendment's scope ("in the thread, not Center").

## A2 — Call-log pill containment (founder amendment, 2026-10-19 16:42 PDT)

### Measured truth (real Chromium, 390px, production sheets)

Border boxes were **already contained** — a six-configuration × two-CSS-stack sweep (long/short names, all state families, wired/unwired rows, with/without plan, F3 stack and full served stack incl. `c2shell.css`) found zero border-box escapes, and a rendered screenshot pair confirmed the layout. The escape was **painted**: the 12% state glow was an **outset** `box-shadow: 0 0 10px` on the row (`CallLog.css`) and on the plan-awareness pill (the unify wave's shared rule in `theme/unifyChats.css`), so state light hung past the pill's border and outside the row's border box into the inter-row gap — visible in both modes in before/after screenshots (inspected by this cluster; the integrator's close-up frames below are the pack proof). That is the layout contract's strict-containment failure the founder named.

### The fix (`apps/opal_web/src/opalUi/c1/CallLog.css` only)

- The row's state glow is spent **inset** at the identical register: `inset 0 0 10px color-mix(in srgb, var(--call-state) 12%, transparent)` (plus the unchanged neutral `--shadow-card`).
- The pill inside a call row gets the same containment, scoped to call rows only: `[data-design="r18"] .c1-call-row .plan-awareness { box-shadow: inset 0 0 10px color-mix(in srgb, var(--pa-state) 12%, transparent); }` — specificity (0,3,0) over the unify rule's (0,2,0); the pill on other surfaces (chats rows, thread strip) keeps the unify register untouched.
- State-color language unchanged: same hue source (`PLAN_STATE_HEX` via `--call-state` / `--pa-state`), same 52/9/12 mixes, same patterns, same labels. The r19CallLog drift audit (which pins those exact mixes) passes unmodified.

### Adjacent observations (NOT fixed — out of A2's scope, stated for honesty)

- In dark mode the row's whole `box-shadow` list computes to `none`: the token `--shadow-card: none` (dark) inside a multi-shadow list invalidates the list at computed-value time, so the row's glow layer (inset or outset) never paints in dark mode. Pre-existing, true before this change and after; the pill carries the state glow in dark mode. A register-level decision for the ambient owner, not A2.
- The name/metadata column in a call row is narrow when a long state label + call-back button share the first line (a 15-character name ellipsized at 390px in the probe render). This is the F3 wave's designed-ellipsis settlement, not a containment escape; flagged here because it is visible in the same close-ups.

## Tests — exact results

Baseline (this worktree, before changes): full suite **23 failed / 2136 passed, 16 failed files**; typecheck **exactly 9 errors** (OpalApp.tsx ×3 TS2345, productClient.ts ×5 duplicate-identifier set, YouSettingsDestination.tsx ×1 TS2339).

After all changes:

- **Full web suite: 23 failed / 1759 passed (1782 tests), 16 failed files** — the failing set did not grow: identical failed counts, and the 16 failing files are `activation`, `availability/availability`, `designTokens`, `onboarding/firstRun`, `opalUi/authorityRejectedStates`, `opalUi/grammar`, `opalUi/graphCalendaring`, `opalUi/graphDetail`, `opalUi/graphScroll`, `opalUi/graphSpine`, `opalUi/liveJourneyProof`, `opalUi/pasteW4DeviceFixes`, `opalUi/waveBChatsExact`, `opalUi/waveBGraphsExact`, `opalUi/waveBHomeExact`, `theme/technicolorProduction` — none in this cluster's radius. (Run collected 228 files = every test file on disk in this worktree, verified by `find`; the baseline run's summary reported larger totals, 276 files / 2159 tests, which does not match the on-disk count either before or after — the failed counts, the floor metric, are identical and every radius suite passes.)
- **Typecheck: exactly 9 errors**, the identical pre-existing set, line for line.
- Suites this cluster touched or adjoins — all pass, individually and inside the full run:
  - `opalUi/c1/opalChatDoorway.test.tsx` — 46 tests (39 existing + 7 new: header doorway presence/context/absence ×4, the P2 journey pin, composer accessory slot ×2). Existing doorway/scope/strip pins unmodified and green.
  - `opalUi/c1/a2CallLogContainment.test.tsx` — 2 tests (new). Verified to **fail on the pre-fix CSS** naming the exact defect (`pill state glow must be inset: expected 'color(srgb 0 0.898039 1 / 0.12) 0px 0px 10px 0px' to contain 'inset'`), and to pass with the fix.
  - `opalUi/c1/f3CallLogBreadth.test.tsx` — 1 test, pass (unmodified).
  - `opalUi/c1/r19CallLog.test.tsx` — pass, incl. the drift audit (unmodified).
  - `opalUi/c1/r19ChatsThread.test.tsx` (14), `opalUi/c1/c1.test.tsx` (10), `dir1PlanAwareness` (13), `dir4Reveal` (17), `fa01ChatsSearchExercise` (2), `fa02OrbitUnlockBreadth` (1), `ja03ChatsRowBreadth` (1) — pass.
  - `c2/shell/c1ShellWiring.test.tsx` (14), `c2/shell/adopt3.test.tsx` (9, incl. the ST-H voice-note record/review/send pins — the control itself is unchanged), `c2/shell/r19CallsHost.test.tsx` (3) — pass.

New pins added (in `opalChatDoorway.test.tsx`): header doorway renders in the header as its last control with the orb mark and person context when only the person context exists; carries the discussable plan context when derived (strip doorway untouched); absent with no context; absent with a context but no wired Opal route; **journey pin** — person thread → header doorway tap → landed context → CenterChat chip ("About Bea", same conversation id) → back tap returns the identical context for the same thread; composer accessory renders inside the bar above the pill; with no accessory the bar is exactly the input pill.

## Honest absences

- Photo attach and file attach in the thread composer: **absent** (see truth table for the backend blockers). No button, sheet, or placeholder was painted.
- The header doorway on group threads and on unwired review surfaces: **absent by the doorway rules** (no person context derivable / no Opal route) — never a dead button.
- The voice-note control where the browser cannot record (no MediaRecorder / getUserMedia): **absent**, as designed by ST-H.
- Attach sheet frame: not capturable — no such surface exists.

## Frame list for the integrator

Seeded app (`?opal_founder_seed=1`), phone frame 390x844, **both modes** for every frame unless noted.

1. **Thread header doorway (P2)** — Dock → Chats → tap any 1:1 (single-person) chat row. Frame the thread header: a small orb-mark button at the header's top-right, after the name block. (On a group row there is correctly no button — do not frame that as a failure.)
2. **Opal conversation, scoped landing + return (P2)** — Same thread → tap the header orb. Frame the Opal conversation: context chip at its top reading "About <person>" (or "<plan title> - with <person>" when the thread's plan is discussable) and "Back to your chat with <person>". Optionally tap the chip's back action and frame the same thread reopened.
3. **Composer resting state (P7)** — Same person thread, frame the bottom: the composer bar holds a "Record a voice note" row directly above the input pill ("Message <name>"); no send arrow at rest; nothing below the thread surface.
4. **Composer with text entered (P7)** — Tap the pill, type any text: the iris send arrow appears at the pill's right edge. Frame that state.
5. **Voice-note affordance (P7)** — In the composer bar, tap "Record a voice note" (grant mic if prompted): frame "Recording - speak now." + Stop; tap Stop and frame the review state (player + "Send voice note" / "Discard"). Only capturable where the capture browser supports MediaRecorder + mic; where it cannot, the control is honestly absent — note it, do not fake it.
6. **Attach sheet** — NOT CAPTURABLE. Honestly absent (truth table above). No frame.
7. **Call-log containment close-up (A2)** — Dock → Chats → "Calls" segment. Close-up on the first rows (one happening row wearing its pill, one action row): every badge — the state label, the plan-awareness pill, its state text — **and its glow** sits inside the row's rounded border; no state-colored haze in the gap between rows. Both modes, as separate frames.

## Novelty consideration (founder mandate — patterns in this cluster's scope)

### Time display in threads (timestamps, the Next Together strip)

Current grammar (verified in code): the thread carries one time element per zone, all finished contract strings — the strip's plan-awareness text run ("Title - When - Where", from the fact's `when_label` / `where_label`) under the NEXT TOGETHER kicker, and the header sub-line (the shared line, switching to "plan title - when" once scrolled). Messages carry no timestamps: `ThreadMsg` has no time field and `MessageFlow` renders none.

Alternatives considered:

- *Relative labels ("tomorrow", "in 3 days")* — rejected: the surface would re-derive time from instants, breaking the one-projection law (hosts hand finished labels; surfaces never re-derive), and relative text goes stale without a ticking render.
- *Ambient proximity (the strip's glow warming as the plan nears)* — the most Opal-native option; its truthful part already exists, because the state family (forming → ready → happening) IS the backend's temporal phase, rendered in the state register. A continuous proximity intensity would need a time-to-start fact the contract does not carry; inventing the mapping client-side would fabricate a state. Not adopted — blocked on a backend fact, not on imagination.
- *Day-divider lines / per-message timestamps in the flow* — rejected for this wave: the thread's temporal anchor is deliberately the strip (quiet is the bar), and message-level time requires a projection change (`ThreadMsg` + the host adapter), which belongs to a thread-data wave, not a polish wave.
- *Folding the when into the state pill ("Ready · Sat 7:30 PM")* — rejected: one meaning per element (indicator law); the pill is the state badge, time rides the text run beside it.

**Pick: keep the current grammar** — finished `when_label` text in the strip and header sub-line, the ambient state family carrying phase, no message timestamps. Reason: clarity senior (the exact "when" is unambiguous text), quiet (one time element per zone, nothing ticking or repeating per bubble), and it is the only option that respects the finished-projection law today.

### Composer affordances (P7)

Alternatives considered:

- *Mic-in-pill (mic at the pill's right edge when the draft is empty, send arrow when text exists)* — genuinely tempting, and the product already has this exact form in the Center rest composer (`.c1-mic`, "Voice input", where it replaces the send arrow on an empty draft). Rejected for the thread: there the mic means *dictate text to Opal* (STT into the draft); in a person thread the same form would have to mean *record an audio message to a person* — one form, two verbs, in adjacent surfaces. It would also compress a genuinely multi-state flow (record → recording → review-with-player → send/discard) into a 52px pill that cannot hold its own review state — familiarity bought with clarity.
- *A "+" attach sheet unifying photo / file / voice* — rejected outright: photo and file attach are absent (no backend carrier; see the truth table), so the sheet would hold one real action and two dead ones.
- *Long-press send to record* — rejected: undiscoverable, and it overloads the one send affordance.
- *An iris-orb record button (presence language) in the bar* — rejected: after P2, the iris orb in a thread means "talk to Opal"; spending the same mark on "record a voice note" inside the same thread overloads the identity mark.

**Pick: the built form** — the real ST-H control in its own labeled, stateful row inside the composer bar (`composerAccessory`): "Record a voice note" → "Recording - speak now." → review player → "Send voice note" / "Discard". Reason: discoverable at the point of composition, every state announced in words (no legend, no hidden gesture), present only where recording is actually possible, and the bar's resting shape is unchanged when the affordance is honestly absent.

### The P2 doorway form

Alternatives considered: a labeled text button in the header ("Ask Opal") — clearer at first sight, but permanent word-chrome on every thread; strip-only entry (the status quo) — invisible, the founder's actual complaint; a floating action orb over the message flow — rejected under the layout contract (nothing overlays the thread's single flow, L4). **Pick: the built form** — a small orb-mark button in the header's top-right, present only when a discussable context exists. Reason: the orb is Opal's identity mark and the doorway is *to Opal*; its meaning is completed by place plus the scoped landing (the context chip immediately names what the conversation is about), and stateful presence keeps it from ever becoming noisy chrome.
