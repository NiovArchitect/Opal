# Repair #17 — Test Report

All gates below were run BY THE COORDINATOR on the integrated
`muse/repair-17` tree (seven track branches merged with zero conflicts),
not inherited from worker reports. Toolchain: workspace Erlang/OTP 25 +
Elixir 1.17.3, Postgres 16, `MIX_DEPS_PATH=~/workspace/opal_deps_w1`.

## Backend — full suite, three clock conditions

| Run | Command condition | Result |
|-----|-------------------|--------|
| Unpinned (real clock) | `mix test` | **2,820 tests, 0 failures** |
| Faked 02:00 America/Los_Angeles (quiet hours) | `OPAL_CLOCK_OVERRIDE=2026-10-17T09:00:00Z mix test` | **2,820 tests, 0 failures** |
| Faked 14:00 America/Los_Angeles | `OPAL_CLOCK_OVERRIDE=2026-10-17T21:00:00Z mix test` | **2,820 tests, 0 failures** |

Baseline was 2,799 tests with 3 clock-dependent failures. The suite now
contains every Repair #11–16 test file (they are part of the 2,820), so
the full-suite runs ARE the R11–16 re-run. Targeted re-runs during
integration: W4 flows + W4 API + W3 HomeProjection + W1 quiet-hours +
conversations = 35 tests, 0 failures; after the integration clause-order
fix, the API + conversations files re-ran 11 tests, 0 failures.

## Integration reconciliation (coordinator's own changes)

W5's web client assumed REST session routes; W4's backend shipped
action routes. Reconciled in the single isolated client block
(`productClient.ts`): list → `GET /opal/conversations` (unchanged);
new → `POST /opal/conversation/new`; open/switch → `POST
/opal/conversations/:id/switch`; session message → `POST
/opal/conversation/messages` with `conversation_id`; clear → `POST
/opal/conversation/clear` with `{conversation_id}`. Backend gained the
`last_message_preview` field on session rows (the drawer's labeling
contract), asserted over HTTP in `repair17_w4_api_test.exs`.

## Web

`vitest run`: **1,182 tests, 24 failed**. Failing-test names extracted
via the JSON reporter and diffed against the pristine R16 baseline list
(`web-failures-pristine-r16.txt`, committed by W2):
- **New failures: 0.**
- **Baseline failures fixed: 1** — `s1Adversarial` "no old opposing-arcs
  mark in first-run source", lawfully resolved by the W7 splash fix.
Typecheck (`tsc --noEmit`): 4 errors (baseline 7; the seed-layer
deletion removed 3), **0 in R17-touched files**.

## Mobile

`jest`: **105 tests passed, 22/22 suites** — the long-standing
pre-existing failure (app.json `expo-notifications` declaration, fixed by
W7) stays fixed on the merged tree.

## Compile warnings / precommit

Per the opal_core house rule, `mix precommit` was run. Its
`compile --warnings-as-errors` step fails on the PRISTINE BASE as well:
48 warning sites on base, 48 on the merged tree (per-file counts
identical). The integration initially added 2 (a clause-grouping warning
in `opal_conversations.ex` — the coordinator's own edit, helpers inserted
between `list_sessions/1` clauses); fixed by relocating the helpers, and
the file now compiles with 0 warnings. **R17 adds zero new warnings.**
`mix format --check-formatted` passes on the integration-edited backend
files. The pre-existing 48-site warning debt is recorded here honestly:
precommit cannot go fully green until that debt is paid, which is a
separate, codebase-wide cleanup — not an R17 regression.

## Per-track verification (from track reports, spot-checked at merge)

- W1 clock: suite 0 failures in both pinned windows on its branch;
  reproduced by the coordinator on the merged tree (above).
- W2 seed kill: guard tests (15) + adversarial open-person matrix (11)
  + Center plan-surface (2); web failing names byte-identical on branch.
- W3 UI: 12 new integrity tests; backend projection tests (could not run
  on the worker's PATH) run by the coordinator — green.
- W4 flows: 7 items with diagnosis + tests (`repair17_w4_flows_test.exs`,
  `repair17_w4_api_test.exs`); two-user distinct-session harness for the
  change-time flow.
- W5 surfaces: 14 session-UI tests; strip/settings suites green.
- W6 character: 20 presence tests incl. reducer fuzz.
- W7 splash/TestFlight: `splashCanonLockup.test.ts` (6); mobile 105/105
  on branch and on merged tree.

## Adversarial coverage (new surfaces)

Session clear races and cross-account switch/clear probes (404, victim
data intact) — W4 API tests. Double new-chat and session list isolation —
W4 context tests. Fuzzy-name abuse (stop words, day/cuisine/meal words
rejected as venues) — W4 item 5 units. Mid-flow topic switch (answer
consumption vs re-engagement) — W4 item 2/3 sequences. Open-person
seed-id minting matrix — W2. Presence-state manufacture fuzz — W6.
