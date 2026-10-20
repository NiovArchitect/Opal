# Repair #19 — WAVE W12 (ADOPTION, THIRD DISPATCH): IN-CALL SURFACES + GRAPHING LIGHT & PER-CALL PAUSE — report

Branch `muse/r19-incall`, worktree `~/workspace/opal-graph/wt-r19-incall`, base `f2981dbf`. **Not pushed.** FOUNDER_ACCEPTED stays NO — machine-proven only; rendered pack captures are owed by the pack phase (§8 lists exactly what to capture).

Commits (small increments, per the restart-resilience rule — the tree was
never left holding a large uncommitted diff after adoption):

- `0f765fb9` — R19 W12 backend (adopted): call graphing light state + per-call pause (7 files, +501/−2)
- `a0dc677e` — R19 W12 web (adopted): in-call orbit stage + graphing light + pause control (7 files, +450/−20)
- `95422559` — R19 W12 format: mix format on W12-owned files + wrap graphing_action (4 files, +19/−6)

Env: `PATH=~/workspace/elixir/bin:~/workspace/otp/OTP-27.3.4.2/bin:$PATH`, `ELIXIR_ERL_OPTIONS="+fnu"`, `MIX_DEPS_PATH=/tmp/opal_deps`, private `MIX_HOME` at `~/workspace/opal-graph/incall-scratch/mixhome`, Postgres 16 on 127.0.0.1:5433 (cluster `~/workspace/pgdata-r19calls`, `DATABASE_URL` carried from the R19 calls-wave env). Logs: `~/workspace/opal-graph/incall-scratch/logs/`.

---

## 1. The adopted diff — what the two killed workers left, and its completeness state

State on arrival: branch at base `f2981dbf`, **zero commits**, 8 modified + 6 untracked files (14 total). Read in full before touching anything. The diff was a coherent, nearly complete implementation of items 15+16:

**Backend (untracked new + modified):**
- `calls/graphing.ex` (new, 180 lines) — the one graphing derivation + lineage writer + audit-outbox publish + channel broadcast.
- `calls/graphing_event.ex` (new) — append-only lineage schema (`graphing_on|graphing_paused|graphing_resumed|graphing_off`).
- Migration `20261029060001_create_call_graphing_events.exs` (new) — additive table, FK delete-with-call, index on `(call_id, inserted_at)`.
- `calls/assist.ex` (modified) — `set_allowed/4` snapshots the graphing state before the consent write, records the named transition after it; `view/2` carries `graphing:` verbatim.
- `channels/call_channel.ex` (modified) — `handle_in("graphing", %{"allowed" => bool})` delegating to `Assist.set_allowed/4`, replying with the one payload; invalid payloads get `%{reason: "invalid_graphing"}`.
- `controllers/call_controller.ex` (modified) — assist JSON projection gains `"graphing"`.
- `test/opal_core/calls/graphing_test.exs` (new, 7 tests) — state machine, pause-halting proof, lineage, broadcast, channel control, standing-default behaviour.

**Web (modified + untracked new):**
- `opalUi/graphingLight.tsx` (new) — the light component + per-state model + `callCaptureTruth/1` plain sentences; derives nothing.
- `opalUi/graphingLight.test.ts` (new, 7 tests) — tone/label/sentence distinctness, verbatim-render pins, pause wiring pins, broadcast-refresh pins, orbit-stage identity pins, F-16 honesty pins.
- `opalUi/callAssist.tsx` (modified) — renders `GraphingLight` + capture-truth line; single state-correct pause/resume control; peer-pause held state; refresh on the `opal:call-graphing` window event with the 2s poll as backstop.
- `opalUi/CallSurfaces.tsx` (modified) — the orbit stage on the live view; honest pre-connection capture note.
- `opalUi/ActiveCallOverlay.tsx` (modified) — forwards channel `"graphing"` broadcasts as `opal:call-graphing` window events (both join paths: ringing-caller join and media join).
- `api/productClient.ts` (modified) — `CallGraphingState` type + `graphing` field on `CallAssistView`.
- `styles.css` (modified) — spectral call field, orbit rings, quiet timer, frosted assist pane, graphing-light tones.

