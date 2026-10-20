# Repair #19 — Wave W3: Nav Pad Halo Geometry + Chrome Glass

Branch `muse/r19-halo` off `muse/repair-19` base `f2981dbf`, worktree
`~/workspace/opal-graph/wt-r19-halo`. **Not pushed.**
Tip `739935c8` (2 commits: `f19502a3` source+tests, `739935c8` rendered probe).

Founder findings answered:
1. Halo geometry (original brief): "next to the Opal center in the
   navigation pad, slightly away from the center orb or halo of the orb,
   the lines are broken and away from the orb. We need to get very close
   to it in order to ensure coherence."
2. Pad material (addition, 2026-10-18 23:50 PDT): frosted glass — TRUE
   backdrop blur + tint, one token, chrome only.

## Pad inventory (every pad in the integrated build)

Exactly two pads render, and both are fixed at the source — no
per-surface overrides anywhere:

| Pad | Where | Segment construction |
|---|---|---|
| C2 dock | `apps/opal_web/src/c2/shell/c2shell.css` `.c2s-dock` (`C2Shell.tsx`, `data-testid="c2-dock"`) | own top border transparent; `::before`/`::after` draw the top edge |
| Legacy dock-bar | `apps/opal_web/src/theme/unifyChats.css` section 4, over `styles.css` `.tabbar-option-b .dock-bar` (`OpalApp.tsx`, both tabbar instances) | same construction (R18 unify wave) |

The wide (≥900px) C2 sidebar has no orb crossing its border (straight
right border, no raised device), so no break exists or is needed there.
The legacy pad still presents on the Calls/ChatsHome path served by the
integrated build (and the `?shell=r17` presentation); it is in scope and
fixed. When the sibling wave lands Calls in C2, that surface's pad
becomes the C2 dock and inherits everything below automatically.

## The gap — value, derivation, before/after

**Token: `--dock-halo-gap: 3px`** (`apps/opal_web/src/theme/c2Tokens.css`,
mode-free geometry — identical in both modes). Every segment on both pads
terminates at *its own device edge at the top border line* plus this one
token:

- **C2 pad — the edge at the line is the disc's CHORD, not its radius.**
  The disc is 56px (r 28) with `margin-top: -18px` inside the 64px dock;
  flex margin-box centering puts its border-box top at −5px (formula:
  1 + (62 − (56 − 18))/2 − 18 = −5; the R18 rendered probe measured
  exactly this: `discZone.top = -5`). So the disc centre sits 23px below
  the top border line and the circle's half-chord AT THE LINE is
  √(28² − 23²) = **15.97px**. Segments:
  `width: calc(50% - 16px - var(--dock-halo-gap))` (16 = chord rounded up
  0.03 to the safe side).
- **Legacy pad — the edge is the VISIBLE centre mark.** The R18 segments
  measured to the transparent 86px hit zone; the visible device is
  `.dock-opal-center-mark`, 46px wide and centred in the bar at every
  width on the served native/proportional layout; half-width 23px.
  Segments: `width: calc(50% - 23px - var(--dock-halo-gap))` (was
  `width: 33%`).

Measured gaps at the top border line (nominal, from the pads' own CSS
geometry; the rendered probe measures them again from live DOM rects):

| Pad | Before (R18) | After (R19) |
|---|---|---|
| C2, left & right | offset 36px − chord 15.97 = **20.0px gap** (read as broken/floating) | 19px − 15.97 = **3.03px** |
| Legacy, left & right | 33% of the 370px reference bar = offset 62.9px → **19.9px** to the hit-zone edge, **39.9px** to the visible mark | 26px − 23 = **3.0px** to the mark |

**Gap value chosen: 3px.** Reasoning: it is the smallest gap that
survives rendering as a clean separation at 1x — the segment is a 1px
line and the disc carries a 1px ring, so 3px leaves a clear band of
field between the two strokes in both modes (light line `#e5ded2` on
paper; dark line 10% white on the night field). It reads as the border
*hugging* the orb, and it cannot cross. The pin range is 2–4px and fails
in BOTH directions (below).

Redefinition, stated plainly: R18's "device zone" (C2 disc bounding box
/ legacy 86px hit zone) was the wrong edge — it is what let a 20–40px
visual gap pass as "stops at the disc edge". R19 measures to the device
edge **where the line actually runs** (chord at the line for the raised
disc; the visible mark for the legacy device). The raised orb disc
itself is untouched (protected orb system — only pad border geometry
and pad material changed).

## The glass — one token family for chrome

**Tokens (`apps/opal_web/src/theme/c2Tokens.css`) — these are the names
W14 / integration pick up:**

