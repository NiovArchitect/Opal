# Repair #17 — Track W1: Clock Determinism (quiet-hours test failures)

Branch: `muse/repair-17-w1` (base: R16 tip `2c1bdcd2`). Not pushed (coordinator pushes the integrated branch).

## Root cause

The 3 named failures — and, as the sweep found, several more tests — read the
**real wall clock** through the quiet-hours gates, so their outcomes depended
on when the suite ran:

| Test | Gate | Why it failed 22:00–08:00 PT |
|---|---|---|
| `ColdStartTest` "new maturity blocks routine_break; time_critical allowed" | `AttentionBudget.request_slot` (mediation) | `:new` maturity lets mediation through, but mediation has **no quiet-hours bypass** → `{:denied, :quiet_hours}` instead of `{:granted, _}` |
| `Phase23FoundationTest` "2.2 Inbox fanout enqueues DeliverPushWorker" | `Inbox.fanout_message` → `NotificationIntelligence.enqueue` (tier `:normal`) | Non-urgent tiers are **held for the morning** in quiet hours → no `DeliverPushWorker` job enqueued |
| `CelebrationReminderWorkerTest` "7-day and 1-day milestones → urgent" | worker → `AttentionBudget.request_slot` | The 1-day milestone is `time_critical`; its quiet bypass requires owner activity in the last 30 min (none in the test) → `{:denied, :quiet_hours}`, no attention item |

The gates consulted time via scattered `DateTime.utc_now()` /
`DateTime.now("America/Los_Angeles")` calls. The codebase already had an
injectable clock — `OpalCore.SocialFlow.Clock` (process freeze + a config
fun) — but the notification/quiet-hours path did not use it.

## Design

One injectable clock for the whole notification/quiet-hours path:
`OpalCore.SocialFlow.Clock.utc_now/0`. Precedence (highest first):

1. `Clock.freeze/1` — process-local frozen instant (existing seam; per-test pins).
2. **Application env `:opal_core, :clock_override`** (new) — a `%DateTime{}`,
   an ISO-8601 binary, or a 0-arity fun. Global: crosses process boundaries,
   so it also pins request/worker processes.
3. Legacy config `:opal_core, OpalCore.SocialFlow.Clock, now: fun` (existing).
4. **`OPAL_CLOCK_OVERRIDE` OS env var** (new) — ISO-8601 instant; the
   run-wide pin used for the proof runs below.
5. Real wall clock.

With nothing set, every changed call site returns exactly what
`DateTime.utc_now()` returned before (Clock truncates to microseconds, as
the replaced call sites did). **No behavior change in production.** No
quiet-hours policy was changed.

### Lib files changed (`apps/opal_core/lib`)

- `social_flow/clock.ex` — added the `:clock_override` app-env seam and the
  `OPAL_CLOCK_OVERRIDE` env seam; precedence documented in the moduledoc.
- `intelligence/attention_budget.ex` — `request_slot` now, dedupe window,
  and `used_today` default date now read `Clock`.
- `intelligence/cold_start.ex` — maturity age diff, learning-question day,
  seed timestamps now read `Clock` (maturity feeds the gate).
- `push/notification_intelligence.ex` — `local_hour/1` (the fanout/push
  quiet gate) derives from `Clock` (same tzdata fallback as before); held
  entry timestamp too.
- `push/workers/digest_worker.ex` — morning-flush hour derives from `Clock`.
- `intelligence/proactive_conversation.ex` — quiet-window check,
  7-day activity window, daily-cap day, anchor-window diff, thread-log
  timestamp now read `Clock` (the `local_hour` opt seam is unchanged).
- `social_flow/follow_through.ex` — `evaluate_follow_through` default `now`
  (its quiet-hours eligibility input) reads `Clock`.
- `intelligence/metrics.ex` — the four `day \\ Date.utc_today()` defaults
  now resolve through `Clock` (see "also found" below).
- Already on `Clock` (no change needed): `Celebrations`,
  `CelebrationCuration`, `CelebrationReminderWorker`, `AttentionCenter`.

## Tests pinned

Each test now SETS its scenario clock instead of inheriting one
(`Clock.freeze/1`, process-local; all files are `async: false`). No
assertion was weakened; one test got stronger (below).

- `intelligence/cold_start_test.exs` — setup pins 12:00 PDT (non-quiet).
- `foundation/phase23_foundation_test.exs` — 2.2 pins 12:00 PDT.
- `celebrations/celebration_reminder_worker_test.exs` — setup pins 12:00 PDT.
- `intelligence/attention_budget_test.exs` — setup pins an instant that is
  daytime in both timezones the file uses (12:00 JST / 20:00 PDT). The
  "quiet hours deny routine…" test previously **branched on the real
  clock** (only one of its two halves ever ran); it now pins a quiet
  instant (02:00 PDT), runs the quiet assertions, then pins a non-quiet
  instant (12:00 PDT) and runs the daytime assertions. Both halves,
  every run.
- New regression file `intelligence/quiet_hours_clock_test.exs` (5 tests):
  - quiet pin: AttentionBudget denies `proactive_thread` and
    `routine_break` with `:quiet_hours`, denies inactive `time_critical`,
    defers `weekly_briefing` with `:quiet_hours_defer_8am`, grants
    user-command `reminder` (bypass), and grants `time_critical` once the
    owner is recently active.
  - non-quiet pin: AttentionBudget grants proactive + routine.
  - quiet pin: `NotificationIntelligence.quiet_hours?/1` true; normal tier
    → `{:ok, :held_quiet_hours}` and no job; urgent tier still enqueues.
  - non-quiet pin: `quiet_hours?/1` false; normal tier enqueues.
  - override seams: app-env `:clock_override` honored (DateTime and ISO
    forms); process freeze outranks it.

