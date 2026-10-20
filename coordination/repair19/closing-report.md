# Repair #19 - W28-CLOSE report (2026-10-19/20)

Final battery, verified push, pack recapture, and records close-out
for the integrated Repair #19 delivery: W21 pack fixes + W24
differentiation (DL-01..DL-14) + W25 functional fixes (FA-01/FA-02) +
W27 ambient fixes (AT series), on final tip `95319bd7`.

## 1. Final tip and push proof

- **Final tip:** `95319bd734e8e487dd450650c66d7378b9dbf921` on
  `muse/repair-19` (integration worktree `wt-repair18`).
- **Pushed commit:** `60d6f8b06486a9abe8f766c4d25cc2b50ebc20be`
  (established API mirror method, `mirror_push2.py`; 51 changed paths
  over the previous remote head `e1154696`).
- **Tree proof:** local tip tree
  `62a6149a3f4a020a597e87e095d36257f6c6217f` == pushed commit's tree,
  read back independently through the GitHub API (remote ref
  `muse/repair-19` = `60d6f8b0`, its commit tree = `62a6149a`); the
  push script's own entry-by-entry verification printed
  `VERIFIED: remote tree == local tree (7022 entries)`.
- Log: `w28-scratch/logs/mirror-push.log`.

## 2. Final battery - verbatim results (on tip `95319bd7`)

All legs run strictly serially. Logs in `w28-scratch/logs/`.

| Leg | Result |
|---|---|
| Step zero - fresh-DB migrate (`opal_dev_r19w28`) | **113 migration files = 113 schema rows, max version `20261030010002`; both R19 legs present** (`dev-migrate.log`) |
| Backend, unpinned (`mix test`, `opal_test_r19w28`) | **3224 tests, 0 failures** (141.8s; `backend-unpinned.log`) |
| Backend, governed clock pinned 14:00 America/Los_Angeles (`OPAL_CLOCK_OVERRIDE=2026-10-18T21:00:00Z`) | **3224 tests, 0 failures** (146.3s; `backend-pinned1400.log`) |
| API regression (fresh dev DB, human seed world, run tag "with everyone after the market") | **101/101 PASS; seed world machine-speak gate: clean (0 hits)** (`api-regression.log`) |
| Web suite | **Test Files 16 failed / 211 passed (227); Tests 23 failed / 1750 passed (1773)** - the failing set is **exactly the baseline 23 tests / 16 files**, verified name-for-name (activation, availability, designTokens, firstRun, authorityRejectedStates, grammar, graphCalendaring, graphDetail, graphScroll, graphSpine, liveJourneyProof, pasteW4DeviceFixes, waveBChatsExact, waveBGraphsExact, waveBHomeExact, technicolorProduction) (`web-suite.log`) |
| Typecheck (`npm run typecheck`) | **exactly 9 pre-existing errors, zero delta** (3x OpalApp.tsx, 5x productClient.ts, 1x YouSettingsDestination.tsx) |
| Build (`npm run build`) | **green** (`built in 4.24s`; the `VITE_OPAL_SHELL=c2` pack build also green) |
| Mobile suite (`apps/opal_mobile`) | **105/105 tests, 22/22 suites PASS** (`mobile-suite.log`) |
| Pattern posture (`node scripts/pattern_posture.mjs`) | **TOTAL 115**: MP-1 0, MP-2 81, MP-3 0, MP-4 0, MP-6 26 - all exact baseline; **MP-11 11 -> 8** (`posture.log`) |

