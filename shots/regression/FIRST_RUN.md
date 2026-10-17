# Repair #18 regression suite - FIRST RUN

Tests first, on purpose: the F18 cases were written against the
Repair #17 tip and run against it before any Division A/B/C fix. A
FAIL here means the defect reproduced at the real API path - the
assertion failed on the product output, not on the harness. A case
that could not execute would be recorded as a harness issue instead;
there were none in this run.

## Run identity

- Date: 2026-10-17 (America/Los_Angeles)
- Code under test: origin/muse/repair-17 tip 1892e5d6 (the
  coordinator's muse/repair-18 branch did not exist on origin when
  this worktree was created; the suite branch muse/r18-suite is based
  on the R17 tip, per the fallback in the task assignment)
- Stack: local backend from this worktree (MIX_ENV=dev, Postgres 16,
  dedicated database opal_core_dev_r18suite), served at
  http://127.0.0.1:4000 - the API-level subset path documented in
  README.md. The staging (Mac walk stack) run remains the handover
  gate; this run proves the cases execute and fail for the right
  reasons.
- Sessions: two distinct synthetic-provisioned sessions
  (OPAL_SESSION_PROVISION=synthetic, fixture numbers +12025550101 /
  +12025550102), plus fresh pairs +12025550105 / +12025550106 where a
  case isolates itself.
- Seed mode: on (founder communication seed + graph commitment seed
  both returned 200 for session A).
- LLM: no OPAL_LLM_API_KEY in the local server env - the same
  condition the Mac walk evidence showed (0 provider calls). See
  FR-18-03.
- Runner exit code: 1 (at least one FAIL), 1 of 6 cases PASS.
- Full machine output: shots/regression/results.json from this run.

## Per case

### FR-18-01 duplicates - FAIL (defect reproduced)

- Human thread open (messages + alignment read): opening a seeded
  conversation created 1 plan (expected 0). The alignment fold mints a
  plan on open, exactly the founder symptom.
- POST /opal/plans dedupe: creating the same Center intent twice
  returned two different plan ids (no dedupe without a decision_id).
- GET /opal/plans Graphs read-back: the same dinner intent across
  creation paths produced 3 distinct plans (expected 1).

### FR-18-02 double-booking - FAIL (defect reproduced)

- POST /opal/plans response: the overlapping create carried no
  conflict / double-booking flag.
- GET /opal/plans: neither overlapping plan entry carries a flag.
- Passing legs, for the record: the Center disambiguation leg passed
  (the Center resolver asked a question and mutated nothing) - the
  one ambiguity-aware resolver in the codebase works; the create-time
  flag exists nowhere.

### FR-18-03 Center LLM engagement - FAIL (defect reproduced)

- The stored reply to "what city am I currently in?" is the literal
  template deflection, with metadata llm_called=false and
  draft_source="template" - the founder walk's exact evidence,
  reproduced from the stored message read back through
  GET /opal/conversation.
- Same for the rest of the corpus ("what is two plus two?" also
  deflected; metadata template on every turn).
- No-grant leg: the answer never honestly states location is unknown.
- Grant legs: after POST /opal/location grants for San Diego and
  then Los Angeles coords, the answer still names neither city - the
  deflection both times (no grounded location path exists).
- Environment note: with no LLM key in the server env, R17 code
  cannot produce llm_called=true, so this case cannot distinguish
  "key missing" from "code never engages" in this run alone. The
  metadata proves the walk condition; the Division A fix must re-run
  this case on a stack with the key present (name only) as T1 of
  track-intelligence.md designs.

### FR-18-04 attendance agreement - FAIL (defect reproduced)

Setup ground truth from the graph commitment seed payload: 2 going
of 6 total; after the viewer's accept-going through the real path,
3 of 6.

- GET /opal/plans (Graphs): carries no attendance count at all -
  before or after the RSVP change.
