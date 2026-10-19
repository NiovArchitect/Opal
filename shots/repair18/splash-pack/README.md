# Repair #18 - SPLASH 1 REBUILD - Pack

Founder order 2026-10-18 13:48 PDT (the master, full-bleed, with
living rings) + composition refinement 13:59 PDT (inset by a small
margin: "Leave a little bit of space on the edge so it doesn't
bleed off screen"). Branch `muse/r18-splash`; served app build `7567b780` (branch
tip `555129d8` adds only the capture harness in shots/, no app
code).
Report: `coordination/repair18/splash-report.md`.
**FOUNDER_ACCEPTED: NO** (unchanged).

## Served build identification

- Served from the Mac side stack built for this wave (see "Stack
  note" below): Mac worktree `opal-r18-splash` at mirror commit
  `d0bcc998` ("preview mirror: tree of muse/r18-splash @ 7567b780").
- TREE-HASH GATE: mirror `HEAD^{tree}` =
  `c05c1c3c9b115f5e6fc9beb0da452e8a90294ddb` = branch tip
  `7567b780`'s tree, byte-identical. The only uncommitted change in
  the served worktree is the preserved `vite.config.ts` proxy patch
  (4100) - the established preview discipline.
- Every capture carries the in-app build stamp `seed - d0bcc99`
  and the probes read `data-git-head-full =
  d0bcc9981082fe220005047879ee4e484d35f841` from the served page.
- Web: Vite :5175, `VITE_OPAL_SHELL=c2`. API: Phoenix :4101,
  `~/.opal/r1a1.env` recipe, MIX_ENV=dev,
  `OPAL_PHONE_VERIFY_MODE=synthetic_development` (health: ok /
  synthetic). Sessions + founder seed provisioned through the real
  APIs by the regression harness (synthetic sessions) - no fixture
  painting.
- Capture harness: `shots/regression/rendered/splash-capture.mjs`
  (committed on the branch), Chromium at 390x844, DSF 2.

Stack note (contention, disclosed): the shared `opal-r18-preview`
stack was taken over mid-run by the parallel dock-halo wave - its
working tree was overwritten under the first capture pass and the
preview Phoenix was shut down. The first pass's splash stills /
videos were verified to predate the overwrite (build stamp +
in-page probes), but its dock captures and video lead-ins were
contaminated, so the ENTIRE pack was re-captured cleanly on the
side stack above (own worktree, own ports; the shared preview
stack and the sacred opal-walk stack were not touched again).
Nothing in this pack comes from the contaminated pass.

## The composition (what you are looking at)

- Splash 1 IS the master composition: the full drawn master
  (`opal-orb-master-full.webp`, a resize-only derivation of
  `shots/repair18/design-masters/opal-orb-master.webp` - no
  recolor, no grade, no crop) at the top of the screen.
- REFINEMENT applied: the composition is INSET by a small safe
  margin (14px sides, top margin `max(14px, safe-area-inset)`) -
  probe-measured stage box {x:14, y:14, w:362, h:362} on the
  390x844 viewport, contained on every edge. The COMPLETE
  composition renders inside the margin: rings whole, points of
  light never cropped. Behind the margin the field is continuous -
  the splash's ground is `--orb-night-field` #05030f, the master's
  own edge-field median sample
  (`scripts/orb/build_splash_master.py`), so the breathing room
  reads as the master's field framing itself, not as a page panel.
  No panel, no card, no medallion anywhere.
- Wordmark stacked directly beneath the orb (LOCKUP LAW - stacked
  is the only combined composition; probe: stacked, center delta
  0px), then REAL PEOPLE. REAL PLANS. / the subline, then exactly
  ONE primary action (Continue, paper on the night field) and
  "I already have an account" beneath it. No dead space: the
  actions sit at the foot of the field on the flex column.
- Standing laws kept: ZERO "Enter Opal" on splash 1 (probe:
  data-enter-opal-count=0), exactly ONE live "Enter Opal" on
  splash 2 (probe: 1 button), entry flow + double-tap guard
  functionally identical.

## The living rings - method, in plain terms

One shared component, `OrbLivingRings`
(`apps/opal_web/src/brand/orb/OrbLivingRings.tsx`), at the
MEASURED master geometry (orbGeometry.ts: circular ring center
(101,100) r 71; horizontal ring rx 86 ry 11 at cy 106, in the
200-unit viewBox - it scales to whatever size the composition
renders at, so the live layer tracks the master's rings exactly).

- The baked rings in the master stay the STRUCTURE. The live layer
  draws no ring strokes of its own, so nothing doubles or fights
  the art. It carries only the MOTION:
  - three points of light (halo + sampled point-light core
    #fff1d0) travel the circular ring - one full lap in 64s;
  - two points travel the horizontal ring on its measured ellipse
    path - one lap in 44s, half a lap out of phase;
  - one lit arc (a 64-degree span of ring-metal-lit #ffeac9 at
    40% opacity) rotates the OTHER way, one lap in 120s - the
    differential speeds against each other are the precession
    feel.
- Differential, slow, ambient (QUIET law): laps are 44-120
  seconds; nothing pulses or loops fast.
- Performance: transform-only animation (SMIL animateTransform /
  animateMotion on the SVG layer); no layout, no paint-heavy
  properties. The layer starts invisible and fades in over 1.6s
  after a 0.45s beat (opacity only), so the still master paints
  first and the motion settles in - the opening surface's first
  paint is never blocked or moved by the animation.
- The SAME system at ambient subtlety on the Center dock: the
  dock's OrbMark gains `OrbLivingRings variant="ambient"` - two
  circular travelers (96s lap), one ellipse traveler (72s), the
  arc at 22% over 160s - clipped to the mark's own 40px square
  inside the 56px disc (probe: markInsideDisc = true, both modes;
  traveler halos reach ~17px from center, never the disc border -
  the clean halo is not regressed).

## Modes - the light-mode choice, stated as a choice

**CHOICE (for the founder's verdict): the splash carries its own
night field in BOTH modes.** The stone's moment is a night
moment: in light mode the splash does NOT invert, wash out, or
re-present the master - the same night composition, the same
night field (#05030f in both modes; probe: splash root computed
background rgb(5, 3, 15) in dark AND light captures), the same
paper primary. There is no white flash on entry in either mode.
The two splash-1 stills in this pack are therefore the same night
moment in both modes - that is the choice, made plainly, not a
capture error. The app beyond the splash keeps its real light
mode untouched (see the light dock still: pearl shell, real light
tokens).

## Reduced motion

`prefers-reduced-motion` rests the system: the component emits NO
animation elements at all (probe on the reduced-motion capture:
data-motion="rest", animate count 0). On the splash the measured
points of light sit statically where the master's baked points
are; in the dock the ambient layer renders nothing (the mark's
own static points remain). The CSS settle fade is also disabled
under reduced motion.

## Motion proof

Stills cannot prove animation, so:

- `splash-1-motion-dark.webm` (10.3s) and
  `splash-1-motion-light.webm` (9.1s): screen recordings of the
  served build - rings traveling on splash 1, then the Continue
  tap and the entry transition into splash 2. The raw recordings
  carried a long white lead-in (the page loading through the
  capture tunnel - a capture-environment artifact, NOT the
  product's first paint); the shipped files are trimmed to the
  content (start cut at first splash frame) and re-verified
  frame-by-frame: continuous small frame diffs on the splash
  (rings), terminal transition to splash 2.
- Frame-diff on the lossless stills (splash-1-{mode}.png vs
  splash-1-{mode}-t2.png, 1.5s apart): dark 6,089 px changed,
  light 6,184 px changed - ALL of it inside the stage region,
  zero changed pixels anywhere else on screen. Only the rings
  move.

## Files

- splash-1-dark.png / splash-1-light.png - splash 1, both modes
  (the same night moment - see the choice above)
- splash-1-dark-t2.png / splash-1-light-t2.png - second frames
  (frame-diff motion evidence)
- splash-1-dark-reduced-motion.png - reduced motion at rest
- splash-2-entry-dark.png / splash-2-entry-light.png - the entry
  frame into splash 2 (exactly one Enter Opal)
- splash-1-motion-dark.webm / splash-1-motion-light.webm -
  motion proof videos (trimmed, see above)
- center-dock-dark.png / center-dock-light.png - Center route
  with the dock (ambient living rings)
- dock-closeup-dark.png / dock-closeup-light.png - the Center
  dock disc close-up: ambient ring system on the OrbMark, clean
  halo, no border crossing
- sidebyside-master-vs-splash1-dark.png - the master beside the
  served splash 1
- manifest.json - every probe named above, from the served page

## Remaining notes

- The master's own rounded-corner vignette ships inside the
  artwork (its corners are black outside the master's rounded
  frame); on the night field it reads as the master's framing,
  unchanged from the side-by-sides the founder judged.
- First-paint image load on the dev stack is slow through the
  capture tunnel; on-device the 1024px / 99 KB master-full asset
  is a single request and the still composition paints before
  the living layer fades in.
- Web only, per the order. Mobile carries no code from this
  system yet (geometry + tokens are in-repo for it).
