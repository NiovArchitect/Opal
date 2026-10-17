# Repair #15 — TEST REPORT (coordinator, integrated tree)

Branch: `muse/repair-15` · Base: Repair #14 tip `025a0289` · Date: 2026-10-16
Integration: five worker branches (a, bc, df, e, gh) merged with ZERO
conflicts. All numbers below were re-run by the coordinator on the merged
tree, solo, with full output captured — not copied from worker reports.

## Backend (Elixir, `mix test --seed 0`)

- **2,713 tests, 0 failures.** Baseline was 2,655 / 0. Delta = +58 new tests,
  accounted exactly: +20 BC (family + progressive profile), +11 E
  (story/post), +27 GH (canonical venue + proactivity).
- Every repair11–repair14 test file is inside that 2,713 and green —
  including R14's 24 relationship journeys, extended (not replaced) by BC's
  subtype coordination proof: the R14 1:1 lifecycle produces ONE identical
  summary across all 8 family subtypes + plain family.

## Web (Vitest, full suite, same command both trees)

- Baseline (pristine `025a0289` scratch worktree): **1,081 tests, 25 failed.**
- Integrated `muse/repair-15`: **1,116 tests, 25 failed** — +35 new tests
  (8 OTP autofill, 11 story/post, 13 connected sources, 3 social-direction
  guards), ALL green.
- The 25 failing test names were extracted from both runs, sorted, and
  diffed: **byte-identical sets.** All 25 are pre-existing failures in areas
  no R15 track touched (activation, waveB exact-authority, graphScroll,
  technicolor, graphDetail, …). Zero new web failures.
- Note on worker-report variance: one worker's interim count (15 web
  failures) came from a partial-scope run; the full-suite invariant — 25,
  name-identical — was independently established by two workers and
  re-verified here on both trees.
- `tsc --noEmit`: 7 errors before and after, identical pre-existing set,
  none in touched files (per DF/E reports).

## Mobile (Jest, full suite)

- Integrated tree: **105 tests, 104 passed, 1 failed** — the single failure
  is the pre-existing `pushTokenBridge` app.json expo-notifications issue,
  failing identically at baseline (101 passed / 1 failed / 102). Delta = +3
  new OTP-autofill tests, green.

## Spot checks by the coordinator (merged tree, by hand)

- `fr-code-input-bridge` (the invisible OTP overlay): 0 occurrences in
  styles.css and FirstRunExperience.tsx — gone.
- `canonical_from_text` in conversation_alignment.ex: gone.
- All eight evidence files present under shots/repair15/.

## Honest caveats

- One worker (E) observed a single unnamed failure in ONE full-suite run
  executed while several workers were running suites concurrently against
  the shared Postgres test DB; two subsequent full runs (theirs, and the
  coordinator's solo run above) are 0-failure. Recorded, not hidden.
- Device behavior (iOS one-tap code suggestion) is machine-proven at the
  attribute/DOM level only. Phone proof belongs to the founder's walk.
