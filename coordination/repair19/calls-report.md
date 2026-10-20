# Repair #19 — WAVE W2: THE CALL LOG, FULLY INTO THE DESIGN — report

Branch `muse/r19-calls` off `muse/repair-19` (`f2981dbf`), worktree
`~/workspace/opal-graph/wt-r19-calls`. Two commits, no pushes:

- `16975393` backend: one call-state fact on GET /calls (Calls.CallState)
- `299c0b78` web: the call log's place in the C2 shell, state-coded
  ambient borders

FOUNDER_ACCEPTED stays NO. Machine-proven only; rendered captures
are owed by the pack phase (hooks in §6).

---

## 1. Placement decision

**The C2 Chats surface gains its Calls tab** — no new route, no new
dock destination.

Grounds, from the code and the surface map:

- The product's own structure already pairs Chats/Calls: the C1
  chats list carries the Chats/Calls segment (surface-map entry 7),
  and the legacy ChatsHome family is one component with a
  Chats|Calls mode switch. A dedicated route would split a pair the
  design keeps together and add a dock/sidebar decision the founder
  never asked for.
- Surface-map gap **F-GAP-9** named exactly this hole ("A Calls
  place inside Chats — the Chats/Calls words at the top of Chats
  name a place that does not open"). This wave closes it where it
  was named.
- What shipped: in `PeopleChatsList` the Calls segment becomes a
  real tab button **only when the host wires it** (`onShowCalls`);
  `ChatsHost` (the C2 shell's Chats destination) switches to
  `PeopleCallsList`, which loads the real `GET /calls` contract.
  Review surfaces that do not wire it keep the words-only segment —
  no dead tab anywhere.
- The legacy-shell Calls path (`ChatsHome` in `OpalApp`) is
  **untouched**: in the integrated (C2) build it is no longer the
  served route for calls — the C2 shell never mounts `OpalApp` —
  and in the R17 fallback build it keeps working exactly as before.
  The old dock character never appears on the C2 path; the Calls
  tab sits under the orb navigation pad like every C2 surface.
- Field/palette/typography: the surface is a C1 surface
  (`c1-surface`, `--canvas`/`--surface-1` field, C2 tokens, display
  + body type) inside the shell's `[data-design="r18"]` host —
  side-by-side with the chats list and the thread it reads as the
  same app because it is built from the same components and tokens.
  Both modes ride `:root[data-mode]`; dark is the tokens' genuinely
  dark field, as on the chats list.

## 2. The call-state model (the core ask)

One derivation, server-side, single-source (MP-3):
`OpalCore.Calls.CallState.derive/3`, computed in `Calls.list_for/1`
and riding **every** `GET /calls` row as `call_state`:

```json
"call_state": { "state": "action", "reason": "missed_unresolved", "label": "Call back" }
```

The front end renders the fact; it never re-derives state from the
row's raw fields (a web test pins this: no canon hex, no `.missed`
or `history_label` reads in the component).

### States, sources, priority

Priority is urgency, decided once in `CallState`:

| # | State | Reason | Source (governed records only) | Border (canon, ambient) |
|---|---|---|---|---|
| 1 | action | `missed_unresolved` | The row's own server-computed missed flag (its history label is "Missed call" — an incoming miss for this viewer) AND no later call with the same peer in the same log read has `media_connected_at` set | #FF4D5E, solid + heavy leading edge |
| 2 | happening | `call_live` | Call status is ringing / initiated / answered — the call is live now | #00E5FF, solid + live dot |
| 3 | action / forming / ready / happening | `plan_action` / `plan_forming` / `plan_ready` / `plan_happening` | The row's DIR-1 `next_plan` fact state, verbatim (the one NextPlan derivation) | the plan state's canon color + its pattern |
| 4 | past | `settled` | None of the above: completed history, no open business, no shared upcoming plan | white, solid, at rest |

An unresolved miss outranks a plan state (the callback is still
owed even when a plan is ready); a live call outranks the plan
states. Labels are finished strings from the service layer:
"Call back", "Live now", "Needs your answer", "Taking shape",
"Ready", "Happening now", "Settled".

### Transitions (the border is live, not paint)

- Missed call arrives → `action`. A later call with the same peer
  **connects** (`media_connected_at` set) → the same missed row
  reads back `past`/`settled` on the next read. (An outgoing
  no-answer is not the caller's open business: the caller's row is
  settled; only the callee's missed row carries the action.)
- A shared plan is created with the peer → the row takes the plan's
  state (invited viewer: `action`; lead: `forming`). The plan is
  agreed → `ready`; its start enters the live window →
  `happening`. The plan is cancelled / passes / completes → the
  fact leaves `next_plan` and the row returns to `past` (or to
  `action` if a miss is still unresolved).
- A call rings / is answered → `happening`/`call_live` until it
  ends, then it settles.

All three transitions are proven by ExUnit read-backs (§5), not
asserted from the derivation alone.

### Ambient register — every border state's reason (founder rule)

| Element | Reason (what it tells the user) | Live condition |
|---|---|---|
| Row border, action | This call still wants something from you — a callback owed, or your answer on the shared plan | `call_state.state == action` |
| Row border, happening | This call (or your shared plan with this person) is live right now | `call_state.state == happening` |
| Row border, ready | Your next thing with this person is prepared; nothing is required | `call_state.state == ready` |
| Row border, forming (dashed) | Something with this person is still taking shape — anticipation, not a demand | `call_state.state == forming` |
| Row border, past (white) | Settled history; the stone at rest — calm closure, no open business | `call_state.state == past` |
| State label + live dot | The same state in words, for anyone who does not read color; the dot marks "live" without a badge | Same fact; dot only for happening |
| Call-back disc border (52% of the row's state color) | The disc is THIS row's action, so it takes this row's state tint — the affordance and its urgency are one read | Row carries a conversation to call in |

Intensity is the unify wave's ambient register, identical to the
PlanAwareness element beside it: **52% border / 9% fill / 12% glow**
(color-mix from the canon token) — fire-line, not the retired
saturated neon outline. Patterns are the indicator family's
secondary cue from the shared `PATTERN_BY_STATE` map (forming
dashed, action solid-bold, happening live dot, ready/past solid).
Colors come only from `PLAN_STATE_HEX` (canon: action #FF4D5E,
ready #FFC86B, forming #8B5CF6, happening #00E5FF, past white),
passed as `--call-state`; CallLog.css holds no hex (test-pinned).

## 3. What works, kept

- **DIR-1 plan-awareness stays**: call rows render
  `<PlanAwareness variant="call">` from the real `next_plan` fact
  or nothing — never painted. DIR-1's ExUnit cases still pass.
- **Real functions**: a row tap opens the real conversation thread
  (only when the conversation is in the host's real list; otherwise
  no open affordance renders). Call back / call renders only on
  rows carrying a conversation, and places the **real** call
  (`POST /calls` via `createConversationCall`); the outcome line
  reports the server's returned status verbatim ("Calling Maya
  Chen — ringing."). The C2 shell has no call surface of its own
  today, so none is faked — the note is the honest outcome, and the
  re-read log shows the new ringing row with its own live border.
- **No fabricated history (F-05)**: rows are `GET /calls` records
  only — no seed rows are merged on this path (the legacy seed
  merge stays in the legacy shell, untouched). Empty contract →
  "No calls yet."; failed load → an honest error state, distinct
  from empty.
- The thread YOUR MOVE card was not touched (protected).

## 4. Files changed

Backend:
- `apps/opal_core/lib/opal_core/calls/call_state.ex` (new) — the
  one derivation, with the model documented in its moduledoc.
- `apps/opal_core/lib/opal_core/calls.ex` — `list_for/1` computes
  per-peer NextPlan facts (unchanged), the later-connected scan,
  and attaches `call_state` to every row.
- `apps/opal_core/test/opal_core_web/repair19_calls_call_state_test.exs`
  (new) — 3 FR cases (below).
- No migrations (none needed — the derivation reads existing
  records).

Web:
- `apps/opal_web/src/api/productClient.ts` — `CallStateFact` type;
  `call_state` on `ProductCallHistory`.
- `apps/opal_web/src/opalUi/c1/C1Surfaces.tsx` — `PeopleCallsList`
  (+ `PeopleCallSummary`); the `PeopleChatsList` segment gains the
  wired Calls tab.
- `apps/opal_web/src/opalUi/c1/CallLog.css` (new) — the row's
  ambient-border treatments (tokens only, no hex; reason register
  in the header comment).
- `apps/opal_web/src/opalUi/c1/PlanAwareness.tsx` — the pattern map
  is exported for reuse (one pattern language, no copy).
- `apps/opal_web/src/opalUi/c1/c1.css` — segment buttons carry the
  segment spans' box/type (the bar never changes shape).
- `apps/opal_web/src/c2/shell/C1ShellHosts.tsx` — `ChatsHost`:
  calls state, `listCalls` load on tab open, row adaptation
  (`callHistoryLine` over the server label, facts verbatim), the
  place-call handler + outcome note, thread opening.
- `apps/opal_web/src/theme/layoutContract.css` — L8 registry row
  for the call-row state border.
- Tests: `apps/opal_web/src/opalUi/c1/r19CallLog.test.tsx` (12),
  `apps/opal_web/src/c2/shell/r19CallsHost.test.tsx` (3).

## 5. Suites — verbatim

_(filled post-restart by the coordinator-ordered verification pass —
see the appended "Verification (post-restart, coordinator-ordered)"
section at the end of this report for the full verbatim results.)_

## 6. What the pack phase must capture

Hooks: surface `data-testid="people-calls-list"` (inside
`c2-route-chats`, reached by the Chats dock pad → Calls segment
`chats-segment-calls`); rows `data-testid="calls-row"` with
`data-call-state`, `data-call-state-reason`, `data-pattern`;
state label `data-testid="call-state-label"`; per-row actions
`calls-open-conversation-<id>` / `calls-call-back-<id>`; outcome
note `c2-calls-note`.

Captures owed, BOTH modes (dark + light), phone size, served build:

1. **Side-by-side coherence trio**: chats list, thread, call log —
   the call log must read as the same app (same field, type,
   segment, row grammar).
2. **One row per state**: action (missed), forming, ready,
   happening, past — each border measured against the canon token
   at the 52/9/12 mixes (drift probe: same state = same treatment
   on the call row and on the PlanAwareness element beside it).
3. **STATE-CHANGE BEFORE/AFTER PAIR (required)**: a missed call row
   in action (#FF4D5E border, "Call back") → place/connect a later
   call with the same peer → re-open the log: the SAME row now
   past/white, "Settled". Second pair if time allows: invited
   viewer's action row → plan cancelled → settled.
4. **DIR-1 on the log**: a row with a plan fact (variant=call
   element present) and a row without (absent — nothing painted).
5. **Honest empties**: an account with no calls ("No calls yet."),
   and the calls search matching nothing.
6. Call-back flow: tap call back on a missed row → the outcome note
   with the server's status, and the re-read log's new ringing row
   wearing the happening border.

## 7. Honest residuals

- No live-stack / browser proof in this wave (per assignment): the
  API-suite leg ran against a stack serving this branch (see §5),
  and rendered captures are owed by the pack (§6).
- The C2 shell still has no in-call surface; call-back reports the
  placement outcome in words and re-reads the log. Building the
  C2 in-call experience is a separate wave's scope, named here so
  the note is never misread as one.
- Group calls: `GET /calls` is a 1:1 log (CallSession is dyadic),
  so C2 call rows are people rows; the legacy log's group
  continuity rows were seed compositions and are not carried over.
- The later-connected resolution scans the served log window (the
  newest 50 calls, the contract's own limit): a miss older than
  the window, or resolved by a call older than the window, is
  judged on what the log itself holds — the same records the user
  sees.

---

## Verification (post-restart, coordinator-ordered)

Run by a verification worker (not the builder) after the runtime
restart that killed the builder session, on the untouched tip
`299c0b78` (branch `muse/r19-calls`). No source file was modified;
no commits were made. Logs:
`~/workspace/opal-graph/r19calls-scratch/verify/`.

Environment: `PATH=~/workspace/elixir/bin:~/workspace/otp/OTP-27.3.4.2/bin:$PATH`,
`ELIXIR_ERL_OPTIONS="+fnu"`, `MIX_HOME` and `MIX_DEPS_PATH` from the
builder's preserved `r19calls-scratch/` (the restart had wiped
`/tmp/opal_deps`; the scratch copies are the same 35 packages).
Postgres 16 on 127.0.0.1:5433, per-branch test DB
`opal_test_r19calls` (`MIX_ENV=test mix ecto.migrate` →
"Migrations already up" — the DB was already at this tip's schema,
110 migrations through 20261029050001). The builder's two junk
dirty files (`shots/intelligence/EXTRACTION_VERIFY.json`,
`shots/poc2/perf_ms.txt`) were reverted before the runs; the suites
regenerate them, and they (plus `shots/regression/results.json`)
were reverted again afterwards. **Tree ends CLEAN**
(`git status --porcelain` empty).

### Backend suite — three legs

**Unpinned (`mix test`) — PASS, verbatim:**

```
Finished in 488.3 seconds (206.6s async, 281.7s sync)
3173 tests, 0 failures
EXIT:0
```

3173 = the R18 base 3170 + this branch's 3 new FR cases.

**Pinned 02:00 LA (`OPAL_CLOCK_OVERRIDE=2026-10-18T09:00:00Z`) —
3173 tests, 1 failure, reported as-is (not re-run to replace it):**

```
Finished in 339.6 seconds (160.0s async, 179.6s sync)
3173 tests, 1 failure
```

The single failure, verbatim:

```
1) test dyad maturity Plan 1 vs Plan 10 series includes plan 1 2 5 10 20 (OpalCore.SocialFlow.CompoundQualityTest)
   test/opal_core/social_flow/compound_quality_test.exs:61
   ** (exit) exited in: GenServer.call(OpalCore.SocialFlow.Execution.MemoryStore, {:get_and_update, #Function<…> in OpalCore.SocialFlow.Execution.MemoryStore.admit/1>}, 5000)
       ** (EXIT) shutdown
   code: d = CompoundQuality.dyad_maturity_series()
```

Diagnosis — the identical contention class documented in the R18
final battery (its Leg 1): a 5-second `MemoryStore` GenServer call
timeout, not an assertion failure. Machine load averaged ~14
during this leg from processes outside this verification.
Isolated re-run of the same file under the same pinned clock,
as a separate diagnostic leg: `12 tests, 0 failures` in 0.4s.
The failing file is untouched by this branch
(`git diff f2981dbf..HEAD` contains no social_flow file) — **not
W2-implicated.**

**Pinned 14:00 LA (`OPAL_CLOCK_OVERRIDE=2026-10-18T21:00:00Z`) —
3173 tests, 1 failure, reported as-is:**

```
Finished in 474.5 seconds (143.6s async, 330.9s sync)
3173 tests, 1 failure
```

The single failure, verbatim:

```
1) test Journey A: follow-through, private completion, optional share, isolation (OpalCore.SocialFlow.FollowThroughTest)
   test/opal_core/social_flow/follow_through_test.exs:99
   Assertion with == failed
   code:  assert suppressed.suppression_reason == "not_due"
   left:  "quiet_hours"
   right: "not_due"
```

Diagnosis — a wall-clock collision inside the test itself, not
the product and not this branch: the test sets the user's quiet
window from the REAL `DateTime.utc_now().hour` +12h (its own
comment: "Quiet window 12h ahead of now so CI never lands inside
it") while the app clock is pinned by the override. This leg ran
at real 09:11 UTC, so the window computed to 21:00–22:00 UTC —
exactly containing the pinned 21:00Z evaluation instant, so the
evaluator correctly answered `quiet_hours`. Isolated re-run under
the same pin reproduces it (`5 tests, 1 failure`), confirming it
is deterministic given (real hour = 09 UTC) × (pin = 21:00Z), and
independent of suite load. The same leg passed in the R18 final
battery, run at a different real hour. The file is untouched by
this branch — **not W2-implicated.**

**W2's own backend cases, isolated:** `repair19_calls_call_state_test.exs`
under the 09:00Z pin → `3 tests, 0 failures`.

### API regression suite — 101/101 PASS (fresh-DB leg)

Recipe per the R18 final battery: dev stack from THIS tip
(`mix phx.server`, `OPAL_PHONE_VERIFY_MODE=synthetic_development
OPAL_SYNTHETIC_EXPOSE_CODE=1 OPAL_CLOCK_OVERRIDE=2026-10-18T21:00:00Z`),
then `OPAL_API_BASE=… OPAL_SESSION_PROVISION=synthetic
OPAL_SEED_MODE=1 OPAL_PHONE_A=+12025550101 OPAL_PHONE_B=+12025550102
node shots/regression/run.mjs`.

First attempt (port 4127) ran against the builder's pre-existing
dev DB `opal_dev_r19calls`, which the builder's earlier dev-server
work had already populated: **100/101**, the one failure being
`FR-18-B2-01` (participant B could not read the plan back; B's
handoff answered 422) — stale dev-DB state, the exact failure mode
the final battery's fresh-DB rule exists to prevent.

The discharging leg ran against a FRESH dev DB
`opal_dev_r19calls_verify`, migrated fresh to this tip (110
migrations through 20261029050001), server on port 4128 (4105 was
already held by another wave's stack). Verbatim final line:

```
summary: 101/101 PASS, results -> /home/hatch/workspace/opal-graph/wt-r19-calls/shots/regression/results.json
```

Including the call-log cases in-suite:

```
[PASS] FR-18-DIR1-01 - Event in conversation: shared upcoming plan reads back in chats list, thread, and call log (11407ms, 17 checks)
[PASS] FR-18-DIR1-02 - Plan awareness: a third person's plan never leaks; a cancelled plan exits everywhere (8729ms, 14 checks)
[PASS] FR-18-B2-01 - Virtual dinner completes at home: join + per-person food handoff, no physical steps, no fake order (10792ms, 21 checks)
```

The server was stopped afterwards; `results.json` restored.

### Web full suite — exactly baseline

`npx vitest run` in `apps/opal_web`, verbatim final lines:

```
Test Files  16 failed | 181 passed (197)
     Tests  23 failed | 1512 passed (1535)
```

Failing set is exactly the R18 baseline: 23 failed / 16 files
(`activation`, `availability`, `designTokens`, `onboarding/firstRun`,
`authorityRejectedStates`, `grammar`, `graphCalendaring`,
`graphDetail`, `graphScroll`, `graphSpine`, `liveJourneyProof`,
`pasteW4DeviceFixes`, `waveBChatsExact`, `waveBGraphsExact`,
`waveBHomeExact`, `technicolorProduction`). Passed = **1512**
(1497 R18 baseline + this branch's 15 new web tests: 12 call-log
+ 3 calls-host). No new failures; no W2 file among the failing.

### Typecheck — exactly 9 errors, all pre-existing

`npx tsc -p tsconfig.json --noEmit`, exit 2, verbatim:

```
src/OpalApp.tsx(3923,47): error TS2345: Argument of type '"opal"' is not assignable to parameter of type 'SetStateAction<Tab>'.
src/OpalApp.tsx(9899,22): error TS2345: Argument of type '"opal"' is not assignable to parameter of type 'SetStateAction<Tab>'.
src/OpalApp.tsx(9937,47): error TS2345: Argument of type '"opal"' is not assignable to parameter of type 'SetStateAction<Tab>'.
src/api/productClient.ts(4947,3): error TS2300: Duplicate identifier 'plan_type'.
src/api/productClient.ts(4948,3): error TS2300: Duplicate identifier 'online'.
src/api/productClient.ts(4974,3): error TS2300: Duplicate identifier 'plan_type'.
src/api/productClient.ts(4974,3): error TS2717: Subsequent property declarations must have the same type.  Property 'plan_type' must be of type 'string | undefined', but here has type 'string | null | undefined'.
src/api/productClient.ts(4976,3): error TS2300: Duplicate identifier 'online'.
src/opalUi/YouSettingsDestination.tsx(1352,49): error TS2339: Property 'handle' does not exist on type 'RelationshipContact'.
```

These are the R18 baseline 9, unchanged in kind and count. The
`productClient.ts` line numbers sit +22 versus the base
(4925/4926/4952/4954 → 4947/4948/4974/4976) — exactly this
branch's +22-line addition to that file (the `CallStateFact`
type); the errors themselves are in the pre-existing duplicate
declarations, not in any W2-added code, and no other W2 file
appears.

### Claim spot-check (report §2/§3 vs the code) — CONFIRMED

- **One backend fact on GET /calls:** `OpalCore.Calls.CallState.derive/3`
  (`apps/opal_core/lib/opal_core/calls/call_state.ex`) is the single
  derivation; `Calls.list_for/1` (`calls.ex:325-326`) attaches its
  result as `call_state` to every row, and the controller serves
  `list_for` verbatim as `%{"calls" => calls}`. Priority in code
  matches §2: missed_unresolved (action) → call_live (happening) →
  the row's DIR-1 `next_plan` state verbatim → past/settled.
- **C2 border derives from that one fact only:** in
  `PeopleCallsList` (`C1Surfaces.tsx`) the row's family is
  `planStateFamily(c.callState.state)`, the border token is
  `--call-state: PLAN_STATE_HEX[family]`, the pattern is
  `PATTERN_BY_STATE[family]`, and the label renders verbatim; the
  host adapter (`C1ShellHosts.tsx:850`) passes
  `callState: call.call_state ?? null` through untouched.
  `CallLog.css` holds no hex — border/fill/glow are `color-mix`
  over `var(--call-state)` at 52%/9%/12%, as §2 states.
- **No graphing states in the call derivation:** `CallState.derive/3`
  emits only `action` / `forming` / `ready` / `happening` / `past`;
  no graphing state (W12's surface) appears anywhere in
  `call_state.ex`, `calls.ex`, `C1Surfaces.tsx`'s call path,
  `CallLog.css`, or the `ChatsHost` adapter.

### Scorecard

| Leg | Result |
|---|---|
| Backend unpinned | **3173 tests, 0 failures** ✅ |
| Backend pinned 02:00 LA | 3173 tests, 1 failure — CompoundQuality `MemoryStore` 5s timeout under load ~14; isolated 12/0 in 0.4s; not W2 |
| Backend pinned 14:00 LA | 3173 tests, 1 failure — FollowThrough quiet-window × pin collision at real 09 UTC; reproduces isolated; not W2 |
| W2 backend cases isolated | **3 tests, 0 failures** ✅ |
| API regression (fresh dev DB, this tip) | **101/101 PASS** ✅ (first attempt on the builder's stale dev DB: 100/101, B2-01 only) |
| Web full suite | **23 failed / 16 files = exact baseline; 1512 passed** ✅ |
| Typecheck | **exactly 9 errors**, all pre-existing ✅ |
| Claim spot-check | **CONFIRMED** (above) ✅ |

FOUNDER_ACCEPTED stays NO. Nothing committed, nothing pushed.
Worktree left clean.
