# Repair #19 - WAVE W4 - SPLASH ANIMATION v2 - Report

- Branch: `muse/r19-splash` off `muse/repair-19` tip `f2981dbf`
  (worktree `~/workspace/opal-graph/wt-r19-splash`). **Not pushed** -
  coordinator merges.
- Commits: `48ecfe9d` (animation v2: component + CSS + tests) ·
  `d7c2b66d` (capture harness v2) · `7b93d115` (hardening:
  ellipse riders WAAPI -> CSS parametric keyframes, see §2).
- Founder verdict answered (2026-10-18 22:47 PDT, on the R18
  motion proof): "It just didn't feel long enough and it was a
  bit jagged when you press play. The dots were rotating - it
  wasn't the actual halo itself with the dots attached to the
  halo, moving. The rings will rotate, but also the dots would
  rotate along the rings that surround the orb. Those dots
  should never leave the halo or rings. And then it should stop
  and look the way it does now."
- **FOUNDER_ACCEPTED: NO** (unchanged). Protected and untouched:
  the orb master artwork, the still composition, the stacked
  wordmark lockup, splash-2's single Enter Opal.

## 1. What was jagged, and why (root causes)

1. **SMIL is main-thread.** v1 drove every traveler with SMIL
   (`animateTransform` on the circle group, `animateMotion` on
   the ellipse). SMIL animations are not composited in Chromium:
   they are re-evaluated on the main thread each frame, competing
   with image decode, first paint and (in the proof) video
   encoding. Frames land at irregular intervals - the motion
   steps instead of gliding. That is the jaggedness.
2. **SMIL's clock starts at document load, not at first paint.**
   The living layer fades in over 0.45s + 1.6s, but the SMIL
   timeline had been running since the document began - the
   travelers were already mid-lap at an arbitrary phase when
   they became visible, and under capture the page-load lead-in
   ate more of the timeline.
3. **It never settled, and the travelers were not the ring's
   points.** The laps were indefinite (44-120s), so the ~5s of
   visible travel in the proof was a few degrees of creep that
   then cut away - "didn't feel long enough" - and there was no
   settle at all. Worse, the living circle travelers sat at
   20/160/285 degrees while the still composition's points sit
   at -90/-45/90/135, and the ellipse travelers were driven by
   an independent `animateMotion`: dots rotating on their own
   schedule, geometrically on a path but belonging to no ring -
   exactly what the founder described.
4. **The capture itself aliased.** Playwright `recordVideo`
   produces ~25fps VP8 at 780x1688; the point cores are ~4px
   wide, so 25fps sampling + compression made even correct
   motion read steppy on playback ("jagged when you press
   play").

## 2. The v2 motion design

One system (`OrbLivingRings`), rebuilt; geometry unchanged
(measured master geometry, 200-unit viewBox: circular ring
(101,100) r71; horizontal ring (101,106) rx86 ry11). The layer
still draws NO ring strokes of its own - the baked master stays
the only structure.

- **The traveler set IS the rest set.** Every traveler is one of
  the still composition's own points of light (`ORB_POINTS`):
  4 on the circular ring, 2 on the horizontal ring. Each point
  belongs to exactly one ring and its position is a function of
  that ring's rotation alone (section 3).
- **Circular ring - a ROTOR.** The 4 points are children of one
  group whose CSS `rotate` animation IS the ring's rotation
  (transform-origin = the measured ring center, via
  `transform-box: view-box`). Hero: the rotor runs ONCE, from
  -60deg easing out (cubic-bezier(0.33,1,0.68,1)) to 0deg over
  **15s**, delayed **0.45s** so the motion starts with the
  layer's fade-in, never before first paint, fill both.
  0deg is the rest orientation - the rotor's final frame is
  the rest orientation exactly.
- **Horizontal ring - parametric riders.** Each endpoint point
  rides CSS keyframes sampled from the ring's own parametric
  equation (cx + rx*cos(phi), cy + ry*sin(phi)): 41 samples per
  rider with the easeOutCubic settle profile baked into phi(t),
  committed in `orb.css` and pinned to the generating law
  (`buildEllipseTravelKeyframes` in the component) by a test
  that parses the CSS and re-derives every sample. Hero travel
  is **-180deg of phi**: the two points exchange ends and land
  exactly on the rest endpoints. Pure CSS like the rotors -
  compositor-interpolated transforms, no JS animation clock,
  no per-frame JS, no layout, no SMIL. (An earlier v2 draft
  drove the riders by WAAPI; local Chromium probing showed
  mount-time WAAPI clocks pausing/lagging under the app's
  re-renders, so the mechanism was hardened to CSS - the same
  mechanism the probe verified exactly for the rotor.)
- **Precessing arc.** On its own rotor, counter-rotating
  against the circle rotor (+55deg -> 0deg, same 15s clock),
  fading out across the last 30% of the phase - the rest
  composition carries no live arc, so the settled frame has
  none.
- **SETTLE = the rest branch.** At 0.45s + 15s = **15.45s**
  after mount the hero component renders the rest branch - the
  same code path as reduced motion. The settled frame is the
  still splash by construction (same points, same positions,
  no rotor, no arc, no riders). The tap targets are live the
  whole phase; nothing blocks Continue.
- **Differential motion** (three distinct angular rates):
  circle 60deg/15s, ellipse 180deg/15s of phi, arc 55deg/15s
  counter-rotating - gyroscope-true, each ring on its own
  travel, all landing together.
- **QUIET:** peak tangential speed is at phase start and decays
  monotonically (ease-out); the last seconds are near-still
  micro-settle. Nothing pulses, nothing loops on the splash.
- **Ambient (dock)** keeps the same riding structure,
  indefinite at v1's laps (rotor 96s linear, ellipse lap 72s,
  arc 160s reverse) - the dock's job is presence; the splash's
  job is an opening. Reduced motion: unchanged law - rests
  immediately, hero shows the measured points statically,
  ambient renders nothing, zero animation elements.