- GET /conversations plan_projection (Chats list): no attendance
  count - before or after.
- GET /conversations/:id/alignment (thread): no attendance count -
  before or after.
- Passing surface, for the record: GET /journeys/:id DOES carry the
  real counts and moved 2 of 6 to 3 of 6 with the flip - proof the
  harness reads counts where they exist, and that the one real
  counter is wired to exactly one surface (track-attendance.md H2).

### FR-18-05 switch counts + chat separation - PASS at the API level

72 checks passed: 20 deliberate switches among 3 distinct Center
chats returned only the target chat's messages every time (no
blending), the harness issued exactly one switch POST per deliberate
action, repeated same-id opens mutated no session row (updated_at,
archived_at and list order identical), reads mutated nothing, and
every session carries a distinct label plus a title on the switch
response.

Caveat, stated plainly: the founder's 47-switch storm is a CLIENT
behavior (the OpalCenterChat poll POSTing switch to "read"). The
server contract this case can assert passes on R17 - a same-id
switch is a no-change update server-side. The browser-level poll
count (request interception on the real client) is the remaining
leg of this case and plugs into the same case file when the suite
runs against the full staging web stack; it is not proven by this
run and must not be reported as proven.

### FR-18-06 revision read-back - FAIL (defect reproduced)

Two flows ran:

- Walk pair (the seeded sessions): the proposer's change send was
  throttled (429) before the flow could start. Adjacent defect,
  recorded here for the coordinator: the founder seed itself
  consumed the viewer's entire non-contact spam bucket during
  provisioning (rate_limit_buckets shows spam:<viewer> at 10 hits,
  window opened at seed time; the viewer's own first human message
  in FR-18-06 was hit 11). The 429 itself was honest and retryable
  (error_code rate_limited with retry guidance) - that sub-assertion
  passed. Belongs with the FR-12-02 throttle variant: a throttled
  first send must be visibly retryable, and seed provisioning should
  not burn the budget it then throttles.
- Fresh pair (isolated accounts, the flow completed): after
  "let's change dinner to 8 PM" -
  - GET /conversations/:id/alignment: NO pending change
    representation at all (no change_proposal, no pending_revision).
  - GET /opal/plans: the plan already read 8:00 PM BEFORE the other
    party confirmed - the change applied directly with no pending
    state, so "stays at 7:30 until they confirm" does not hold on
    the real thread path.
  - After "confirm 8 PM": the proposer's listing and the thread
    alignment read 8:00 PM, but the confirmer's plan listing entry
    carries no time_label for the plan, and BOTH parties' Chats-list
    plan_projection fail to read 8:00 PM.
  - GET /conversations/:id/messages signals + chronology (the
    bottom-of-screen copy) still present 7:30 PM as current after
    the confirm, and still after an unrelated follow-up message.
  - Now strip leg: not assertable in this run - the Thursday-labelled
    plan does not project into the calendar/today window; recorded as
    a note in results.json, not counted as a pass.

## Harness issues

None. Every case executed; every failure above is an assertion
failure naming the surface whose API output was wrong, missing, or
stale. Two harness defects were found and fixed during bring-up and
are recorded so they are not mistaken for product results: OTP
consent fields and per-provision device labels in synthetic session
provisioning (a reused label returns the consumed challenge, 409
replay).

## What this run does not prove

- Nothing about the web client's rendering: these are API-contract
  cases (the output the surfaces render). Browser-level legs
  (FR-18-05 poll count, pill containment, layering, colors) plug
  into the same runner against the staging web stack.
- The phone-checklist cases (FR-05-02, FR-11-07, FR-06-03, FR-15-02,
  plus the A+P visual legs) are untouched by this run and stay on
  the founder phone checklist by name - see CASE_INDEX.md.
- The suite assumes a fresh stack per run (stateful seeds and
  throttle buckets make re-runs against a dirty stack
  non-deterministic, the same constraint the founder walk has).
