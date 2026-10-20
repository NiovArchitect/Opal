# Repair #19 - Founder Polish Wave - by-name capture campaign report

Worker: integrator's capture worker. Branch/stack: wt-polish tip
ad17cafdadd366825c2e1bd03f2163fe661da7f7, Phoenix :4000 (opal_dev_polish,
OPAL_CLOCK_OVERRIDE=2026-10-20T02:30:00Z) + vite preview :5173.
Destination: shots/repair19/pack-v2/. Manifest:
shots/repair19/pack-v2/POLISH-MANIFEST.md. FOUNDER_ACCEPTED = NO.
No product code was changed (capture scripts + scratch only, under
polish-scratch/). Prose is dash-clean (plain hyphens).

## Outcome summary

The campaign was STOPPED midway by a backend rate limit (see Blocker).
Per the hard-stop rule for 429 responses, no further requests were made
to the stack after the limit was confirmed. All counts below are from
the frames verified on disk (file exists, non-trivial size) and the
capture results log - not from run narration.

Frames SHOT (verified on disk): 26 files covering 13 registry names in
both modes (dark + light each).
Registry groups touched: 65 total; fully or partly shot: A1, A2, B7, B8,
B9 (resting only), D15, E26, E27, E28, E42. Everything else is DECLARED
in the manifest with a reason.

## Counts per section (registry groups)

- A (6 groups): SHOT 2 (home-rest, center-deck-rest). DECLARED 4
  (AT-04 pair, transition pair, toggles, callog glow).
- B (4 groups): SHOT 3 (doorway, scoped, composer-resting). PARTIAL 1
  (composer group: with-text and voice-note states declared).
  DECLARED 1 (callog close-up).
- C (4 groups): SHOT 0. DECLARED 4 (lane absent in seed world - real
  finding, see D-2; doorway downstream).
- D (11 groups): SHOT 1 (private-graphs-gate). CAVEATED 1
  (private-graphs-open frames exist but do not prove the inside state).
  DECLARED 9.
- E (17 groups): SHOT 4 (search-empty, search-results, search-nomatch,
  settings-hub). DECLARED 13.
- F (6 groups): SHOT 0. DECLARED 6 (rig attempt never ran - 429 stop).
- G (3 groups): SHOT 0. DECLARED 3.
- H (8 groups): SHOT 0 valid. DECLARED 8. Two frame files exist under
  density names but show the error state (see D-1) and are declared as
  such in the manifest - they are load-failure evidence, not density
  proof. No fixture harness was built.
- I (6 groups): SHOT 0. DECLARED 6 (staging never ran - 429 stop).

## Blocker (charged, not worked around)

B-1 RATE LIMIT: the backend returns 429 rate_limited with
retry_after 3600 on product API calls (verified directly:
GET /api/v1/product/opal/plans?status=all via both :4000 and the :5173
proxy returns 429; the founder-seed endpoints also returned 429 on a
re-provision attempt). The throttle bucket was consumed by the pinned
backend battery plus repeated session provisioning and capture passes
on the shared stack. Consequence at the rendered layer: the Graphs
surface renders "Graphs did not load. Check your connection and try
again." with lens counts All 0 / Action 0 / Ready 0 / Past 0, which
blocks every Graphs-dependent frame (D16-D21, G49-G51, H52-H59,
I60/I64 via detail). Unblocks: wait out the retry window (1h from the
last confirmed 429, approx 05:35Z) and re-run the declared groups with
a single provisioned session pair and no re-seeding.

## Defects noticed while shooting (charged, not fixed)

- D-1 (rendered-layer load failure under throttle): when the plans API
  429s, Graphs shows a generic connection error and zero counts instead
  of any cached or partial state. Honest as an error, but it takes the
  whole surface down; the lens pills reading "All 0 / Past 0" next to
  the error could be misread as an empty account. Frames:
  density-graphs-all-dark.png (retained as evidence).
- D-2 (P1 lane absence in the founder-seed world): Center deck NEEDS
  YOU cards render Confirm / Dismiss only - no "Request a change" lane
  button on any card, and none on the thread strip or chats rows (47
  chats rows probed). Per polish-cards-report.md the lane needs a
  responding-state card whose parties carry availability windows; the
  seed world contains none, so the P1 surface is unproven at the
  rendered layer and the founder cannot see it in this pack. The P5
  "Opal's pick" micro-label IS present on the lit deck card.