- **Performance:** transforms only; `will-change: transform`
  on the two rotor groups only (plus the layer's pre-existing
  opacity). The system pauses when the document is hidden or
  the layer scrolls off-screen (IntersectionObserver +
  visibilitychange -> `data-paused` -> `animation-play-state:
  paused` on rotors, arc and riders alike).

## 3. How dots-on-rings is structurally guaranteed

- Circle: a point's rendered angle = its base angle (pinned in
  `data-base-angle-deg`, derived from its rest position) + the
  rotor's angle, because the point is a DOM child of the rotor
  and has no motion of its own. There is no code path that can
  place it anywhere but on the circle of radius 71 about
  (101,100).
- Ellipse: the ONLY positions a rider can occupy are the
  committed CSS keyframes and the compositor's interpolation
  between consecutive samples (max chord deviation <0.05
  viewBox units - sub-pixel). Every keyframe is a sample of the
  parametric ellipse equation: the unit test verifies the
  generating law to float precision AND parses the committed
  CSS, checking every sample equals the law's sample exactly
  and lies on the ellipse. Position is a function of phi alone.
- Settle: after the phase, the rendered points are the rest
  branch's points - test-pinned DOM equality of the settled
  positions with `ORB_POINTS` (section 4).

## 4. Tests

- **New/extended: `orbLivingRings.test.tsx` - 9/9 pass** (was
  4 in v1; coverage strengthened, none removed in spirit - the
  SMIL-era assertions were replaced by stricter v2 pins):
  1. hero: zero SMIL elements; circle points are rotor children
     rendered at their exact rest positions, base angles pinned
     to the measured ring (point = base + rotor by DOM law);
  2. hero: ellipse riders carry the parametric law as data
     (rest phi, -180 travel, shared 15s clock); arc
     counter-rotates (opposite sign); three distinct angular
     rates;
  3. keyframe law: every builder sample satisfies the ellipse
     equation to <1e-9; first sample = the displaced start,
     last = the rest point exactly;
  4. **committed CSS parsed and pinned**: all three rider
     keyframe blocks in orb.css equal the law's samples exactly,
     sample-by-sample, and lie on the ellipse;
  5. **settle**: fake timers - living at settle-1ms, settled at
     15,450ms; settled DOM = the rest branch (all 6 ORB_POINTS
     at rest positions, zero rotor/arc/rider elements) - settled
     state equals rest composition;
  6. ambient: same riding structure, indefinite, 2+1 travelers,
     every lap >= 60s (QUIET);
  7. CSS law: keyframes/origin/pause/will-change pins;
  8-9. reduced motion (hero rest, ambient nothing) - v1's pins,
     unchanged and green.
- Targeted, all green: orbLivingRings 9/9 · orbTokens 17/17 ·
  c2Foundation 14/14 (splash laws: zero Enter Opal on 1, exactly
  one live on 2, double-tap guard, master hero) ·
  c2ShellSurfaces 8/8 (solo run; see flake note below).
