# Repair #19 — Founder Polish Wave — Cluster I FINISHER: Etiquette (P13 + P14)

Branch: `muse/r19-polish-etiquette` (base `95319bd7`). Commits: `250f90c8` (backend), `0e65b0cb` (web), `8d70c236` (finisher fix: PlanProjection read-path registration, §5). Not merged, not pushed. FOUNDER_ACCEPTED = NO. `muse/repair-17` untouched. No ledger edits.

This finisher rescued an uncommitted WIP left by a worker killed in a runtime restart (its scratch logs survive at `~/workspace/opal-graph/polish-scratch-etiquette/`), audited it file by file, repaired what was wrong, and re-ran every suite itself. Verdicts below distinguish **sound** (kept as found), **repaired** (changed by the finisher), and **absent** (never built — declared, not hidden).

> **Architecture law (for the delivery notes): PRODUCTION PROACTIVITY IS EVENT-DRIVEN — ABSOLUTELY NO POLLING in the live application. State changes, channels, scheduled jobs carry the signals.**

---

## 1. Investigation — what the WIP actually was

The WIP was substantially complete and, in its core design, correct: a backend lifecycle module + Oban stage worker + additive migration + backend test suite (19 tests in the finisher's count), plus a web limbo treatment (PlanCardC2 + tokens + CSS + one test file). Its own scratch logs show it had run the etiquette suite green (18 tests at that time) and the pattern-enforcement registry green in isolation, but its "touched suites" run (142 tests, 1 failure) was the registry test failing *before* the registry edit landed, and its web-full run died mid-suite with no summary when the runtime restarted — **the limbo web test had never executed**. The finisher re-ran everything; results in §6 are the finisher's own.

## 2. Audit verdict per WIP file

| File | Verdict | Notes |
|---|---|---|
| `social_flow/non_response_etiquette.ex` (new) | **Sound in design; 2 defects repaired** | Lifecycle, mode gate, consequence gate, copy deck, window gate, closure core all correct (see §3/§4). Defects: `projection_for/3` and `respond_as_requester/3` both selected the *first* open loop for a plan — on group requests (one loop per recipient) a second recipient was mis-roled as `group_member` with no decline right, and a requester escalation answer could land on a non-escalated loop. Repaired: projection selects the viewer's own loop (recipient → requester → first), escalation selects the escalated loop. Pinned by a new group-projection test. |
| `social_flow/non_response_etiquette_worker.ex` (new) | **Sound** | Single Oban stage job (`queue: :events`, which exists in config), stage carried in args, delegates to `advance/2`. Not a poll (see §3.3). |
| `social_flow/attention_signal.ex` (modified) | **Sound** | One additive signal type, `non_response_closure`. Downstream check: `ProductShell.signal_family/1` maps unknown types to `"quiet_information"` — right for a closure notice; `needs_answer` (nudge/fork/escalation) already maps to `needs_action`. No other change needed. |
| `social_flow/plan_participant.ex` (modified) | **Sound** | Two additive nullable fields (`response_window_seconds`, `response_window_closes_at`), cast + contract. `to_contract/1` is live (conversation controllers), so window truth rides an existing API contract. |
| `social_flow/temporal_follow_through_loop.ex` (modified) | **Sound** | One additive loop kind, `invitation_response`; the remaining diff hunk is a `mix format` rewrap of `validate_required` (file passes `mix format --check-formatted`). |
| `priv/repo/migrations/20261030020001_…` (new) | **Sound** | Additive only, both columns nullable, no existing row/meaning changes. Applied cleanly in the finisher's migrate run. |
| `test/…/non_response_etiquette_test.exs` (new) | **Sound; finished** | Comprehensive pins (lifecycle, group, modes, consequential, quiet, window gate, limbo projection, instant decline at 3 stages, copy scan, no-polling source scan). Finisher: removed one unused-variable warning (`pp` in the group test) and added the group-projection pin for the loop-selection repair. 18 → 19 tests. |
| `test/…/repair18_pattern_enforcement_test.exs` (modified) | **Legitimate extension — NOT a weakening (proved in §5)** | Adds exactly one file to the FIX-10b exact registry. |
| `c2/PlanCardC2.tsx` (modified) | **Sound** | `limbo?: PlanCardLimboC2` input; renders only when `state === "limbo"`; stamps `data-limbo`, `data-limbo-viewer`, `--limbo-remaining` (clamped 0–1), and a `c2-plan-limbo` strip with the projection's finished copy + `data-pattern`/`data-treatment`. Card derives nothing. |
| `c2/c2.css` (modified) | **Sound** | Cooling curve: border `color-mix` of `--state-limbo` → `--state-limbo-muted` by `--limbo-remaining`; cooling-lines `repeating-linear-gradient` strip fades on the same curve; nothing animates (reduced-motion safe); no reference to `--state-action` anywhere in the limbo block. |
| `theme/c2Tokens.css` (modified) | **Sound** | `--state-limbo{,-tint,-ink,-muted}` in **both** modes: light `#d97706` → muted `#a8a29e`; dark `#f0a840` → muted `#8a8296`. Distinct from action red and ready gold in both modes. |
| `c2/limboTreatment.test.tsx` (new) | **Defective — repaired** | Imported `@testing-library/react`, which this repo does not install (not in `package.json`, not in `node_modules`); the file failed at import resolution and had never run. Rewritten to the repo's render convention (`react-dom/client` + `act` + `@vitest-environment jsdom`, exactly as `planCardAtfix.test.tsx`). All 5 assertions from the WIP preserved verbatim in intent. Now passes. |

**Discarded: nothing.** No WIP file was thrown away; the only rewrite was the limbo test's render harness (assertions kept).

## 3. P13 — Non-response etiquette

### 3.1 Lifecycle (on the existing follow-through machinery — no parallel system)
- Durable state: a `TemporalFollowThroughLoop` of the new kind `invitation_response`, registered through `TemporalFollowThrough.register/1`, idempotent per participant — the same machinery the R16 producers use.
- Notices: ordinary private `AttentionSignal` rows read back through the existing needs-you path (`FollowThrough.needs_you/1`, re-exported and pinned in tests): `needs_answer` for nudge, fork, and requester escalation; the new `non_response_closure` for closures.
- Stages: `awaiting` —(grace)→ `nudged` —(fork due)→ `forked` —(fork window 24h)→ auto-decline **or** escalation. Escalated: requester chooses `nudge_again` (fresh fork) / `extend` (+48h, no new disturbance) / `let_it_go` (closure with hold release). Recipient answers at any open stage: `decline` (plain decline) or `ask_another_time` (resolves, declines nothing, hands the ball to the requester). A recipient who answered elsewhere resolves the loop silently at the next stage job (`resolved_responded`); a terminal plan resolves it too.
- Closure: the participant row records a **plain decline** (`response_state: "declined"`, `authority_source` untouched = `user_action`). The private truth (recipient's tap / Opal on their behalf / requester let go) lives **only** in the `AuditEvent` ledger, loop metadata, and private signal `source_lineage`. No contract copy anywhere says "auto-declined" — pinned by a copy scan over every emitted signal.
- Hold release: **1:1 only** — the plan is cancelled *only* through `PlanTransition.guard_changeset(:plan, :cancel)` (mirroring `SocialFlow.cancel_plan/1`); a gate refusal is an honest no-cancel. **Group**: the participant declines, the plan is never cancelled, other members get the group closure copy ("The plan can go ahead with everyone else — nothing is on hold."), the group proceeds.
- The requester always gets closure (1:1 copy names the recipient and frees their time); the non-responder is never punished or exposed (their closure copy thanks them and invites a fresh plan).

### 3.2 Timings, QUIET, proactivity mode — ledgered
- Ruled intervals (named constants in the module): no window — grace/nudge **24h**, fork **72h**, fork window **24h**. With a creator window: the window *is* the timing source (nudge + limbo at half the window, fork exactly at close — §4.3).
- QUIET: nudge and fork delivery check `QuietHours.quiet_now?/2` for the recipient; inside quiet hours the stage **defers** (re-enqueued +1h, ledgered `non_response.deferred_quiet_hours`) instead of disturbing. Closure/escalation signals are passive notices (no recipient disturbance) and are not quiet-gated — stated plainly so the boundary is visible.
- Mode gate: auto-decline acts *on behalf of the non-responder*, so the **non-responder's** `AssistancePreference` governs. `proactive` = handle-the-small-things ("More forward") → auto-decline permitted for non-consequential requests only. `balanced` ("waits for your say-so before it acts") / `minimal` ("Only when I ask") / missing preference (= balanced) = check-with-me-first → **never** auto-declines; escalates to the requester instead. **Consequential requests never auto-decline in any mode** — consequential is defined from the plan's own data: status `agreed`/`changed`, a live `PlanCommitment` row, or start within 48h. The current Settings vocabulary has no permission for consequential auto-decline and the module does not invent one.
- Everything is ledgered: `request_opened`, `window_set`, `nudged`, `fork_presented`, `deferred_quiet_hours`, `escalated_to_requester`, `requester_nudged_again`, `requester_extended`, `another_time_requested`, `closed` (with `source`, `group`, `hold_released`), `resolved_by_response`, `resolved_plan_terminal`.

### 3.3 Architecture law compliance — the worker audit
**PRODUCTION PROACTIVITY IS EVENT-DRIVEN — ABSOLUTELY NO POLLING in the live application.** Audited directly: `NonResponseEtiquetteWorker` is a plain Oban worker. One job is enqueued at the transition that creates a deadline (`scheduled_at` = the due instant, `queue: :events`); each stage enqueues exactly one successor. There is **no** cron entry, **no** GenServer timer, **no** sweep, **no** `Process.sleep` / `send_interval` anywhere in the feature — the test suite pins this by source scan. Jobs are due-guarded *and* stage-guarded: a stale, replayed, or superseded job is an honest no-op (`:stale_job` / `:not_due`), proved by the exactly-once expiry pin (replaying the fork-stage job after closure emits no second closure; closure signal count stays 2). In test env, scheduling follows the repo's Reminders pattern (Oban `:inline` would fire immediately regardless of `scheduled_at`), so tests drive `advance/2` — the exact entry the worker calls — with pinned clocks.

## 4. P14 — Countdown + limbo

### 4.1 Response windows (creator opt-in, relationship-gated in the backend)
`set_response_window/2` writes the window as **data on the request** (the `PlanParticipant` row; additive migration). Gates, all pinned:
- creator only (`:not_creator`); recipient still pending (`:not_pending`);
- **relationship gate at set time**: recipient must be within the creator's circles from real evidence only — a typed `Relationships` row *or* co-membership in the plan's conversation (`:outside_creator_circle` otherwise);
- **eustress/mode gate**: a consequential plan + a check-with-me-first recipient → no countdown (`:window_unavailable_consequential_mode`), and `window_projection/4` declares that unavailable state with finished copy so the UI never has to guess;
- dosed bounds: **1 hour to 14 days** (`:invalid_window` outside).

### 4.2 Limbo — first-class state, cooling treatment, and the density reconciliation
Past grace and still unanswered, the request is in **limbo**: a first-class state in the backend etiquette projection (`projection_for/3` — stage, `limbo.state/treatment/pattern_channel/window_fraction_remaining`, and the viewer's own finished copy), not a plan status. Sender copy reads as waiting; recipient copy reads as a window still kindly open. The web treatment (PlanCardC2) is the **cooling treatment**: amber cooling toward muted by the remaining fraction, `cooling-lines` pattern channel carrying the state without color, no animation. **Never action red, ever** — pinned in the web test (no `--state-action` reference in the limbo CSS block) and by token construction in both modes.

**Reconciliation with the density cluster (merged, `polish-density-report.md` §2 "invitations"):** one limbo language, no divergence in grammar —
- **Shared vocabulary (identical):** warm / cooling / **limbo** / settled; limbo = the past-grace segment of one cooling physics; amber cooling toward muted; its own pattern channel; explicitly NOT action red. The density cluster built no limbo *visual* (its report frame 9: "no dedicated visual exists yet — the limbo visual treatment is Cluster I's P14 surface work"), so there is no visual divergence to reconcile: this wave's card treatment *is* the visual both clusters named.
- **The one difference — the trigger — named plainly:** density's `invitationTemperature` (Graphs-list stamp) calls limbo when the plan's **start has passed** unanswered (calendar fact, list projection, no etiquette data on that path); the etiquette projection calls limbo when **grace has elapsed** (stage `nudged`/`forked`/`escalated` — from the request's own timing: 24h, or half the creator window), independent of the plan's start. A request can therefore be in etiquette-limbo before its start (window closing on a future plan) and a just-started plan can be density-limbo before its first nudge. **Which wins:** wherever an etiquette loop/window exists, the **backend etiquette projection wins** — it is the governed truth (real window, real stage, per-viewer copy); the density temperature is the Graphs-list stamp for plans carrying no etiquette data, and the integrator should prefer the projection's `limbo` when both are present at merge. The *treatment* is one and the same either way, so a user never sees two limbo languages.

### 4.3 Expiry = the fork (exactly once, no second timer system)
The window is data on the request; there is no second timer system. The same single stage job that would fire the 72h fork fires at window close instead — `fork_due` *is* `window_closes_at` when a window exists (pinned: `not_due` at 47h, `forked` at exactly 48h on a 48h window). After the fork, the ordinary P13 fork window (24h) runs to auto-decline/escalation. Exactly-once is pinned by replay: a stale fork-stage job after closure returns `:stale_job` and the closure-signal count stays exactly 2 (recipient + requester).

### 4.4 Eustress ethics
Dosed stress for decisiveness only: sender sees waiting, recipient sees a kindly closing window — no numeric panic countdown anywhere (the countdown *display* is the cooling fraction, §7); no countdown at all on consequential items beyond the proactivity mode (§4.1 gate); no manufactured urgency in any copy (the copy scan bans alarm/hurry/panic/urgent/warning and shame/blame words, and plain hyphens only — no em dashes); **the recipient can always decline instantly, zero penalty theater** — pinned at three stages (before limbo, in limbo, after the fork).

## 5. Pattern-enforcement verdict (founder-visible check)

The WIP's modification to `repair18_pattern_enforcement_test.exs` adds **exactly one entry** — `non_response_etiquette.ex` — to the FIX-10b exact registry of plan/participant changeset writers, with a comment stating what it writes. Audit:

- The test asserts `Enum.sort(found) == Enum.sort(registry)` — strict equality in **both** directions. Adding the file *extends* coverage to a real new writer; it removes nothing, loosens nothing, and no other assertion in the file was touched (the full diff is the 8-line addition).
- The module genuinely writes both registered shapes: `PlanParticipant.changeset` (plain decline + window columns) and `SharedPlan.changeset` for the 1:1 cancel, the latter passed through `PlanTransition.guard_changeset(:plan, :cancel)` — exactly what the registry comment declares.
- Proof it is an extension, not a weakening (all finisher-run): the pattern-enforcement suite passes **with** the new file present in both `found` and `registry` (15 tests, 0 failures, §6); removing the entry would make the suite fail (the WIP's own pre-registration run did exactly that: 142 tests, 1 failure — this test). No assertion was edited, no file was removed from any list, no pattern was loosened.

A **second registry** also applies, and the WIP missed it — caught only by the finisher's full-backend run (no partial run the WIP did exercised it): `PlanProjectionCoherenceTest` (the R13 gyroscope gate) requires every file querying plan tables to be registered in `PlanProjection.read_files/0`; `non_response_etiquette.ex` reads `SharedPlan` directly. Audit for registration: it reads **only** the single store (the `shared_plans` / `plan_participants` rows themselves — stage judging and its projection), holds no shadow copy, and caches nothing in ETS, so it meets the registry's stated condition. Finisher fix (`8d70c236`): registered in `read_files/0` and documented in `read_functions/0` as the sanctioned etiquette/limbo projection (`projection_for/3`). That gate is likewise unchanged in strength and passes in the final full run (§6).

## 6. Test results — exact, all run by the finisher

Scratch env: `~/workspace/opal-graph/polish-scratch-etiquette/env.sh` (OTP 27.3.4.2 + Elixir on PATH, `ELIXIR_ERL_OPTIONS="+fnu"`, scratch MIX_DEPS_PATH/MIX_HOME/MIX_BUILD_PATH), `DATABASE_URL="ecto://postgres:postgres@127.0.0.1:5433/opal_core_test"`. Logs: `polish-scratch-etiquette/{full-backend-finisher3,full-backend-finisher4,web-full-finisher,typecheck-finisher}.log`.

**Backend** (shared 5433 cluster — see environmental disclosure below):
- `non_response_etiquette_test.exs` alone: **19 tests, 0 failures.**
- Etiquette + `repair18_pattern_enforcement_test.exs` together: **34 tests, 0 failures** (19 + 15).
- Adjacent suites (`follow_through`, `temporal_follow_through`, `temporal_follow_through_tick_worker`, `attention_center`, `attention_authority`, `quiet_hours`, `repair16_proactivity`): **100 tests, 0 failures.**
- Coherence fix verification (`plan_projection_coherence` + `real_adapters` + etiquette + pattern enforcement): **50 tests, 0 failures.**
- Full backend run 3 (before the coherence fix): **3243 tests, 2 failures** — (1) the PlanProjection coherence gate (this wave's own miss, §5, fixed in `8d70c236`); (2) `RealAdaptersTest` "mode: no key → synthetic; key → connected", an `on_exit` GenServer race (`Physical.Providers.Metrics` process not alive) in code this wave never touched — passes in isolation (in the 50-test run above).
- Full backend run 4 (after the coherence fix): **3243 tests, 0 failures.** Count check: 3224 (other waves' full runs on this base family) + 19 new etiquette tests = 3243 — no test loss.
- `mix format --check-formatted` on every touched backend file: **clean.** No compile warnings reference any touched file (64 pre-existing warnings elsewhere in the app compile log, none from this wave; the one WIP warning — unused `pp` — was removed).

**Environmental disclosure (full-backend runs 1–2, invalid):** the shared 5433 Postgres was down when the finisher started (runtime-restart storm). The finisher first stood up a throwaway cluster on 5433 in `/tmp`; its postmaster died mid-run when the 512M `/tmp` tmpfs filled ("No space left on device" in its log — the finisher's own 165M Postgres binary copy contributed). Run 1 against it: 3243 tests, 180 failures; run 2: thousands of `connection refused` lines. Both are DB-death artifacts, not code results, and are recorded here only so nobody mistakes them for signal. The finisher then restarted the shared cluster the other waves use (data dir `/tmp/w29pgdata`), confirmed migrations up, and re-ran everything above against it — the targeted suites were re-verified on the healthy cluster too (etiquette + registry 34/0 in 3.0s vs 19.9s on the degraded one).

**Web** (`apps/opal_web`):
- Targeted: `limboTreatment` (repaired) + `planCardAtfix` + `c2Foundation` + `ja12MediaWell`: **4 files, 27 tests, all passed** (limbo suite itself: 5 tests).
- Full web suite: **Test Files 16 failed | 212 passed (228); Tests 23 failed | 1755 passed (1778)** — **exactly the stated floor (23 failed / 16 files), no growth.** The new limbo file passes and is inside the 212.
- Typecheck: **exactly 9 errors**, all pre-existing and none in touched files: `OpalApp.tsx` ×3 (`"opal"` vs `SetStateAction<Tab>`), `productClient.ts` ×5 (duplicate `plan_type`/`online`), `YouSettingsDestination.tsx` ×1 (`handle` on `RelationshipContact`).

## 7. Novelty record (per pattern)

### Pattern: non-response lifecycle presentation
- Considered: (a) a persistent "pending" inbox section listing every unanswered request (a guilt shelf — rejected: it manufactures pressure and keeps dead requests visually alive); (b) silent auto-expiry with no notices (rejected: the requester gets no closure — the exact harm P13 names); (c) **stage notices on the existing needs-you path** — one gentle nudge, one explicit fork with two honorable one-tap choices, then a kind closure — each a private signal in the surface the user already reads, nothing new to learn.
- Pick: **(c)**. Reason: quiet and informative — the lifecycle is visible exactly at the moments a decision exists and silent otherwise; it reuses the one attention surface instead of inventing a second inbox, and the closure is a finished fact, not a lingering card.

### Pattern: countdown display
- Considered: (a) numeric countdown text ("closes in 31:04:12" / "2 days left") — rejected: countdown noise and manufactured panic, the same call the density cluster made for far plans (P12-4); (b) a progress ring/bar draining — rejected: reads as a meter running out, gamey, and implies false precision; (c) **the cooling fraction itself as the display** — the card's amber cools toward muted as the window burns down (`--limbo-remaining` drives border + pattern on one curve), with finished words ("still open", "waiting to hear back") carrying the meaning.
- Pick: **(c)**. Reason: the founder's ambient doctrine — state spoken in light, legible without reading a clock; decisive (you can see it closing) without ever shouting. Clarity senior: the words are always there; the cooling is the emphasis, never the only channel.

### Pattern: limbo treatment
- Considered: (a) action red / needs-you treatment — rejected outright by the spec: red is spent only on a live action state, and limbo is not an emergency; (b) grey/faded "inactive" treatment — rejected: grey reads as *settled/dead*, which is a different state (density's settled line owns that end-state) and would lie about a window still open; (c) **cooling amber toward muted + cooling-lines pattern channel** — the density cluster's S2 physics, given its visual form here.
- Pick: **(c)**, shared verbatim with the density grammar (§4.2). Reason: one cooling language across Graphs list and plan cards; amber says "still warm, still open, cooling" — true at every fraction; the pattern channel keeps it legible without color and under reduced motion (nothing animates).

## 8. Honest absences (not built — declared, not hidden)

1. **No production caller opens the lifecycle.** `open_request/2` has no caller in plan/invitation creation paths (verified by grep across `apps/`): no plan created in the live app yet starts an etiquette loop. Wiring it into the creation door is a SocialFlow change touching the pattern registries — the integrator/founder should schedule it as its own visible step. Until then the lifecycle is complete, tested machinery that production traffic does not yet reach. **This is the wave's largest gap and it is stated first on purpose.**
2. **No API surface.** `set_response_window/2`, `respond_as_recipient/3`, `respond_as_requester/3`, and `projection_for/3` have no controller/route/channel exposure. The participant *contract* does carry the window (live via conversation controllers), but the etiquette projection itself is not yet served.
3. **No shell wiring for the limbo card input.** `shellData.ts` does not yet map any projection into `PlanCardC2Input.limbo`; the card treatment is complete and pinned against the projection's exact shape, but no live surface feeds it yet (integrator work, with item 2).
4. **No creator UI for setting a window.** The backend gate + honest unavailable copy exist (`window_projection/4`); no settings/creation control renders them yet.
5. **Window set after a loop opens does not reschedule the already-enqueued stage job.** Dues are recomputed from loop metadata at every advance, so the lifecycle self-corrects (a late job still nudges, then forks at the recomputed close), but a short window set late can nudge later than half-window. Setting the window before/at request creation — the designed flow — is exact.
6. **No captures in this report.** Frame list in §9 is for the integrator; this finisher took no screenshots (the surfaces in items 1–4 are not yet reachable in the served app, so a capture would be a fixture render, not the real user path — named as such if the integrator chooses fixture captures like the density wave's heavy-persona frames).

## 9. FRAME LIST for the integrator (both modes each)

Staging path: seed two accounts with a real relationship row, then drive the **public backend functions** (the same entries the stage job and tests drive) — or, once §8 items 1–3 land, the live path. Pinned-clock staging via `open_request(..., requested_at: …)` backdating + `advance/2` with explicit `now:`.

1. **Graceful-fork moment** — recipient's needs-you view after: open a 1:1 request, advance past grace (nudge signal present), advance to fork due. Capture the fork signal copy + its two actions ("I cannot make it" / "Could another time work?"). Dark + light.
2. **Closure notice** — continue the same request in `proactive` mode past the fork window (auto-decline). Capture (a) the requester's `non_response_closure` ("…is not able to make it to …, so this plan is closed and your time is free again.") and (b) the recipient's closure copy. Note for the capture log: the plan must read **cancelled** (1:1 hold released) and the participant row a plain **declined** with no on-behalf marker anywhere visible. Dark + light.
3. **Mid-limbo card — sender view** — a plan card fed the etiquette projection at fraction ≈ 0.5 (e.g. 48h window at +36h from request, stage `nudged`): `PlanCardC2` with `limbo.viewerRole = "requester"`, waiting copy, `data-limbo="limbo"`, cooling border mid-curve. Dark + light.
4. **Mid-limbo card — recipient view** — the same instant, `viewerRole = "recipient"`: window-still-open copy, same cooling treatment (one state, two legible meanings). Dark + light.
5. **(Optional, group)** — the group closure: a 3-person request auto-declined for one member; capture the third member's group closure notice and the plan still `tentative` (group proceeds).

— End of report. FOUNDER_ACCEPTED = NO.