- D-3 (self-referential card title): the lit NEEDS YOU card is titled
  "Plan with Ethan Walker" - for Ethan Walker himself. A needs-you card
  naming the viewer as the other party reads as machine-speak.
  Frame: center-deck-rest-dark.png.
- D-4 (dev badge overlaps composer): in thread frames the "seed -
  ad17caf" chip sits on top of the composer input's placeholder text.
  Expected in walk builds, but it lands on the one input the founder
  is asked to judge. Frame: composer-resting-dark.png.
- D-5 (Home/Center duplication): home-rest and center-deck-rest are
  near-identical frames - the Home tab and the Center dock render the
  same opening surface, so the registry's two at-rest frames cannot
  show two distinct rest states.
- D-6 (private gate copy vs registry): the gate's helper line says
  "Enter your passcode to open this area." - the registry frame spec
  asks for a passcode field with "no lock wording"; passcode wording
  is present (no lock icon wording seen). Minor; charged for the
  polish owner to rule on. Frame: private-graphs-gate-dark.png.
- D-7 (unlock not proven): after entering 2468 and tapping "Open
  Private graphs", the captured frame still shows the gate area and a
  DOM probe read the unlock as incomplete. Either the unlock needs a
  longer settle, the button enables only on a full field event the
  fill did not fire, or the unlock failed silently. Needs a dedicated
  look on an unthrottled stack; the inside state is declared, not
  claimed.

## Seed arrangements made (exact)

- Founder seed applied ONCE for session A (+12025550101, Ethan Walker)
  through the backend seed endpoints (POST /dev/founder-communication-seed
  and /dev/founder-graph-commitment-seed, both 200) via the regression
  harness runFounderSeed. The machine-speak gate in the rendered harness
  passed (no hits).
- Sessions A and B provisioned synthetically through the activation API
  (deterministic synthetic codes). Later passes reused the same accounts
  with seeding OFF to avoid re-seed throttling.
- Passcode 2468 verified against the seed code path in tests
  (orbitVerifyContract.test.ts, r19Graphs.test.tsx) before vault frames.
- NO etiquette plan was created, NO availability arrangement was made,
  NO call was placed, and NO database rows were edited by hand. The
  API staging steps for sections C and I and the Section F rig were
  scripted but never executed because the 429 stop came first.
- The pinned backend battery leg had finished ("Finished in" present
  in battery-backend-pinned2.log) before any frames were shot.

## Method notes

- playwright-core + the cached Chromium (chromium-1248), phone viewport
  390x844 at deviceScaleFactor 2, colorScheme + theme localStorage set
  per mode; the resolved data-theme matched the mode in every shot
  frame, and the git stamp read ad17cafd in every shot frame. The dev
  badge chip is visible in 20 of 26 shot frames; the 6 search frames
  sit on the full-screen search surface, which does not render the
  chip (provenance there is the git stamp alone).
- Long-press method (ready, not exercised on a card): pointer hold
  850ms against LONG_PRESS_MS=500 from CardContextMenu.tsx, with the
  card-context-menu testid as the success probe.
- Spot-checks read by the worker: center-deck-rest-dark.png,
  composer-resting-dark.png, density-graphs-all-dark.png,
  private-graphs-gate-dark.png.
- Caution for the integrator: two background run-log deliveries during
  this campaign narrated shots that do not exist on disk. Only the
  manifest + this report's disk-verified counts should be trusted.

## Recommended next run (after the throttle window)

1. One session pair, no re-seed; start with Graphs-dependent groups
   (D16-D21, H via the fixture harness, G49) while the bucket is fresh.
2. Arrange the P1 lane world via API (responding plan + availability
   windows) and shoot C11-C14 before anything throttles again.
3. Stage the etiquette plan (1h window) at the START of the run so the
   fork/closure stages can be captured at the END of the same run.
4. Run the Section F calls rig early (two contexts) for F43-F48.
5. Use c2-you-nav-row-* testids for the You filed panes (A5, E37-E41).