**Completeness verdict:** the design was whole — no half-finished functions, no TODO stubs, no mismatched contracts (web `CallGraphingState` strings match the Elixir atoms; channel event name, window event name, payload keys all line up across the three files that touch them). What was missing was *verification and hygiene*, supplied this dispatch: (a) both test suites actually run (§7); (b) `mix format` on the W12-owned files (channel/test/migration were unformatted; `assist.ex` + `call_controller.ex` were already unformatted at base and were left in base posture beyond the W12 hunks); (c) the Settings standing-permission contract documented (§6) — its backend truth + API already existed at base and needed no new code; (d) this report. No product code beyond formatting was added by the third dispatch — the adopted design stood up as written.

## 2. What call machinery is truly real (evidence)

Read against `coordination/repair18/connections-verification-report.md` and the code at base + this branch:

- **In-app 1:1 WebRTC calls: TRUE (code-complete lifecycle).** Server call records (`Calls.invite/answer/mark_media_connected/end_call_session`), the `call:<id>` Phoenix channel for SDP/ICE signaling (payloads never persisted), `CallClient` peer connection, TURN credentials via Twilio NTS minting code with honest 503 `turn_disabled` + STUN fallback when unconfigured. Per the verification report: Twilio Voice as a user-facing connection is **ABSENT** (no PSTN number on the account, NTS minting never exercised in evidence, no dial-out anywhere) and this wave claims nothing more — the call surface never fakes a connected call: the live view renders only from real call records + WebRTC state (`deriveCallView`), and with no live call the surface is the hunt-fix B-04 honest gate ("Calls aren't connected here yet…").
- **Live media is audio-only: TRUE and stated.** `CallClient` requests `getUserMedia({audio: true, video: false})`. There is no live video track anywhere in the stack, so the "video-call window" in the live view is the same orbit stage — no fabricated feed is ever painted (the legacy Figma video stage, reachable only off the live path, already carried `data-video-truth="dark_stage"`).
- **Deepgram batch transcription: TRUE** (recorded function evidence, per verification report). **Deepgram live per-call transcription: ABSENT as a proven product capability — F-16 stands.** The grant + device-mic websocket path exists in code (`Assist.grant/3`, gated on `:active`; `callAssist.tsx` `hear()`), but no live call has ever exercised it in evidence, and nothing in this wave simulates it: no canned text, no fake segments, no "listening" state the gate hasn't earned. Graphing states say exactly what is and isn't being captured (§4).
- **The ingestion gate: TRUE.** `Assist.accept_transcript/3` is the only entry that can persist a transcript segment (grep: `store_final`/`insert_segment` are private to `Assist` and reachable only through it), and the graph fold (`VoiceAlignment.record/2`, `Outcomes.record_proposal/3`, commitment/open-question/waiting-on extraction) happens only inside `store_final`, after a segment insert. Refuse at the gate ⇒ nothing downstream can exist. This is the gate the pause is wired into (§5).

## 3. In-call design (item 15) + honest states

