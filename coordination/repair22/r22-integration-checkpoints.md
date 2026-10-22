# Repair 22 integration checkpoints (muse/repair-22)

Base: fd1d34d3 (muse/repair-21 tip). Gates unchanged:
FOUNDER_ACCEPTED = NO. muse/repair-17 never touched. No merge
to any other branch, no production.

## Phase 1 - integration (2026-10-21)

All eight cluster tips verified against the task before merging:
stories f1498418, storytime e40f0bb7, stream 738298b6, places
5ad18dc5, create b65a1b0c, trivia cb589e1b, orbitfix 3056613a,
dock 1589b4ab - every one exact.

Merges in task order, each followed by that cluster's named
tests before proceeding:
1. muse/r22-stories - fast-forward. r22Stories 3/3.
2. muse/r22-storytime - clean auto-merge (C2Home, c2shell.css,
   projections auto-merged). r22StoryTime 7/7, storyPlayback
   9/9, storyViewerTemporality 2/2, stories re-run 3/3.
3. muse/r22-stream - clean auto-merge (c2shell.css).
   r22StreamRhythm 10/10, stories re-run 3/3.
4. muse/r22-places - clean auto-merge (C2Home, C2Shell,
   c2shell.css, projections, shellData, c2Tokens).
   r22Places 16/16 plus stories/storytime/stream re-runs.
5. muse/r22-create - clean auto-merge (C2Home, C2Shell,
   c2shell.css). r21Creation green plus places/stories/
   storytime/stream re-runs: cumulative 51/51.
6. muse/r22-trivia - clean auto-merge (projections, shellData).
   Migration file 20261030030400_add_trivia_correction lands;
   migration files on disk = 120, zero duplicate prefixes.
   r22TriviaCorrection 7/7 (web). Backend trivia test is in
   the Phase 3 battery.
7. muse/r22-orbitfix - clean merge, no shared files with the
   earlier clusters except none in conflict zones.
   r22OrbitContainment 7/7 (web). Backend orbit scope test is
   in the Phase 3 battery.
8. muse/r22-dock - clean auto-merge (c2shell.css).
   r22DockContract plus the full ten-file cluster set re-run
   on the integrated tree: 97/97 PASS (10 files: dock contract, stories 3, storytime 7, storyPlayback 9, storyViewerTemporality 2, stream rhythm 10, places 16, creation 15, trivia correction 7, orbit containment 7).

CONFLICTS: zero textual conflicts across all eight merges.
Every named conflict zone (c2shell.css x5 clusters, C2Home x3,
shellData x2, projections x3, c2Tokens x2, OrbitScreen.css)
auto-merged because the cluster hunks are disjoint. Because
auto-merge can still interleave CSS cascade order silently,
the full cluster test set (which includes the CSS contract
tests: stream rhythm tokens, dock contract, stories grammar)
was re-run on the fully integrated tree as the semantic check,
plus the Phase 2 captures at the glass and the Phase 3 web
full suite matched name-for-name against the R21 baseline.

Phase 1 result: INTEGRATED, no semantic conflict forced a
choice between two clusters' intents; no integration finding
of that species arose.

## Phase 2 - captures on the integrated tip (2026-10-21)

Served build: dist built from ec9f5caa (code tip bf64f4cc plus
the phase 1 records commit only). Every context asserted the
served badge data-git-head-full == ec9f5caa4e09... before any
frame counted; the seed chip reads "seed - ec9f5ca" in frame.
Stack: Phoenix :4024 on fresh DB opal_dev_r22int (120
migrations), static dist :5324. Filed under
shots/repair22/integrated/ - 20 frames, both modes, ZERO
declared-missing in the final set:

- flows-firstpaint-{dark,light}: story rail with the unified
  grammar (Your moment "Live", Maya Torres "Loved") and round
  stones with thin orbit rings + dots on the rings (WS-1/WS-2
  unified at the glass); place stones lead the stream below.
- stream-scroll-{1,2,3}-{dark,light}: scroll sequence at
  0/520/1040px - one rhythm, glow contained in every frame.
- place-stone-{dark,light}: Oceanside Farmers Market stone in
  viewport (energy level "lit", cyan happening fire, audit-
  measured top 208 / bottom 350 in both modes).
- pad-center-{dark,light} + pad-flows-{dark,light}: pad active
  states - Flows lit, Center orb lit, NO selection dot under
  any item (WS-8 at the glass).
- orbit-select-{dark,light}: Orbit (Maya) with the select /
  recommendation state; containment audit on the integrated
  build: panel 20..370 of 390 wide, ZERO out-of-bounds
  children in both modes (WS-9 at the glass).