- **FULL web suite (final code): `Test Files 16 failed | 248
  passed (264)` / `Tests 23 failed | 1502 passed (1525)` -
  exactly the stated baseline failing set (23 failed / 16
  files); 1,502 passed = baseline 1,497 + 5 net-new tests from
  this wave.** The 23 failures are the baseline's named files
  (activation, designTokens, availability, firstRun,
  authorityRejectedStates, grammar, graphCalendaring,
  graphDetail, graphScroll, graphSpine, liveJourneyProof,
  pasteW4DeviceFixes, waveBChatsExact, waveBGraphsExact,
  waveBHomeExact, technicolorProduction - plus c2ShellSurfaces
  flaking 2 under full-suite load in both the pre- and
  post-change runs; it passes 8/8 solo and the totals were
  identical before and after this wave's changes). Zero new
  failures attributable to this wave.
- **Typecheck (`tsc --noEmit`): exactly the 9 pre-existing
  errors** (3x OpalApp Tab, 5x productClient duplicates, 1x
  YouSettingsDestination handle) - none in a touched file.

## 5. Real-Chromium spot proof (local, this VM - stated honestly)

The app was served locally (Vite, this worktree) and driven in
headless Chromium at 390x844 - a spot proof, NOT the pack proof
(no backend on this VM; the sanctioned rendered proof is the
pack phase on the real served stack, §6).

- **Rotor verified exactly:** at ~2.5s the circle rotor's
  computed transform was a rotation of -40.05deg about the ring
  center (the -60deg start easing toward rest on schedule), and
  the first circle point's rendered center measured (114, 97)
  against a predicted (114.2, 96.6) from the measured geometry -
  sub-pixel agreement. The ring turns about its own center and
  the points ride it.
- **Settle verified:** at ~16.5s `data-motion="settled"` and the
  layer rendered the rest branch - rest points at their exact
  rest translates (e.g. translate(101 29)), no rotor/arc left.
- **Rider caveat (why §2's hardening happened):** under the
  backend-less local app, repeated mounts/re-renders made
  mount-time WAAPI rider clocks pause/lag, so rider mid-flight
  screen positions were not reproducibly measurable locally;
  riders were moved to CSS keyframes (same mechanism as the
  verified rotor) and their positions are pinned by the
  CSS-parsing unit test. The pack phase's screencast (§6) is
  where rider motion gets its rendered proof - if the pack
  webm shows any rider off its ring, that is a W4 regression
  to send back, by the founder's own words.

## 6. Capture instructions for the pack phase

Harness: `shots/regression/rendered/splash-capture.mjs`
(committed, `d7c2b66d`) - run it as in R18 (same env:
FIRSTLOOK_OUT, OPAL_WEB_BASE, OPAL_BUILD_TAG) against the
served build. What changed and what to expect:

- **Stills:** `splash-1-<mode>-living.png` (~4s, rings visibly
  displaced), then the main `splash-1-<mode>.png` is gated on
  the component's own `data-motion="settled"` signal (60s
  timeout, logged if missed) - the still IS the settled
  composition; `splash-1-<mode>-t2.png` 1.5s later should now
  frame-diff to ~0 inside the stage (the stopped proof; in R18
  it was the motion proof - the living frame carries that role
  now). Splash-2 entry + reduced-motion + dock flows unchanged
  in shape.
- **Manifest probes (v2 fields):** `rings.rotor` (from/to deg,
  durationMs, iterations, circlePoints), `rings.ellipseRiders`
  (restPhiDeg/travelDeg/durationMs per rider), `rings.restPoints`
  on settled (expect 6), SMIL counts `animateMotion` /
  `animateTransform` - **must read 0** (the v1 mechanism is
  pinned out). Reduced-motion record adds `rotorCount` (0) and
  `restPoints` (6). Dock record adds `rotor: true`,
  `ellipseRiders: 1`, SMIL counts 0.
- **Videos:** with ffmpeg on PATH the harness records via CDP
  `Page.startScreencast` (jpeg q88, a frame per compositor
  presentation - up to 60fps while animating vs recordVideo's
  ~25fps) and assembles `splash-1-motion-<mode>.webm` with
  ffmpeg (VP9, VFR from the frames' own timestamps). Duration
  covers the full arc: living phase + settle + 2.5s settled
  hold + Continue transition (~21s). The manifest record
  carries `videoMethod: "cdp-screencast+ffmpeg-vfr"`, `frames`,
  `seconds`, `avgFps` - check avgFps > 25 before accepting the
  proof. Without ffmpeg it falls back to recordVideo and says
  so (`videoMethod: "recordVideo-fallback-no-ffmpeg"`) - treat
  a fallback video as a failed fidelity gate, not a pass.
- Founder-facing check: play the webm - dots must visibly ride
  WITH their rings, slow down, stop at ~15.5s, and the held
  frame must match `splash-1-<mode>.png`.

## 7. How this surface answers to the Apple Design Brain standard

(Founder governing standard, 2026-10-18 23:31 PDT: journey-first
structure, restraint, hierarchy, typography as voice, nothing
decorative without a job, every transition earned - Opal's
identity, Apple's discipline. This surface is the app's first
16 seconds, so the standard is applied to the journey beat by
beat.)

- **Journey-first:** the splash is structured as one earned arc,
  not a loop: arrival (the still master paints first - identity
  before motion, nothing blocks or moves the first paint) ->
  life (the rings turn with their own points riding them, 15s,
  ease-out: fastest at the greeting, decaying as the moment
  settles) -> rest (the composition the founder approved, held
  exactly). The phase ends because the journey moves on, not
  because a timer ran out of content; Continue is live from the
  first frame - the animation never gates the user's next step,
  and a user who taps at second 2 loses nothing.
- **Restraint:** three motions total, each the minimum that
  carries its meaning; speeds decay monotonically to stillness;
  no pulsing, no looping, no second effect layered for richness.
  What was cut under this bar: the indefinite laps (motion
  without an ending is decoration), and any motion on the
  wordmark/headline (typography does not perform - it speaks
  once, in place).
- **Hierarchy:** motion is subordinate to composition at every
  instant - the live layer draws no structure of its own, the
  travelers are the composition's own points at their own scale,
  and the settled frame is pixel-faithful to the still. The eye
  is never asked to read two compositions (baked + live) at
  once; there is one image, briefly alive.
- **Nothing decorative without a job:** every moving element
  keeps its R18 ambient-register reason (points = people riding
  their scopes; differential rings = independent contexts under
  one center; the counter-precessing arc = orientation held
  under motion) and gains the arc's ending as its punctuation -
  the arc fades out precisely because its job (precession
  during travel) ends when travel does. If an element could not
  state its job, it was not added: no shimmer, no glow swell,
  no particle dust beyond the master's own.
- **Every transition earned:** the only transitions are the
  layer's fade-in (sequencing honesty: stillness first, then
  life - and it keeps animation off the first-paint path) and
  the settle itself (the reward for watching: the approved
  still, returned exactly). The entry to splash 2 is untouched.
- **The discipline is in the shipped code, not a mockup:** the
  standard's claims are test-pinned in the shipped tree - the
  settle state is the rest branch itself (DOM equality test),
  the on-ring law is parsed out of the committed CSS, and the
  reduced-motion user gets the still composition immediately:
  restraint respects the user's stated preference first.

## 8. Identity bar rider (founder, closing, 2026-10-18 23:52 PDT)

Recorded for this wave: "I want it to actually feel like people
are holding something new - they're not holding anything from
Anthropic, from OpenAI, or even Meta Muse." Apple gives
discipline (§7); identity comes from nobody - Opal's own
physics is the face. No action taken under this rider unless
the pack's identity audit flags this surface; the splash's
standing under the bar, stated for that audit:

- **Nothing on this screen is an incumbent's template.** No chat
  bubble, no prompt box, no assistant avatar, no feed card - the
  surface is a stone in a night field with gyroscope rings and
  people as points of light in orbit around one truth. The
  motion physics is Opal's own: orbits, precession, a settle
  into stillness - not a spinner, not a shimmer skeleton, not a
  typing indicator.
- **The identity is structural, not a skin:** the animated
  system is the product metaphor itself (scoped contexts ringed
  around one governed center) rendered at the door. A viewer
  who has never seen Opal cannot mistake this for a generic AI
  front door, because no incumbent's product is about orbits
  of people around a stone.
- If the audit finds any element that reads as borrowed -
  timing curves, fade choreography, or composition that could
  sit on another product's splash - that element is a redesign
  item for this wave, by the founder's rule.

## 9. Ambient register delta

No new ambient elements. Changed reasons, same register rows:
the splash travelers now also carry the opening's arc - they
are the still composition's own points, displaced by their
rings' rotation and returning to rest - and the arc's fade-out
is the settle made visible. The dock's ambient travel is
unchanged in rate and reason (presence), rebuilt on the same
riding structure. `prefers-reduced-motion` still rests
everything.
