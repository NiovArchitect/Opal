# Repair #22 - R22-A (Stories) proof record

Branch: muse/r22-stories
Build commit under proof: 754ad21a2b874bddd14a53d4d10d16dfea3a68a6
Recorded by: R22-A finisher, second attempt (proof phase remainder)
Date: 2026-10-21

## What the build commit does (diff read, 4 files)

- apps/opal_web/src/c2/shell/C2Home.tsx - MomentStones rail:
  a closed STONE_STATE_WORD map and an orbit layer on every stone.
- apps/opal_web/src/c2/shell/c2shell.css - orbit animation by
  data-state, caption metrics, reduced-motion rest rule.
- apps/opal_web/src/c2/shell/projections.ts - comment only:
  liveStoryLabel is no longer rendered by the rail.
- apps/opal_web/src/c2/shell/r22Stories.test.tsx - new pins (3 tests).

## WS-1 - one caption grammar

Every rail cell, the self door included, renders exactly two lines:

- Line 1: the NAME (the person; the self door reads "Your moment").
- Line 2: exactly ONE state word from the closed vocabulary,
  mapped 1:1 from the stone state:
  happening -> Live, loved -> Loved, new -> New, seen -> Seen.
  The self door with no live moment reads Add; a live self
  reads Live, the same word a live person wears.

The free-text liveStoryLabel no longer reaches the rail, and
"Live now" no longer appears as a rail caption (it survives only
on the separate Flows live card pill, which is not a rail caption).
Caption metrics are uniform on every cell: name is caption size,
semibold, ink-1; the state word is 11px / 14px line-height,
medium, ink-2, fixed line-heights so no cell rides higher.

## WS-2 - ring-motion rule

What moves: a single point of light (the .c2s-stone-dot) on an
orbit layer (.c2s-stone-orbit) that rotates around the stone ring,
transform-only, in the brand orb's language (rings rotate with
dots riding them). The marble ring material itself stays frozen.

When / what it means, one sentence: the faster and brighter the
light travels, the more alive the moment.

- happening (Live): orbit 7s, dot full opacity, point-light glow.
- new (New): orbit 26s, dot opacity 0.85, violet.
- loved (Loved): orbit 44s, dot opacity 0.55, ring-metal.
- seen (Seen) and the empty self door: no animation, dot hidden;
  there is nothing alive or unread left to attend to.

Reduced motion: under prefers-reduced-motion the orbit animation
is none for every state; the dot rests at the top of the ring
(exactly where the pre-R22 frozen point sat) and the ring material
plus the caption word carry the identical state meaning statically.
State also rides data-state on every stone, so the meaning never
depends on motion.

## Test results at 754ad21a

Focused suite (run by this finisher):
- src/c2/shell/r22Stories.test.tsx: 3 passed, 0 failed.

Typecheck (run by this finisher, tsc --noEmit): exactly 9 errors,
identical to baseline, none in the R22-A files:
- src/OpalApp.tsx: 3 x TS2345 (lines 3925, 9910, 9948)
- src/api/productClient.ts: 5 (TS2300 plan_type / online x4,
  TS2717 plan_type x1; lines 5667, 5668, 5710, 5712)
- src/opalUi/YouSettingsDestination.tsx: 1 x TS2339 (line 1352)

Full web suite (run by the first finisher at this same tip,
fullsuite-finisher.log in the R22-A scratch): 24 failed /
2140 passed, 17 failed files - counts identical to the stated
baseline. Failed files, name-for-name:
src/activation.test.ts (3), src/availability/availability.test.ts (1),
src/c2/r20CardMenu.test.tsx (1), src/designTokens.test.ts (1),
src/onboarding/firstRun.test.ts (1),
src/opalUi/authorityRejectedStates.test.ts (1),
src/opalUi/grammar.test.ts (1), src/opalUi/graphCalendaring.test.ts (2),
src/opalUi/graphDetail.test.ts (1), src/opalUi/graphScroll.test.ts (2),
src/opalUi/graphSpine.test.ts (1), src/opalUi/liveJourneyProof.test.ts (1),
src/opalUi/pasteW4DeviceFixes.test.ts (2),
src/opalUi/waveBChatsExact.test.ts (3),
src/opalUi/waveBGraphsExact.test.ts (1),
src/opalUi/waveBHomeExact.test.ts (1),
src/theme/technicolorProduction.test.ts (1).
None is an R22-A file; r22Stories.test.tsx passes inside the run.
Delta vs baseline: zero new failures, zero fixed.