### Also found by the sweep (same gate, silently time-dependent) — all pinned

- `intelligence/multiuser_pressure_test.exs` — T2 pinned to 02:00 PDT
  (LA quiet; Tokyo/London/Sydney non-quiet, as the test intends); E5 and
  G1 pinned to Tokyo midday (G1's mediation was being suppressed by
  Tokyo quiet hours in real runs).
- `intelligence/coordinator_learner_test.exs` — C1–C2 (mediation), C3
  (proactive initiation), C4 (weekly briefing deferral) pinned to Tokyo
  midday.
- `intelligence/scenario_harness_test.exs` — test 7 (weekly briefing)
  pinned to Tokyo midday.
- `intelligence/cardinality_pressure_test.exs` — N3 (`grant_batch`,
  proactive priority, no bypass) pinned to Tokyo midday.
- `relationships/relationship_{access,inference,matrix}_test.exs` — the
  AttentionBudget tests pinned to Tokyo midday: the quiet gate runs
  **before** the relationship gate, so overnight these returned
  `:quiet_hours` where the tests assert `:relationship_bounds`/grants.
- `intelligence/metrics_test.exs` — see below.
- `repair14_relationship_journeys_test.exs` — `pref_daytime/1` helper now
  derives its "daytime" quiet window from `Clock` instead of the raw wall
  clock, so the helper stays correct under a pinned run.
- `social_flow/repair16_proactivity_test.exs` — `proactive_ready_user/0`
  pins 12:00 PDT and derives its quiet window, activity fixture, and
  anchor-plan starts from `Clock` (the drive path passes no `local_hour`,
  so these tests were wall-clock dependent in the 22:00–08:00 window).

### Metrics date split (the one non-obvious find)

`MetricsTest` failed with `slots_granted == 0` even though every
`request_slot` granted: AttentionBudget stamps slots with the account's
**local** `granted_on` date, while `Metrics` aggregated the **UTC** day.
Whenever the account's local date differs from the UTC date (e.g. Tokyo
01:30 JST = 16:30 UTC the previous day), the counts silently split.
`Metrics`' default day now comes from the same injectable `Clock`, and
the test pins an instant where the two dates agree. The deeper
local-vs-UTC day semantics of Metrics vs AttentionBudget are a product
design property and were **not** redesigned — flagged here only.

## Flagged, not fixed (pre-existing behavior, minimal-fix law)

- `CelebrationReminderWorker.send_reminder/4` returns `:ok` when
  AttentionBudget denies, so `remind_one/2` counts a denied reminder as
  sent (`{:ok, 1}`) even though nothing was delivered. This is why the
  celebration failure surfaced as a missing attention item rather than
  at the denial. Left as-is; the clock fix removes the spurious denials.
- `ProactiveConversation.within_quiet_hours?/2` is named for quiet hours
  but returns `true` when the local hour is inside the *allowed* window
  (08:00–22:00). Naming only; logic unchanged.

## Proof

Environment note: the VM rebooted twice during this run, wiping the
system Erlang/Postgres. Final verification used the workspace toolchain
(`~/workspace/erlang-otp`, OTP 25 — the runtime the suite normally runs
on; Elixir 1.17.3), a private Postgres 16, and
`MIX_DEPS_PATH=~/workspace/opal_deps_w1` (the `/tmp/opal_deps` path from
the task brief did not survive the reboot). Commands (from
`apps/opal_core`):

```sh
# The 3 named files, unpinned
mix test test/opal_core/intelligence/cold_start_test.exs \
         test/opal_core/foundation/phase23_foundation_test.exs \
         test/opal_core/celebrations/celebration_reminder_worker_test.exs
# → 21 tests, 0 failures (also green inside every full run below)

# The 3 named files, clock pinned to 02:00 America/Los_Angeles (09:00Z, PDT)
OPAL_CLOCK_OVERRIDE=2026-10-17T09:00:00Z mix test <same 3 files>
# → 21 tests, 0 failures

# The 3 named files, clock pinned to 14:00 America/Los_Angeles (21:00Z, PDT)
OPAL_CLOCK_OVERRIDE=2026-10-17T21:00:00Z mix test <same 3 files>
# → 21 tests, 0 failures

# Full backend suite, unpinned
mix test
# → 2804 tests, 0 failures

# Full backend suite, pinned to 02:00 America/Los_Angeles
OPAL_CLOCK_OVERRIDE=2026-10-17T09:00:00Z mix test
# → 2804 tests, 0 failures

# Full backend suite, pinned to 14:00 America/Los_Angeles
OPAL_CLOCK_OVERRIDE=2026-10-17T21:00:00Z mix test
# → 2804 tests, 0 failures
```

(2804 = the 2799 base tests + the 5 new regression tests.) For
contrast, observed before/during the fix at real wall times: the 3
named failures on the R16 base (Pacific quiet window); a 129-test sweep
subset run at a Tokyo-quiet wall time failing G1, C1–C2 and C4; and the
first post-lib-fix unpinned full run failing Metrics and scenario-7 —
8 distinct tests across those runs, every one a wall-clock artifact of
the same gates. After the pins, all three full runs above are clean. `mix format --check-formatted` passes for every changed file
except `multiuser_pressure_test.exs`, which was already unformatted at
base (left untouched to keep the diff minimal). No compile warnings in
the changed lib files.