- create-sheet-{dark,light}: the three marble tense buttons
  (Now / Forecast / Memories, class c2s-create-tense-btn,
  audited in DOM) over Photo or video / Text / Go live /
  Cancel (WS-6 at the glass). Truthful-path note: in the
  seeded world session A's self stone is "happening" (a live
  story with media) and its click opens the story viewer by
  design (openSelf, Hunt-fix B-10 + JA-11, pre-R22 law); the
  create sheet is the same door's no-live-story branch. The
  frames were captured on a bare stack (fresh DB
  opal_dev_r22cap, founder seed never applied, self stone
  audited "quiet" before the click) - the create cluster's
  own capture discipline, on the same served dist.
- trivia-validation-{dark,light}: Know Me? - Maya card with
  both pending guesses and their "That is right" / "Not
  quite" doors (WS-7 at the glass), staged through the real
  product endpoints exactly as the trivia cluster staged
  (relationship upserts 200, guesses 201 x2) after two runs
  proved the card honestly absent from an unstaged world.

## Phase 3 - battery on the integrated tip (2026-10-21)

- Migrations from empty: 120 apply clean, verified THREE
  times on three fresh databases (opal_dev_r22int,
  opal_dev_r22api, opal_dev_r22cap); file count on disk 120,
  zero duplicate prefixes; last migration
  20261030030400_add_trivia_correction (the WS-7 migration).
  R21 was 119; 119 + 1 = 120 as expected, re-derived not
  assumed.
- Backend full suite (R21 leg composition, partitions):
  leg1 822/0, leg2 838/0, leg3 497/0, leg4 1210/0 = 3,367
  tests, ZERO failures (R21 legs: 3,364 + 21 timing-species
  failures; leg4 is +3 = the WS-7 trivia correction tests).
  Extras standalone: r22_orbit_scope + care_rotations
  schedule 13/0. Backend total 3,380 tests, 0 failures. No
  timing-species failures occurred, so no leg/standalone
  failure protocol was needed; nothing was absorbed.
- Watchlist, individually: human_validation 13/0,
  compound_quality 12/0 (the pair 25/25, matching the R20
  reference counts).
- API regression (fresh DB opal_dev_r22api, 120 migrations,
  founder seed, shots/regression/run.mjs): 101/101 PASS.
  Seed-world machine-speak gate: clean (0 hits).
- Typecheck: exactly 9 errors, the identical pre-existing
  set (OpalApp.tsx x3, productClient.ts x5,
  YouSettingsDestination.tsx x1); none in R22 files.
- Mobile (jest, scratch copy of the integrated mobile tree -
  the tree is byte-identical to base; no R22 cluster touched
  mobile): 109/109 tests, 23/23 suites.
- Web full suite: see the phase 3 addendum below (run last,
  on the quiet box).

## Phase 3 addendum - web full suite (run last, quiet box)

Web full suite on the integrated tip: 25 failed / 18 files /
2,212 passed (2,237 total). Name-for-name against the R21
baseline (24 failed / 17 files / 2,137 passed, names in
r21-web-failed-files.txt): all 24 baseline failures fail
identically; exactly ONE new failure, and it is INTEGRATION
FINDING IF-1 (below). Totals grew by 76 tests (the R22
cluster suites + the expanded creation suite).

INTEGRATION FINDING IF-1 - the happening story ring's glow:
the R20 F-10 PIN (r20Connect.test.tsx, founder 2026-10-20)
pins .c2s-stone[data-state="happening"] .c2s-stone-ring at
box-shadow 0 0 14px var(--orb-indicator-happening-glow).
WS-4's glow-containment sweep changed that one rule to
0 0 var(--stream-glow-room) (= calc(--stream-gap / 2) =
8px) - attributed by branch: stream's tip carries the
token, every other cluster's tip and the base carry the
14px literal. The failure is deterministic in isolation
(1 failed / 13 passed in its file). This is a real semantic
collision between WS-4's token law (no stream light past
the token; the rail's ring fell inside its sweep) and a
pre-existing founder-locked treatment - NOT a merge error
and NOT a flake. Per the commissioning rule for semantic
choices, the integrator changed NEITHER side and reports
it by name: the founder's options are (a) exempt the story
ring from the glow-room token (WS-4's charge was about
stream cards), restoring the PIN as-is, or (b) amend the
PIN to the token and accept the 8px ring glow - the
integrated capture set was shot with the 8px value and the
rail reads correctly at the glass, so the pack itself is
the evidence for the choice.

## Phase 4 - records

- Complaint ledger: the R22 round is appended to
  shots/repair19/COMPLAINT_LEDGER.md (every 2026-10-21
  charge as its own row with evidence, F-18 disposition
  pattern; F-18's standing signature check ran on this
  close-out and stays CLOSED) plus the IF-1 addendum above.
- Frame-version audit: the live pack is version-consistent
  at the integrated badge (ec9f5caa) - the 20-frame
  integrated set under shots/repair22/integrated/; cluster
  sets stand at their cluster badges and are never
  presented as integrated frames (full note in the handoff).