## Captures (outside git, listed here and in the report back)

Directory: ~/workspace/opal-graph/shots/repair22/stories/
- flows-stories-dark.png - captured by the first finisher;
  badge in frame reads "seed - 754ad21" (the 754ad21a tip).
- story-rail-dark.png - same run.
Remainder (light rail, motion webm, reduced-motion still) is
captured after this records commit and listed in the finisher
report back; any frame that cannot be captured truthfully is
declared there with its reason.

## Gap check vs WS-1 / WS-2

No gap found in the rail itself: one MomentStones component is
the only rail renderer, the grammar map is closed, every stone
carries the orbit layer, and the reduced-motion rule rests the
orbit. No follow-up fix commit was needed.

## Finisher annotation (second attempt, same day) - captures complete

All owed frames are now captured at the 754ad21a build (badge in
every Flows frame reads "seed - 754ad21"):

- flows-stories-dark.png / story-rail-dark.png (first finisher)
- flows-stories-light.png / story-rail-light.png (this finisher)
- ring-orbit-dark.webm - motion proof, dark: the live orbit's
  computed transform changed across an 8s sample (two distinct
  rotation matrices logged in cap-remainder4.log); the file is
  the tail 15s of the session recording, trimmed with -c copy.
- flows-stories-reduced-dark.png / story-rail-reduced-dark.png -
  reduced-motion stills, dark: dots rest at the TOP of the rings.

Every rail read 8 cells (self + Maya x2 + June + Priya + Karl +
Ana + Theo) with captions Live / Live / Live / Loved / New /
New / New / New and an orbit layer on every stone, in light,
dark, motion and reduced contexts alike.

Reduced-motion nuance, declared plainly: the first finisher's
capture script asserted computed animation-name === "none" and
that assertion fails - c2shell's own reduced rule
(.c2s-stone-orbit { animation: none }, specificity 0-1-0) loses
the name cascade to the per-state orbit rules (0-3-0). The
FUNCTIONAL spec (reduced-motion static) is nevertheless met and
was proven by probe: under an active reduce media query the
global rule in styles.css (animation-duration: 0.01ms
!important; animation-iteration-count: 1 !important) collapses
the orbit to one instant pass, and the live orbit's computed
transform was "none" and identical across a 3s gap. No product
fix was made: the motion is static, the dot rests at the top,
and the caption word + ring material carry the state. The
residual is a latent fragility only (if the global rule were
ever removed, the c2shell rule alone would not rest the orbit);
recorded here for a future hardening pass, not an R22-A failure.

Capture-stack lessons that cost this finisher two runs, for the
next cluster: (1) the capture/stage scripts MUST be run with
OPAL_API_BASE=http://127.0.0.1:4022 and
OPAL_WEB_BASE=http://127.0.0.1:5222 - the defaults (API :4000,
web :5173) are sibling clusters' ports and serve a pre-R22 rail.
(2) After a Phoenix restart, synthetic session provisioning
mints a fresh viewer account, so the whole staging chain
(stage-r22a + stage-peers + stage-live) must be re-run against
the same API base before capturing; story visibility needs the
peers pass (dyad conversation + message), not relationships
alone. (3) This finisher's duplicate full-suite run was killed
mid-run to free the box for captures; the full-suite numbers
above rest on the first finisher's complete run at this
identical tip plus this finisher's focused-suite and typecheck
runs.