**Posture note (the one deviation from the brief's expected figure):**
the brief expected 118 total (the W11 figure). The measured total is
115 because W27's AT-09 removed the three decorative canon-hue files
that made up 3 of MP-11's 11 hits. No line rose; the gate's own law
is "counts trend to zero; a regression is a rise." The battery
therefore holds its floor, and the -3 is recorded here and in
`WALK_ACCEPTANCE.md` section 6 rather than silently absorbed.

No leg fell below its floor; the push proceeded.

## 3. Recapture inventory (Pack V2, final tip)

Recipe: Phoenix from the final tip on :4000 (`opal_dev_r19w28`,
pinned clock, synthetic verify) + the `VITE_OPAL_SHELL=c2` build
served on :5173; headless Chromium 390x844; fresh synthetic review
accounts in the human seed world; run tag "with everyone after the
market"; both modes. Every frame below is stamped `95319bd7` in its
manifest surface record. Manifest: `shots/repair19/pack-v2/manifest.json`
(header now carries tip / pushed commit / tree + a `w28_recapture`
block with per-frame records and declarations).

**Replaced on the final tip:**

- `home-dark/light.png` - W27 ambient: state borders in the canon
  family, fire scarce, Home lit coalescence.
- `center-deck-dark/light.png` - W27 ambient state register.
- `thread-dark/light.png` - Chanelle Brooks thread: header tie
  "Partner" (DL-14; probe: headerText carries the tie,
  `yourMove: true` in both modes); YOUR MOVE resting frame.
- `person-profile-dark/light.png` - tie line singular + "In your
  close circle" + "Who they are to you" row (W24).
- `graphs-list-dark/light.png` - cards name people via `who_label`
  + state edge (DL-06 / AT-13).
- `graph-detail-dark/light.png` - roster who-ties rendered
  (probe `whoTies: ["- Close friend"]`; Maya Torres - Close friend).
- `chats-list-dark/light.png` - tie cues beside names (Maya - Close
  friend, Chanelle - Partner, Sabrina - Friend, Alex - Business);
  FA-01 search field visible (probe rows=11, searchVisible=true).
- `orbit-private-gate-dark/light.png` - **FA-02 on the final tip:**
  the unlock prompt is a full fixed overlay (probe `promptRect y=0,
  h=844`), input hittable=true, submit hittable=true, both modes.
  Visually verified: "Jordan Ellis is private" card with passcode
  field and "Set passcode and open". The unlock prompt open state IS
  the private gate on the final tip; the recipe does not separate a
  second prompt frame.

**New frames:**

- `person-identify-picker-dark/light.png` - the identification
  picker OPEN: progressive-depth type-list face (question + seven
  human-word choices + the quiet close-circle row).
- `person-identify-family-dark/light.png` - the Family subtype face,
  opened live through the picker.
- `person-profile-family-dark.png` - Jordan Ellis's profile reading
  **"Family - Sibling"** + "In your close circle" + "Tap to change"
  after the live picker set (Family -> Sibling -> Save) on the
  capture account - the product-path proof W24 required. Visually
  verified.
- `thread-family-dark/light.png` - Jordan's thread after the live
  set (the light frame from the +12025550111 set; the dark from
  +12025550101).
- `chats-list-filtered-dark/light.png` - FA-01 exercised: the
  "Jordan" query narrows the list in place (probe: exactly the two
  Jordan rows remain).
- `chats-new-picker-dark/light.png` - the new-chat picker populated
  from the one people universe, with tie sub-lines (Business /
  Partner / Close friend / Friend). Both visually verified; the
  first light take caught the sheet's loading empty state and was
  re-shot populated rather than shipped misleading.
- `thread-ignition-dark.webm` - motion (CDP screencast, VP9, 100
  frames, 4.16s): the lit reveal's mount ignition (AT-04) on thread
  open; the capture probe records `yourMovePresent: true`.

**Declared not recaptured (in the manifest, with reasons):**

- `orbit-sheet-dark/light.png` - remain the W11 captures. Six W28
  attempts (gate unlock flow + group expansion, both modes) could
  not reach the sheet: the Center conversation navigator never
  appeared within polling windows on the shared, contended capture
  stack (measured API accept latency up to 26s under sibling
  test-suite load). The W24 orbit tie is proven by the diffix test
  pins; the FA-02 gate guarding the sheet IS recaptured above.
- `person-profile-family-light.png` - NOT shipped. Two in-run light
  attempts opened the picker and the subtype face (captured), but
  the Save click produced no PUT on the capture stack and the tie
  never read back in-run; the unverified file was deleted rather
  than ship an unset profile under a family name. The same path
  verified in both modes earlier the same day on the +101/+111
  capture accounts (capture-log profile text "Family - Sibling /
  In your close circle" recorded in both modes), the dark frame is
  verified above, and `thread-family-light.png` stands from the +111
  set.
- Live remote-crossing motion (AT-03 repaint / AT-05 dock echo
  driven mid-screencast by a second acting account) - not drivable
  in the one-account browser recipe; declared instead of staged.
  AT-03's live repaint stands on W27's channel wire + tests.
- Jordan's "Family - Sibling" chats-row cue does not appear in the
  final `chats-list` frames: those were shot on the seed-ties
  account (+12025550121), the live set on +101/+111 (whose light
  list probe did record "Jordan Ellis - Family - Sibling"). The
  seed deliberately carries no family tie (W24 DL-13: a seed family
  row breaks FR-B3-01's sweep world; recorded in
  `human_seed_world.ex`).

**Environment note:** the capture ran on a shared VM under sibling
test-suite load with repeated stack reaps (the /tmp deps loss, two
Postgres cluster deaths, wedged Phoenix beams holding :4000 with
dead DB pools, and one full service restart). All recoveries used
persistent dirs (`~/workspace/.opal_deps_r19`,
`~/workspace/pgdata-fafix`, `w28-scratch/`). No frame was accepted
from a degraded stack without its probe agreeing.

## 4. Records checklist (Step 4)

- [x] `shots/repair19/WALK_ACCEPTANCE.md` - section 6 W28 closing
  block appended: DL-01..DL-14 dispositions (FIXED per W24;
  remainders DL-05, DL-09-write, DL-10, DL-11 named), FA-01/FA-02
  FIXED with W25 evidence, AT dispositions (fixed per W27; AT-11
  declared legacy-unmounted; AT-16/17/18 rulebook dispositions),
  gate frames present, final battery + pushed SHA summary. No prior
  verdict rewritten.
- [x] `shots/repair19/COMPLAINT_LEDGER.md` - FA-01/FA-02 rows in
  section P carry their appended FIXED resolutions (W25 commits,
  pins, W28 frame names); new section DL (DL-01..DL-14) and section
  AT (AT-01..AT-18) entered with matching dispositions.
- [x] `coordination/repair19/functional-accountability.md` -
  RESOLUTION addendum appended: FA-01/FA-02 fixed by W25 (fafix
  proofs + frame names cited), AT fixes by W27 cited; the
  statement's verdicts stand as the pre-fix record.
- [x] `coordination/repair19/closing-handoff.md` - FINAL block
  appended: final tip + pushed SHA + tree proof; battery summary;
  the AMBIENT TRUTH STATEMENT in post-fix truth (A1 converged +
  live repaint, A2 ignition event + dock tint, A3 orb rests
  state-keyed, A4 one family + fire scarce, A5 coalescence cap, A6
  as audited) with the pointer to `ambient-rulebook.md` as a
  delivery design-note artifact; founder-gated list
  UNCHANGED-PLUS-DELTAS (existing list + DL-05 remainder, DL-10
  People hub, DL-09 write leg, DL-11 serving leg, AT-11 legacy
  erasure, J2 Live, J5 edit, BS-06, F-16 live transcription, JA-13
  mobile, the 36 retrospective widenings); gates line unchanged.
- [x] `shots/repair19/pack-v2/manifest.json` - header updated (tip
  `95319bd7`, pushed `60d6f8b0`, tree `62a6149a`, badge
  `seed - 95319bd`) + `w28_recapture` block (replaced list, new
  frames, declared-not-recaptured with reasons, capture accounts,
  environment note).

## 5. Gates

**FOUNDER_ACCEPTED = NO - FREEZE = HOLD - PASS2 = NO -
FOUNDER_PHONE_PASS = NOT_CLAIMED.** No merges to protected branches;
`muse/repair-17` untouched; no walk link issued - the founder
reviews the pack first.