- `--chrome-glass-blur: 18px` (mode-free, sits with the gap token)
- `--chrome-glass-tint` (semantic, per mode; both-modes law now pinned
  in `c2Tokens.test.ts`): light `rgba(255, 254, 251, 0.68)` (paper-0),
  dark `rgba(32, 26, 39, 0.62)` (surface-1 `#201a27`)

Why 18px: body type is 15px (`--type-body`). A glyph dissolves when the
blur radius exceeds its own size; 18px > 15px, so content scrolling
under the pad melts and can never resolve into legible text, while the
62–68% tint holds the pad's own field quiet. Depth without noise. The
` saturate(1.35)` in the filter keeps the melted colour alive (glass,
not grey smear) — part of the pad's physics.

Consumption:
- **C2 pad**: `background: var(--chrome-glass-tint)`;
  `-webkit-backdrop-filter` / `backdrop-filter:
  blur(var(--chrome-glass-blur)) saturate(1.35)`. The raised disc stays
  solid (presence device, protected).
- **Legacy pad**: consumes the same blur token at the unify layer
  (supersedes the sheets' hard-coded `blur(9px)`). Its tint stays the
  legacy dark field fill `rgba(8, 13, 30, 0.94)` — that shell's field
  is dark in BOTH modes by documented design, so its glass is the dark
  member of the family; at 94% over an 18px blur nothing behind it
  reads as text. When Calls lands in C2, its pad takes the full
  per-mode tint via the C2 dock.
- **Expert discretion, exercised and recorded**: glass is the pad's
  treatment — kept, because it serves the founder's named reason
  (depth without noise) and nothing in the rendered geometry argues
  for a different material. NOT converted, with reasons: the C2
  header (in-flow chrome — nothing scrolls beneath it, so glass there
  would be wallpaper, which the ambient law forbids; overlay
  top-of-screen chrome consumes the tokens when it exists); cards and
  the Next Together strip (readability surfaces — stay solid, per the
  brief; they are not this wave's); the modal scrim keeps its own
  pre-existing 8px blur (a different layer, not chrome). W14's
  conversation chrome consumes `--chrome-glass-*` — named here and in
  the token comments for exactly that pickup.

Performance budget: `backdrop-filter` is composited on the chrome
layer only — in `c2shell.css` the glass exists on the dock alone; the
sheet's only other backdrop-filter is the pre-existing modal scrim.
The web test pins that declaration count, so a new blur layer fails
until the budget is re-stated. Frame behaviour is measured by the
rendered probe (rAF deltas during a scripted scroll with the glass
live), recorded as `glassPerf` and NOT gated — CI frame timing is not
a stable gate; the structural budget (one composited layer) is.

## Checks — permanent, both laws, both failure directions

Web tests (`apps/opal_web/src/theme/unifyDrift.test.ts`, now 22 tests;
`src/theme/c2Tokens.test.ts`):

- **Gap pin** (`r19: dock halo gap — close, tokenized, pinned both
  directions`): parses the token and each pad's segment calc from the
  sheets, derives the C2 chord from the disc/dock/margin values parsed
  out of the CSS itself, and asserts the gap at the line is within
  **2–4px** on both pads, left == right expressions, token defined
  exactly once and consumed exactly twice per pad. It REPLACES the R18
  assertions (`calc(50% - 36px)`, `width: 33%` are now asserted ABSENT).
  Teeth, verified by mutation in this wave: token 3px → 9px fails 3
  tests (floating); segment bases 16→8 / 23→15 fail both pad tests
  (crossing, gap ≈ −5px); mutations reverted and re-verified.
- **Glass pin** (`r19: chrome glass — one token family, frosted
  enough, chrome only`): blur token ≥ 16px and > body type size; tint
  in both modes with alpha in [0.55, 1); C2 dock consumes tint + blur
  tokens and no longer paints `--surface-1`; legacy pad consumes the
  blur token; backdrop-filter budget count in `c2shell.css` == 3
  declarations (scrim 1 + dock's −webkit/standard pair). Teeth,
  verified: blur 18px → 8px fails the legibility test (reverted).
- `c2Tokens.test.ts`: `--chrome-glass-tint` added to the SEMANTIC
  both-modes list — no cross-mode fallback, ever.

Rendered probe (`shots/regression/rendered/unify-capture.mjs`,
extended — this is what the pack phase runs):

- `halo.haloGap {left, right, chordHalf, centerDepth, pass}` (C2) and
  `legacyHalo.haloGap {left, right, markZone, pass}` (legacy): gaps
  measured from live DOM rects + computed pseudo widths; pass = both
  sides within 1.5–4.5px rendered (the source pin is the strict 2–4);
  failures are pushed into the surface's `failures[]`.
- `halo.glass` (C2) / `legacyHalo.glass` (legacy): computed
  `backdropFilter` must contain `blur(<--chrome-glass-blur value>)`;
  tint alpha in [0.55, 0.85] (C2) / ≥ 0.9 (legacy dark fill); failures
  pushed likewise.
- `glassPixel` (C2 home, both modes) — **legibility proxy, stated**:
  high-frequency luminance energy is what makes glyphs legible, so the
  proxy measures exactly that. The probe scrolls live card content
  behind the dock, screenshots the viewport (saved as
  `dock-glass-<mode>.png` — the pack's melt evidence), decodes the PNG
  inside Chromium via canvas, and compares mean |Δluminance/Δx| in the
  dock's top strips (where bleed-through would show) against a live
  text-bearing card region above the dock. Pass = glass HF ≤ 35% of
  control HF. Failures pushed. The surface is then scrolled back to
  rest before the normal home frame, so pack composition is unchanged.
- `glassPerf {frames, p95ms, maxMs}` — rAF deltas during a scripted
  360px scroll of `.c2s-scroll` with the glass live (method above).

**DOM/geometry hooks the pack phase needs** (all pre-existing,
unchanged): `[data-testid="c2-dock"]`, `.c2s-dock-center-disc`,
`.tabbar-option-b .dock-bar`, `.tabbar-option-b .dock-opal-center-mark`,
computed styles of the dock/bar `::before`/`::after`. New manifest
fields: `halo.haloGap`, `halo.glass`, `legacyHalo.haloGap`,
`legacyHalo.glass`, `glassPixel`, `glassPerf`. New frame:
`dock-glass-<mode>.png`. For the close-up proof, re-run the existing
`dock-c2-closeup-<mode>.png` / `dock-legacy-closeup-<mode>.png` clips —
segments now terminate ~3px from the disc chord / mark edge, and the
pad body is glass over whatever was scrolled beneath it.

**Rendered proof in this wave**: the capture harness was extended and
syntax-verified (`node --check`) but NOT executed here — it needs the
served stack (API + provisioned sessions) that the pack phase runs;
the geometry/material laws are pinned NOW by the web tests above, and
the rendered values the probe will print are predicted by them
(C2 rendered gap ≈ 3.03px, legacy ≈ 3.0px, glass pass on computed
style). No rendered PASS is claimed in this report.

## Verification (verbatim results)

Focused (touched areas):
- `npx vitest run src/theme/unifyDrift.test.ts src/theme/c2Tokens.test.ts
  src/c2/shell/c2ShellSurfaces.test.tsx` →
  `Test Files 3 passed (3) — Tests 38 passed (38)` (unifyDrift 22 tests,
  incl. 4 gap + 5 glass new).

Full web suite, final tree (tip `739935c8`), run to completion:
- `Test Files 16 failed | 179 passed (195)`
- `Tests 23 failed | 1506 passed (1529)`
- Failing files (the baseline set, byte-identical to the pre-change
  baseline run on this branch: 23 failed / 16 files / 1501 passed of
  1524 before the 5 glass tests were added — 1497 baseline passes +
  9 new tests = 1506):
  `src/activation.test.ts` (3), `src/availability/availability.test.ts`
  (1), `src/designTokens.test.ts` (1), `src/onboarding/firstRun.test.ts`
  (1), `src/opalUi/authorityRejectedStates.test.ts` (1),
  `src/opalUi/grammar.test.ts` (1), `src/opalUi/graphCalendaring.test.ts`
  (2), `src/opalUi/graphDetail.test.ts` (1),
  `src/opalUi/graphScroll.test.ts` (2), `src/opalUi/graphSpine.test.ts`
  (1), `src/opalUi/liveJourneyProof.test.ts` (1),
  `src/opalUi/pasteW4DeviceFixes.test.ts` (2),
  `src/opalUi/waveBChatsExact.test.ts` (3),
  `src/opalUi/waveBGraphsExact.test.ts` (1),
  `src/opalUi/waveBHomeExact.test.ts` (1),
  `src/theme/technicolorProduction.test.ts` (1). No new failures.
  Honest notes: (a) the base failing set was independently confirmed —
  e.g. `waveBHomeExact` HOME_TIMELINE_MULTICOLOR fails identically on
  pristine base `f2981dbf` in `wt-repair18` (constant `#5FAECF` vs
  expected `#E8D6C4` in `founderGraphSeed.ts`, untouched by this wave);
  (b) one earlier full run under extreme multi-agent CPU contention
  (load >30 on 2 cores, 39-minute run) showed 24 failed / 17 files —
  one extra failure that did not reproduce in either clean run
  (23/16 twice, including the final tree); recorded as a contention
  flake, not hidden.

Typecheck: `npx tsc -p tsconfig.json --noEmit` → exactly **9 errors**,
all pre-existing, none in touched files:
`src/OpalApp.tsx` (3× TS2345 `"opal"` not assignable to `SetStateAction<Tab>`),
`src/api/productClient.ts` (5× TS2300/TS2717 duplicate `plan_type`/`online`),
`src/opalUi/YouSettingsDestination.tsx` (1× TS2339 `handle` on
`RelationshipContact`).

## Files changed (6)

- `apps/opal_web/src/theme/c2Tokens.css` — `--dock-halo-gap: 3px`;
  `--chrome-glass-blur: 18px`; `--chrome-glass-tint` in both mode blocks.
- `apps/opal_web/src/c2/shell/c2shell.css` — dock segment widths
  (`50% - 16px - token`); dock material → chrome glass tokens; geometry
  derivation comments.
- `apps/opal_web/src/theme/unifyChats.css` — legacy segment widths
  (`50% - 23px - token`); legacy bar consumes the glass blur token;
  geometry comments updated (hit-zone definition retired).
- `apps/opal_web/src/theme/unifyDrift.test.ts` — R18 halo assertions
  replaced; gap pin + glass pin (9 new tests).
- `apps/opal_web/src/theme/c2Tokens.test.ts` — `--chrome-glass-tint`
  into the both-modes SEMANTIC parity list.
- `shots/regression/rendered/unify-capture.mjs` — `haloGap`, `glass`,
  `glassPixel`, `glassPerf` probes + failure wiring (see above).

## Design notes — Apple brain, Opal identity, parity/invention

- **Discipline (Apple Design Brain)**: journey first — the pad's
  journey did not change at all: same five destinations, same centre
  action, same layout, flows, and data (functional parity is total).
  What changed is *measured, not vibes*: every number derives from the
  pad's own geometry (disc size and raised offset, mark size, body
  type size) and is pinned by a check that fails in both directions.
  Restraint: one gap token, one glass token family, zero per-surface
  overrides, zero new decorative elements. Hierarchy: the orb stays
  the one solid, lit presence; the glass and the border stay quiet
  servants underneath it. Nothing decorative without a job — header
  glass and card glass were considered and refused for exactly that
  reason.
- **Identity (could only be Opal)**: no incumbent tab bar does this —
  a frosted-glass pad whose top edge *breaks around a raised orb*,
  hugging the stone's shoulder at a measured 3px while the user's
  shared life melts through the glass beneath and dissolves. The
  physics is the face: orb presence breaking the border, content
  melting behind glass, the stone solid above it. This surface is not
  mistakable for a competitor's screen with our logo on it — remove
  the wordmark and the pad is still Opal's.
- **Parity / invention**: the function (tab navigation) is standard
  and was kept standard; the *experience* of it was reinvented in
  Opal's physics (the break, the hug, the melt) instead of inheriting
  the incumbent's flat bar + notch. Where invention could have harmed
  clarity it was refused: labels and glyphs stay crisp and solid
  inside the glass, the disc stays solid, and nothing behind the pad
  can ever compete with them as legible text — that last point is not
  a hope, it is the 18px > 15px geometry pinned in the tests.
- **Transition/motion**: none added. The melt IS the transition —
  content softens as it passes under the glass during the scroll the
  user already performs; no new animation was invented for the pad,
  because none was earned.

## Ambient register (this wave)

| Element | Reason (one sentence) | Live condition |
|---|---|---|
| Dock top-border segments (both pads) | Containment of the pad field; they break around the raised orb so the border never crosses the presence device, and terminate at the one token gap so the break reads as a single coherent gesture | Always on pad surfaces; the break exists because the device is raised across the top edge |
| Chrome glass (C2 pad) | Depth without noise: the pad floats over the user's shared life without hiding it and without letting it shout through as text | Always on the pad; content scrolls beneath it |
| Chrome glass blur (legacy pad) | The same depth law on the legacy presentation, over its dark-in-both-modes field | Always on the legacy bar |

Dark mode stays genuinely dark (dark tint is the surface-1 night step
at 62% over the night field; no light values enter the dark pad). Light
mode parity: same gap token, same blur, same structure — only the tint
is the paper member of the glass family.