**The orbit stage.** On the live view (`CallSurface` with a real `CallView`), the peer — avatar or initial — now stays at the center of two gyroscope rings (the orb's own geometry) for the *whole* call; Opal's orb mark rides the ring as a point of light (Opal is the medium carrying the call, not a logo stamped on a phone screen). Elapsed time recedes from a 40px hero to a quiet 17px tabular line beneath the orbit — a call is with a person, not a countdown. The tilted ring turns slowly (26s) **only** while waiting (`incoming_ringing` / `outgoing_ringing` / `connecting`); connected rings are still, failed dims — motion exists only where it means "waiting" (ambience with a reason), and `prefers-reduced-motion` disables it. The call field is Opal's spectral field at breath level (violet/cyan/amber radial whispers over `#070b14`) and the Assist pane is frosted glass over it (blur + hairline), not a borrowed phone-app card.

**Only truly-wired controls.** The live view's control set is unchanged from base and is exactly what `deriveCallView` earns per phase: Accept/Decline (incoming ringing), Cancel (outgoing ringing), Mute (connected only — wired to the real `CallClient` mute), End. No video toggle, no speaker toggle, no keypad on the live path: the media stack is audio-only (§2), so those buttons would be lies. The Assist/graphing control (§5) appears only on `phase === "connected"` with a real `assistCallId`.

**Honest states, in plain language.**
- Before connection (every non-connected phase): "Opal doesn't record calls. Graphing — Opal noting plans from what's said — starts only once you're connected, and only if you both allow it."
- The capture-truth line under the light, per graphing state (§4) — including, for off/waiting: "Opal is not listening to, transcribing, or recording this call."
- No simulated transcription or assist output anywhere; when Assist is not `:active` the client never opens the mic path (`hear()` is gated on the polled server state), and the server grant refuses with `:assist_inactive` unless both allow.

## 4. Graphing-light model (item 16a)

**One derivation, server-side, every surface.** `OpalCore.Calls.Graphing.graphing_state/1` derives the state from the call's real per-call Assist consents — identical for every viewer:

| State | Meaning (derivation) | Light | Plain sentence (capture truth) |
|---|---|---|---|
| `:graphing` | Both participants allow now; ingestion gate is open | Soft spectral filled point (`#9ff3ea`, gentle glow) + "Graphing on" | "Opal Assist is listening on this device to note plans. Raw audio is never saved." |
| `:paused` | A participant revoked after having allowed, while the other allows or allowed before — graphing was in reach and someone held it | **Hollow amber ring** + "Graphing paused" — visibly distinct from every other state | "Opal is not listening while graphing is paused, and nothing said now is kept." |
| `:waiting_for_other` | One participant allows, the other hasn't decided | Dim spectral point + "Graphing waiting" | "Opal is not listening to, transcribing, or recording this call." |
| `:off` | Nobody allows and nobody has paused (incl. a first-run "Not now" decline — never allowed ⇒ `:off`, never `:paused`) | Dim neutral point + "Graphing off" | "Opal is not listening to, transcribing, or recording this call." |

QUIET by law: one 9px point + one label word-set, no red, no flashing. Paused ≠ off is a first-class distinction in the derivation (pinned by test: a first-run decline reads `:off`; allow→graphing→revoke reads `:paused`).

**One state, every surface, in real time.** The same derivation rides (a) the REST assist projection (`GET/POST /calls/:id/assist` → `"graphing"`), (b) the assist view returned by every consent write, and (c) the call-channel broadcast (§5). The client renders the string verbatim (`data-graphing-state={state}`) and never computes graphing from consent fields — pinned by a web test that also forbids the derivation pattern in `callAssist.tsx`.

## 5. Pause (item 16b) — real control, real halt, lineage

**Control.** Any participant, two equivalent doors into the one gate:
- REST: the in-call toggle → `setCallAssist(callId, allowed, scope: "call")` → `Assist.set_allowed/4`.
- Channel: `handle_in("graphing", %{"allowed" => boolean})` on `call:<id>` → the same `Assist.set_allowed/4`; the reply is `Graphing.payload/3`, the same shape as the broadcast.

One button, words = the state it produces: "Pause graphing" (while graphing) / "Resume graphing" (self-paused) / "Enable Assist" / "Waiting for {peer}". **A peer's pause is held by the peer**: when the other participant paused, the button reads "Paused by {peer}", tapping does nothing, and the surface says "{peer} paused graphing for this call. Only they can resume their side." — nobody can resume someone else's consent, and the surface never pretends otherwise.

**The halt is real.** Pausing writes the per-call consent `allowed: false, revoked_at: now` (source `call_pause`). `Assist.assist_state/2` then reads `:off` for everyone (any revoked row ⇒ off), so `accept_transcript/3` returns `{:error, :assist_inactive}` before any persistence, and the Deepgram grant (`Assist.grant/3`) refuses too — the client mic path stops on the next poll/broadcast refresh because `hear()` requires `:active`.

**Pause proof (test, §7).** On a real connected call with both allowing: a final segment persists (count 1) → participant B pauses (both viewers' projections read `:paused`, assist `:off`) → transcript posts from **both** participants during the window return `:assist_inactive` → segment count is still **1** — nothing from the pause window exists as a segment, and since the fold/graph outcomes run only after a segment insert (§2), no graph record from the window can exist either → B resumes (`:graphing`) → a new segment persists (count 2).

**Broadcast.** Every `set_allowed/4` write records the transition (§lineage) and broadcasts `event: "graphing"` on topic `call:<id>` with payload `{"call_id", "conversation_id", "graphing", "by_user_id", "at"}` to every joined participant. Web: `ActiveCallOverlay` forwards it as an `opal:call-graphing` window event; `CallAssistControl` refreshes from the server projection immediately on a matching `call_id` (the 2s poll remains as backstop). Both participants' lights move together, off the same derivation.

**Lineage (item 16c).** Append-only `call_graphing_events` row per transition: actor, action (`graphing_on` / `graphing_paused` / `graphing_resumed` / `graphing_off`, named from the pre-write state — on-from-paused is a resume; off-from-graphing/paused is a pause; a never-allowed decline is a plain off), resulting state, scope (`call`/`account`), timestamp. The same transition is published to the domain-event outbox as `call.graphing_changed` (privacy `shared_authorized` / `call_participants`, consent scope `per_call_graphing`, purpose `consent_lineage`, payload carrying the lineage id) — lineage write + outbox publish happen before the broadcast, so the light is backed by a record. Lineage is best-effort by design (a lineage/broadcast failure never un-writes consent); the consent row remains the authority. Pinned by test: on/on/pause/resume yields exactly `[{graphing_on, waiting_for_other, A}, {graphing_on, graphing, B}, {graphing_paused, paused, A}, {graphing_resumed, graphing, A}]`.

## 6. Settings API contract (item 16d) — standing per-user permission

Backend truth + API already exist at base and are the same machinery this wave's graphing rides; **no new code was needed** — documented here for the integration wave that lands the Settings UI:

- **Field:** `users.assist_calls_enabled` — boolean, nullable. `true` = standing allow, `false` = standing decline, `null` = never decided (the in-call first-choice prompt exists precisely for `null`).
- **Read:** `GET /api/v1/product/preferences/assist` → `{"assist_calls_enabled": true | false | null}` (`ProductSession.assist_preference/1`).
- **Write:** `PATCH /api/v1/product/preferences/assist` with `{"assist_calls_enabled": boolean}` (`"true"/"false"` strings also accepted; anything else → `{:error, :invalid}`). Client wrappers: `getAssistPreference()` / `updateAssistPreference(enabled)` in `productClient.ts`.
- **How it composes with per-call graphing:** when a call connects, `Assist.apply_defaults/1` seeds a per-call consent (`source: "account_default"`) for each participant whose standing field is `true` and who has no per-call row — so two standing-allow users land directly in `:graphing`. The in-call first enable writes with scope `"account"` (sets the standing field and the per-call row together); every later per-call pause/resume writes scope `"call"` only and **never rewrites the standing field** — pinned by test ("standing account default seeds new calls and the per-call pause never rewrites it": after a per-call pause, `assist_calls_enabled` still reads `true`, and the assist projection still reports `account_default: true`). Every assist projection also carries `"account_default"` so the Settings UI and the in-call surface read the same truth.

## 7. Results (verbatim)

**Execution-method disclosure (read first).** This machine restarted three times during this dispatch and the runtime SIGTERM-reaped long-lived detached processes twice; two monolithic backend full-suite attempts were killed mid-run by the environment with no summary — never by a test outcome (the one monolithic web attempt was believed killed when its log read as truncated, but had in fact survived detached and later completed — see the web floor below, where it independently confirms the chunked totals). All product work was already committed before each restart (the §0 commit cadence is why nothing was lost). The floors below were therefore discharged with **resumable chunked runs**: every test file executed exactly once, pinned where the floor is pinned, per-chunk summaries persisted to disk as they landed. Logs: `~/workspace/opal-graph/incall-scratch/logs/` (`backend-chunk-*.log`, `web-chunk-*.log`, `api-*.log`).

**Targeted suites (foreground, first runs after adoption):**

```
backend graphing + assist:  20 tests, 0 failures   (graphing_test.exs 7 + assist_test.exs 13)
backend graphing after format commit:  7 tests, 0 failures
web graphingLight.test.ts:  Test Files 1 passed (1) · Tests 7 passed (7)
web call cluster (9 files: callAssist, callLifecycle, callSubstrate, huntFixWeb,
  physicalCloseout, authorityRejectedStates, callMedia.integration,
  callMediaRuntime, graphingLight):  82 passed, 1 failed — the 1 failure is
  authorityRejectedStates Center-geometry, proven baseline below.
```

**Backend floor — 3,170/0 pinned, plus the 7 new tests.** Full suite executed chunked (35 chunks × 10 files, 349 files, `OPAL_CLOCK_OVERRIDE=2026-10-18T09:00:00Z` = pinned 02:00 LA, `--max-cases 2`), summed from the per-chunk final lines:

```
3,177 tests total (= 3,170 baseline + 7 new graphing), 3 raw failures — all three
proven environment artifacts, each re-run green in isolation:
  · chunk 18 ×2 — FounderCommunicationSeedTest, Postgrex ERROR 40P01
    (deadlock_detected) between concurrent suites sharing the one test DB on
    this cluster. Isolated re-run of the file: "3 tests, 0 failures".
  · chunk 35 ×1 — TwoUserPlanLifecycleTest, assert_receive Socket.Reply
    timeout (2000ms) under load ~13–19. Isolated re-runs: contended 11/1,
    quiet machine "11 tests, 0 failures".
Every other chunk: 0 failures. Net product result: 3,177/0.
(Chunks 7–11 first executed into the post-restart DB-recovery window —
"database couldn't be created: killed", zero tests ran — and were re-run
in full: 121+125+69+136+212 = 663 tests, 0 failures.)
```

**Web floor — failing set exactly baseline (23 failed / 16 files).** Confirmed twice, independently: (1) a monolithic `npm test` run that survived in the background through the restarts completed after 1,774.94s with the verbatim final line `Tests 23 failed | 1504 passed (1527)` (`logs/web-full.log`); (2) the chunked execution (25 chunks × 8 files, 196 files, `--maxWorkers=2`), summed from per-chunk final lines, produced the identical totals:

```
Tests: 23 failed | 1,504 passed (1,527 total = 1,520 baseline + 7 new graphingLight tests, all passing)
Failing files (16, exactly the baseline set; none is a call/graphing/assist file):
  src/activation.test.ts, src/availability/availability.test.ts,
  src/designTokens.test.ts, src/onboarding/firstRun.test.ts,
  src/opalUi/authorityRejectedStates.test.ts, src/opalUi/grammar.test.ts,
  src/opalUi/graphCalendaring.test.ts, src/opalUi/graphDetail.test.ts,
  src/opalUi/graphScroll.test.ts, src/opalUi/graphSpine.test.ts,
  src/opalUi/liveJourneyProof.test.ts, src/opalUi/pasteW4DeviceFixes.test.ts,
  src/opalUi/waveBChatsExact.test.ts, src/opalUi/waveBGraphsExact.test.ts,
  src/opalUi/waveBHomeExact.test.ts, src/theme/technicolorProduction.test.ts
Baseline spot-proof: authorityRejectedStates run against the stashed base tree
fails identically (1 failed | 20 passed). Every other failure's assertion text
names graphs/brand/onboarding/theme files W12 never touched (verified per
chunk log). Test side-effect files (shots/regression/results.json,
shots/intelligence/EXTRACTION_VERIFY.json, shots/poc2/perf_ms.txt) were
restored; the worktree is clean.
```

**Typecheck — exactly 9.**

```
npx tsc -p tsconfig.json --noEmit → 9 errors, all pre-existing, none in W12 files:
  OpalApp.tsx ×3 ("opal" not assignable to SetStateAction<Tab>),
  productClient.ts ×5 (duplicate plan_type/online identifiers),
  YouSettingsDestination.tsx ×1 (RelationshipContact.handle).
```

**API floor — 101/101.** Server from this worktree (`mix phx.server`, port 4119, dev DB `opal_dev_r19incall` on the 5433 cluster, migrated to this tip — 111 migrations through `20261029060001`; `OPAL_PHONE_VERIFY_MODE=synthetic_development OPAL_SYNTHETIC_EXPOSE_CODE=1 OPAL_CLOCK_OVERRIDE=2026-10-18T21:00:00Z`), suite `shots/regression/run.mjs` with `OPAL_SESSION_PROVISION=synthetic OPAL_SEED_MODE=1`:

```
summary-equivalent: 101/101 PASS, 0 product failures.
Execution: one full run reached 25 PASS / 0 FAIL before the runtime
SIGTERM-reaped it (EXIT:143); the remaining 76 cases were run per-case in
13 batches, all PASS. FR-18-B2-02 twice hit harness errors (activation
challenge 500, then fetch failed) against the first server as it was
being SIGTERMed; on the restarted healthy server it PASSes
(9141ms, 17 checks). The DIR-1 pair passes in-suite
(FR-18-DIR1-01 17 checks, FR-18-DIR1-02 14 checks), as does
FR-18-02-revision (29 checks). Server stopped and results.json restored
after the run.
```

**DB proof:** test DB on the suite's own Repo config resolves to the 5433 cluster; after the final restart, `psql` against it returns `opal_test_r19calls | max(schema_migrations) = 20261029060001 | count = 111` — this tip's full schema including the W12 migration. The dev DB shows the same 111.

## 8. Pack capture list (owed by the pack phase — rendered proof, served build, phone size, BOTH modes)

The call field is an immersive dark field in both modes at base and stays so; light-mode captures prove the surrounding chrome/light language, the call stage itself is the spectral dark field in both.

1. `incall-ringing-incoming` — incoming ringing: orbit stage, tilted ring turning, capture note visible ("Opal doesn't record calls…"), Accept/Decline only.
2. `incall-ringing-outgoing` — outgoing ringing: orbit stage, Cancel only, capture note visible.
3. `incall-connecting` — connecting phase: orbit still turning, "Connecting audio…" status, End only.
4. `incall-connected-graphing-off` — connected, graphing off: still rings, quiet timer line, dim light "Graphing off" + capture-truth line, "Enable Assist" (or first-choice copy when undecided).
5. `incall-graphing-on` — connected, both allowed: spectral point lit, "Graphing on", "Pause graphing" control.
6. `incall-graphing-paused-self` — after self pause: **hollow amber ring**, "Graphing paused", "Resume graphing".
7. `incall-graphing-paused-peer` — peer paused: hollow ring + "Paused by {peer}" + held note ("Only they can resume their side.").
8. `incall-graphing-waiting` — one allowed: dim spectral point, "Graphing waiting", "Waiting for {peer}".
9. `incall-video-kind` — video-kind live call: same orbit stage, **no video feed painted** (audio-only truth), no video toggle on the live path.

Each in light + dark mode (18 frames). Capture against the real lifecycle only — a genuinely ringing/connected call between two sessions; never a fixture stage (F-16/honesty bar: no simulated connected call for the camera).

## 9. Files

Backend: `apps/opal_core/lib/opal_core/calls/graphing.ex` (new), `graphing_event.ex` (new), `assist.ex`, `apps/opal_core/lib/opal_core_web/channels/call_channel.ex`, `apps/opal_core/lib/opal_core_web/controllers/call_controller.ex`, `apps/opal_core/priv/repo/migrations/20261029060001_create_call_graphing_events.exs` (new), `apps/opal_core/test/opal_core/calls/graphing_test.exs` (new).
Web: `apps/opal_web/src/opalUi/graphingLight.tsx` (new), `graphingLight.test.ts` (new), `callAssist.tsx`, `CallSurfaces.tsx`, `ActiveCallOverlay.tsx`, `apps/opal_web/src/api/productClient.ts`, `apps/opal_web/src/styles.css`.
